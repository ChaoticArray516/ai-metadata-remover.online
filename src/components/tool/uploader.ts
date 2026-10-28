import { initialModel, reducer, validateFiles, type ToolModel } from '../../lib/state';
import { track } from '../../lib/analytics';

function query<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
}

const ICONS = {
  clean:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  attention:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2.5 20h19z"/><path d="M12 9v5m0 3v.5"/></svg>',
  failed:
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>',
};

export function mountToolBench(root: HTMLElement): void {
  const variant = root.dataset.variant === 'photo' ? 'photo' : 'home';
  const pageId = variant === 'photo' ? 'photo' : 'home';
  const input = query<HTMLInputElement>(root, '[data-file-input]');
  const dropZone = query<HTMLElement>(root, '[data-drop-zone]');
  const status = query<HTMLElement>(root, '[data-status]');
  const banner = query<HTMLElement>(root, '[data-result-banner]');
  const downloadArea = query<HTMLElement>(root, '[data-download-area]');
  const failure = query<HTMLElement>(root, '[data-failure]');
  const sizeWarning = query<HTMLElement>(root, '[data-size-warning]');
  const fileSummary = query<HTMLElement>(root, '[data-file-summary]');
  const resultEmpty = query<HTMLElement>(root, '[data-result-empty]');
  const diffSection = query<HTMLElement>(root, '[data-diff-table]');
  const diffEmpty = query<HTMLElement>(root, '[data-diff-empty]');
  const diffSummary = query<HTMLElement>(root, '[data-diff-summary]');
  const fieldRows = query<HTMLElement>(root, '[data-field-rows]');
  const fieldBody = query<HTMLElement>(root, '[data-field-body]');
  const showFields = query<HTMLButtonElement>(root, '[data-show-fields]');

  let model: ToolModel = initialModel;
  let objectUrls: string[] = [];
  let slowTimer: ReturnType<typeof setTimeout> | undefined;

  function dispatch(event: Parameters<typeof reducer>[1]): void {
    model = reducer(model, event);
    root.dispatchEvent(new CustomEvent('tool:state', { detail: model, bubbles: true }));
  }

  function setStatus(text: string): void {
    if (status.textContent !== text) status.textContent = text;
  }

  function resetOutputs(): void {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls = [];
    banner.hidden = true;
    downloadArea.hidden = true;
    failure.hidden = true;
    diffSection.hidden = true;
    sizeWarning.hidden = true;
    fieldRows.hidden = true;
    fieldBody.textContent = '';
    diffSummary.textContent = '';
    showFields.hidden = false;
  }

  function fail(kind: 'unsupported_format' | 'too_large' | 'read_error' | 'strip_error' | 'multiple_files'): void {
    dispatch({ type: 'invalid', error: kind });
    downloadArea.hidden = true;
    banner.hidden = true;
    diffSection.hidden = true;
    const messages: Record<string, string> = {
      unsupported_format:
        variant === 'photo'
          ? 'This format is not supported. SVG files are not accepted; use a JPEG, PNG, WebP or HEIC photo.'
          : 'This format is not supported. Use a JPEG, PNG, WebP or HEIC file.',
      too_large: 'This file is over 100MB, which is too large to clean in the browser.',
      multiple_files: 'Choose one file at a time.',
      read_error: 'We couldn’t read this file.',
      strip_error: 'We couldn’t process this file.',
    };
    setStatus(messages[kind]);
    if (kind === 'read_error' || kind === 'strip_error') {
      resultEmpty.hidden = true;
      banner.classList.add('failed');
      banner.classList.remove('needs-attention');
      query<HTMLElement>(root, '[data-result-icon]').innerHTML = ICONS.failed;
      query<HTMLElement>(root, '[data-result-state]').textContent = "We couldn't process this file";
      query<HTMLElement>(root, '[data-result-detail]').textContent = '';
      banner.hidden = false;
      failure.hidden = false;
    }
  }

  async function handleFiles(files: File[]): Promise<void> {
    resetOutputs();
    const validation = validateFiles(files);
    if (!validation.ok) {
      fail(validation.error ?? 'unsupported_format');
      return;
    }
    const file = files[0];
    dispatch({ type: 'select', fileName: file.name });
    resultEmpty.hidden = true;
    banner.classList.remove('failed');
    fileSummary.hidden = false;
    fileSummary.textContent = `${file.name} · ${(file.size / 1e6).toFixed(1)} MB · ${validation.format}`;
    fileSummary.title = file.name;
    sizeWarning.hidden = !validation.sizeWarning;
    setStatus('Reading your file…');
    input.disabled = true;
    if (slowTimer) clearTimeout(slowTimer);
    slowTimer = setTimeout(() => {
      dispatch({ type: 'slow' });
      setStatus('Still working…');
    }, 5000);

    try {
      dispatch({ type: 'inspect' });
      const startedAt = performance.now();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const [{ loadStrip }, { inspectBytes }, { buildDiff }, { buildReport }, { sha256Hex }] =
        await Promise.all([
          import('../../lib/strip/index'),
          import('../../lib/inspect/basic'),
          import('../../lib/inspect/compare'),
          import('../../lib/report/build'),
          import('../../lib/report/hash'),
        ]);
      const { stripImage } = await loadStrip();
      const before = inspectBytes(bytes);
      setStatus('Cleaning…');
      const stripped = await stripImage(bytes);
      dispatch({ type: 'stripped' });
      dispatch({ type: 'reinspect' });
      setStatus('Preparing report…');
      const after = inspectBytes(stripped.bytes);
      if (stripped.bytes.length === 0) throw new Error('empty output');
      const diff = buildDiff(before.actions, after.actions);
      const hash = await sha256Hex(stripped.bytes);
      const report = buildReport({
        fileName: file.name,
        format: stripped.format,
        originalBytes: bytes.length,
        outputBytes: stripped.bytes.length,
        sha256: hash,
        diff,
        durationMs: performance.now() - startedAt,
      });
      dispatch({ type: 'ready' });
      if (slowTimer) clearTimeout(slowTimer);

      const cleanedBlob = new Blob([stripped.bytes.buffer as ArrayBuffer], { type: file.type || 'application/octet-stream' });
      const cleanedUrl = URL.createObjectURL(cleanedBlob);
      const htmlUrl = URL.createObjectURL(report.htmlBlob);
      const jsonUrl = URL.createObjectURL(report.jsonBlob);
      objectUrls = [cleanedUrl, htmlUrl, jsonUrl];

      const baseName = file.name.replace(/\.[^.]+$/, '');
      const cleanedButton = query<HTMLButtonElement>(root, '[data-download-cleaned]');
      const downloads = [
        {
          button: cleanedButton,
          url: cleanedUrl,
          fileName: `${baseName}-cleaned.${file.name.split('.').pop() ?? 'jpg'}`,
        },
        {
          button: query<HTMLButtonElement>(root, '[data-download-report-html]'),
          url: htmlUrl,
          fileName: `${baseName}-cleaning-report.html`,
        },
        {
          button: query<HTMLButtonElement>(root, '[data-download-report-json]'),
          url: jsonUrl,
          fileName: `${baseName}-cleaning-report.json`,
        },
      ];
      for (const { button, url, fileName } of downloads) {
        button.onclick = () => {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.hidden = true;
          root.appendChild(link);
          link.click();
          link.remove();
          if (button === cleanedButton) {
            track('report_cta_clicked', { page_id: pageId, state: report.data.state.toLowerCase() });
          }
        };
      }

      const stateText =
        report.data.state === 'S2' ? 'CLEAN' : report.data.state === 'S3' ? 'CLEAN, WITH NOTES' : 'NEEDS ATTENTION';
      query<HTMLElement>(root, '[data-result-icon]').innerHTML =
        report.data.state === 'S4' ? ICONS.attention : ICONS.clean;
      query<HTMLElement>(root, '[data-result-state]').textContent = stateText;
      query<HTMLElement>(root, '[data-result-detail]').textContent =
        report.data.state === 'S4'
          ? 'Some segments could not be removed. The report lists them; the file is still available to download.'
          : report.data.state === 'S3'
            ? `${diff.leftUntouched} segments were left as-is. The report explains each one.`
            : 'The metadata segments listed in the report were removed and the output was re-checked.';
      banner.classList.toggle('needs-attention', report.data.state === 'S4');
      banner.hidden = false;
      downloadArea.hidden = false;
      setStatus('');
      diffSection.hidden = false;
      diffEmpty.hidden = diff.rows.length > 0;
      diffSummary.textContent = `${diff.rows.filter((row) => row.status === 'removed').length} segments removed. ${root.dataset.resultTitle ?? 'Your file'} is ready.`;

      track('report_generated', {
        page_id: pageId,
        state: report.data.state.toLowerCase(),
        segments_removed: diff.rows.filter((row) => row.status === 'removed').length,
        segments_left: diff.remaining + diff.leftUntouched,
        has_c2pa: before.hasJumbf,
        gen_ms: Math.round(report.data.durationMs),
      });

      showFields.onclick = async () => {
        showFields.hidden = true;
        const { readFullFields } = await import('../../lib/inspect/full');
        for (const row of diff.rows) {
          const tr = document.createElement('tr');
          const cells = [row.group, row.name, String(row.before), String(row.after), row.status];
          for (const value of cells) {
            const td = document.createElement('td');
            td.textContent = value;
            if (row.status === 'removed') td.className = 'diff-removed';
            if (row.status === 'kept') td.className = 'diff-kept';
            tr.appendChild(td);
          }
          fieldBody.appendChild(tr);
        }
        fieldRows.hidden = false;
        try {
          await readFullFields(bytes);
        } catch {
          // Full field listing is optional; the segment diff above remains available.
        }
        track('report_expanded', { page_id: pageId, state: report.data.state.toLowerCase() });
      };
    } catch {
      if (slowTimer) clearTimeout(slowTimer);
      fail('strip_error');
      track('report_failed', { page_id: pageId, reason: 'strip_error' });
    } finally {
      input.disabled = false;
    }
  }

  dropZone.addEventListener('click', () => {
    if (!input.disabled) input.click();
  });
  dropZone.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !input.disabled) {
      event.preventDefault();
      input.click();
    }
  });
  root.querySelectorAll<HTMLButtonElement>('[data-choose]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!input.disabled) input.click();
    });
  });
  input.addEventListener('change', () => {
    void handleFiles(Array.from(input.files ?? []));
  });
  dropZone.addEventListener('dragover', (event) => event.preventDefault());
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    if (!input.disabled) void handleFiles(Array.from(event.dataTransfer?.files ?? []));
  });
  query<HTMLButtonElement>(root, '[data-retry]').addEventListener('click', () => {
    failure.hidden = true;
    input.value = '';
    input.click();
  });
}
