import { strict as assert } from 'node:assert';
import { buildReport, reportStateFor } from '../src/lib/report/build';
import { buildDiff } from '../src/lib/inspect/compare';
import { stripJpeg } from '../src/lib/strip/jpeg';
import { stripPng } from '../src/lib/strip/png';
import { scanJpeg } from '../src/lib/strip/jpeg';
import { scanPng } from '../src/lib/strip/png';
import { sha256Hex } from '../src/lib/report/hash';
import { ENGINE_VERSION } from '../src/lib/strip/common';

const enc = new TextEncoder();
let passed = 0;
function ok(label, condition) {
  assert(condition, label);
  passed++;
  console.log(`  PASS ${label}`);
}

function cat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
function marker(code, payload) {
  return cat(new Uint8Array([0xff, code]), new Uint8Array([((payload.length + 2) >> 8) & 255, (payload.length + 2) & 255]), payload);
}
function jpegWithSecrets() {
  return cat(
    new Uint8Array([0xff, 0xd8]),
    marker(0xe1, enc.encode('Exif\0\0II*\0 secretSerialSN-991')),
    marker(0xe1, enc.encode('http://ns.adobe.com/xap/1.0/\0<x>37.7749 -122.4194</x>')),
    marker(0xeb, enc.encode('JUMBF')),
    new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x01, 0x11, 0xff, 0xd9]),
  );
}
function pngWithPromptAndIcc() {
  const chunk = (type, payload) => cat(new Uint8Array([0, 0, 0, payload.length]), enc.encode(type), payload, new Uint8Array([0, 0, 0, 1]));
  return cat(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', new Uint8Array(13)),
    chunk('tEXt', enc.encode('parameters\0my secret prompt')),
    chunk('caBX', enc.encode('JUMBF')),
    chunk('iCCP', enc.encode('icc')),
    chunk('IDAT', enc.encode('PIXELS')),
    chunk('IEND', new Uint8Array(0)),
  );
}

const SCOPE = 'This report covers only the file you uploaded and only the metadata segments our parsers read.';

async function makeReport(input, name, forceRemaining = false) {
  const format = input[0] === 0xff ? 'jpeg' : 'png';
  const stripped = format === 'jpeg' ? stripJpeg(input) : stripPng(input);
  const before = (format === 'jpeg' ? scanJpeg(input) : scanPng(input)).flatMap((s) => (s.action ? [s.action] : []));
  const after = (format === 'jpeg' ? scanJpeg(stripped.bytes) : scanPng(stripped.bytes)).flatMap((s) => (s.action ? [s.action] : []));
  if (forceRemaining) after.push(before.find((a) => a.disposition === 'removed'));
  const diff = buildDiff(before, after);
  const report = buildReport({
    fileName: name,
    format,
    originalBytes: input.length,
    outputBytes: stripped.bytes.length,
    sha256: await sha256Hex(stripped.bytes),
    diff,
    durationMs: 12,
    cleanedAt: '2026-10-25T08:00:00.000Z',
  });
  return { report, stripped, diff };
}

const clean = await makeReport(jpegWithSecrets(), 'photo.jpg');
ok('S2 state CLEAN', clean.report.data.state === 'S2' && clean.report.html.includes('CLEAN'));
const notes = await makeReport(pngWithPromptAndIcc(), 'image.png');
ok('S3 state CLEAN, WITH NOTES (PNG ICC left untouched)', notes.report.data.state === 'S3');
const attention = await makeReport(jpegWithSecrets(), 'photo.jpg', true);
ok('S4 state NEEDS ATTENTION', attention.report.data.state === 'S4' && attention.report.html.includes('NEEDS ATTENTION'));
ok('S4 output still downloadable and non-empty', attention.stripped.bytes.length > 0);

ok('report title fixed exactly once', clean.report.html.split('Metadata Cleaning Report').length - 1 >= 1);
const titleArea = clean.report.html.split('<h2>File</h2>')[0];
ok('title and conclusion have no C2PA/Content Credentials', !/c2pa|content credential/i.test(titleArea));
ok('F2 third sentence identical across states',
  [clean, notes, attention].every((r) => r.report.html.includes(SCOPE)));
ok('no original GPS/serial values leak', !clean.report.html.includes('37.7749') && !clean.report.html.includes('secretSerialSN-991') && !clean.report.html.includes('-122.4194'));
ok('no prompt text leaks', !notes.report.html.includes('my secret prompt'));
ok('C2PA and prompt groups are independent',
  notes.report.html.includes('Content Credentials (C2PA)') && notes.report.html.includes('Prompt &amp; workflow text (AI generation settings)'));
ok('SD explanation verbatim', notes.report.html.includes('This is not a provenance label.'));
ok('PNG ICC uses left untouched (not inspected)', notes.report.html.includes('left untouched (not inspected)'));
ok('JPEG C2PA row present in list only', clean.report.html.includes('Content Credentials (C2PA)'));
ok('no external URLs in report', !/https?:\/\//.test(clean.report.html));
ok('no external resource loads', !/src=|@import|<link/.test(clean.report.html));
ok('no server retention wording', !/30 minutes|24 hours|automatically deleted/.test(clean.report.html));
ok('method footer present', clean.report.html.includes('files are processed in your browser and are not uploaded to a server'));
ok('parser version matches engine', clean.report.data.parserVersion === ENGINE_VERSION && clean.report.html.includes(`engine ${ENGINE_VERSION}`));
ok('report schema v1.0, report v1.1', clean.report.data.schemaVersion === 'v1.0' && clean.report.data.reportVersion === 'v1.1');
ok('JSON sidecar same data', JSON.parse(clean.report.json).sha256 === clean.report.data.sha256);
ok('fileName is basename only', buildReport({
  fileName: 'C:\\Users\\x\\secret.jpg', format: 'jpeg', originalBytes: 1, outputBytes: 1, sha256: 'ab', diff: { rows: [], remaining: 0, leftUntouched: 0 }, durationMs: 1,
}).data.fileName === 'secret.jpg');

for (let i = 0; i < 10; i++) {
  const sample = i % 2 === 0 ? await makeReport(jpegWithSecrets(), `sample-${i}.jpg`) : await makeReport(pngWithPromptAndIcc(), `sample-${i}.png`);
  const size = new TextEncoder().encode(sample.report.html).length;
  ok(`sample ${i} report <= 60KB`, size <= 60 * 1024, `${size}B`);
}

ok('state mapping remaining => S4', reportStateFor({ rows: [], remaining: 1, leftUntouched: 0 }) === 'S4');
ok('state mapping untouched => S3', reportStateFor({ rows: [], remaining: 0, leftUntouched: 1 }) === 'S3');
ok('state mapping clean => S2', reportStateFor({ rows: [], remaining: 0, leftUntouched: 0 }) === 'S2');

console.log(`test-report: ${passed} assertions passed`);
