import { ENGINE_VERSION, PARSER_VERSION } from '../strip/common';
import type { DiffRow } from '../inspect/compare';

export type ReportState = 'S2' | 'S3' | 'S4';

export interface ReportData {
  schemaVersion: 'v1.0';
  reportVersion: 'v1.1';
  engineVersion: string;
  parserVersion: string;
  state: ReportState;
  fileName: string;
  format: string;
  originalBytes: number;
  outputBytes: number;
  sha256: string;
  cleanedAt: string;
  durationMs: number;
  rows: DiffRow[];
}

export const REPORT_TITLE = 'Metadata Cleaning Report';

const SCOPE_SENTENCE =
  'This report covers only the file you uploaded and only the metadata segments our parsers read.';

const CONCLUSIONS: Record<ReportState, { heading: string; sentence: string }> = {
  S2: {
    heading: 'CLEAN',
    sentence: 'We removed the metadata segments listed below and re-checked the output file.',
  },
  S3: {
    heading: 'CLEAN, WITH NOTES',
    sentence:
      'The metadata segments listed below were removed, except for the ones marked as left untouched. We re-checked the output file.',
  },
  S4: {
    heading: 'NEEDS ATTENTION',
    sentence:
      'One or more segments could not be removed, or could not be read back, and are marked below. The file is still available to download.',
  },
};

const BOUNDARIES = [
  'This report does not confirm that invisible watermarks are absent. We do not detect them.',
  'This report does not cover labels or flags added by the platform you uploaded to.',
  'This report does not cover copies of Content Credentials held outside this file, such as a platform record or a public ledger.',
  'Removing metadata does not change what the image itself shows.',
  'A re-upload may attach new metadata from the service you use.',
] as const;

const SD_EXPLANATION =
  'This is not a provenance label. Stable Diffusion and ComfyUI store the prompt and the generation settings as plain text inside the PNG. We report it separately for that reason.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hashGroups(hash: string): string {
  return hash.replace(/(.{8})/g, '$1 ').trim();
}

function rowNote(row: DiffRow): string {
  if (row.note) return row.note;
  if (row.status === 'removed') return 'removed (confirmed)';
  if (row.status === 'remaining') return 'could not parse';
  return 'kept on purpose';
}

export function renderReportHtml(data: ReportData): string {
  const conclusion = CONCLUSIONS[data.state];
  const generated = new Date(data.cleanedAt);
  const generatedLine = `Generated on ${generated.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })}`;
  const sizeDelta =
    data.originalBytes > 0
      ? `${data.originalBytes} → ${data.outputBytes} bytes (${(((data.outputBytes - data.originalBytes) / data.originalBytes) * 100).toFixed(1)}%)`
      : `${data.outputBytes} bytes`;

  const rows = data.rows
    .map(
      (row) => `<tr><td>${escapeHtml(row.group)}</td><td>${escapeHtml(row.name)}</td><td>${
        row.status === 'removed' ? 'removed' : row.status === 'remaining' ? 'could not remove' : rowNote(row)
      }</td><td>${row.before} → ${row.after}</td><td>${escapeHtml(rowNote(row))}</td></tr>`,
    )
    .join('\n');

  const sdSection = data.rows.some((row) => row.group === 'Prompt & workflow text (AI generation settings)')
    ? `<p class="note">${escapeHtml(SD_EXPLANATION)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>${REPORT_TITLE}</title>
<style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1a2230;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.55}
h1{font-size:1.5rem}h2{font-size:1.1rem;margin-top:2rem}
.conclusion{border-left:4px solid #157a3d;background:#f6f7f9;padding:.75rem 1rem}
.conclusion.attention{border-left-color:#8a5a00;background:#fff4e0}
.conclusion .state{font-size:1.5rem;font-weight:700}
.scope{font-size:.95rem}
table{border-collapse:collapse;width:100%;font-size:.85rem}
th,td{text-align:left;padding:.4rem;border-bottom:1px solid #dde2e8;vertical-align:top}
.hash{font-family:ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
.tw{overflow-x:auto}
td{word-break:break-word}
.note{font-size:.85rem;color:#5a6472}
footer{margin-top:2rem;font-size:.8rem;color:#5a6472;border-top:1px solid #dde2e8;padding-top:1rem}
</style>
</head>
<body>
<h1>${REPORT_TITLE}</h1>
<p class="note">${escapeHtml(generatedLine)}</p>
<section class="conclusion${data.state === 'S4' ? ' attention' : ''}">
<p class="state">${conclusion.heading}</p>
<p class="scope">${conclusion.sentence} ${SCOPE_SENTENCE}</p>
</section>
<h2>File</h2>
<table>
<tr><th>Name</th><td>${escapeHtml(data.fileName || '(not recorded)')}</td></tr>
<tr><th>Format</th><td>${escapeHtml(data.format)}</td></tr>
<tr><th>Size</th><td>${escapeHtml(sizeDelta)}</td></tr>
<tr><th>Cleaned at</th><td>${escapeHtml(data.cleanedAt)}</td></tr>
<tr><th>SHA-256 (output)</th><td class="hash">${escapeHtml(hashGroups(data.sha256))}</td></tr>
</table>
<h2>Segments</h2>
<div class="tw">
<table>
<tr><th>Group</th><th>Segment</th><th>Disposition</th><th>Count</th><th>Note</th></tr>
${rows}
</table>
</div>
${sdSection}
<h2>What this report does not cover</h2>
${BOUNDARIES.map((line) => `<p>${escapeHtml(line)}</p>`).join('\n')}
<footer>
<p>Method: files are processed in your browser and are not uploaded to a server. The cleaned file is produced locally; nothing about this file is stored after you close this tab.</p>
<p>Report schema v1.0 · engine ${ENGINE_VERSION} · parsers enabled: TIFF, XMP, IPTC, ICC (JPEG only) · parser ${PARSER_VERSION} · generated in ${Math.round(data.durationMs)} ms · report v1.1</p>
<p>Re-check a file at any time: ai-metadata-remover.online/remove-metadata-from-photo/</p>
</footer>
</body>
</html>`;
}
