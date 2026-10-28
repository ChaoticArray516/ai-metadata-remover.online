import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const ASSET_DIR = join(ROOT, 'src', 'assets', 'examples');
export const DATA_FILE = join(ROOT, 'src', 'data', 'examples.ts');

export const SAMPLE_META = [
  { id: 'pixel-exif-basic', file: 'pixel-exif-basic.jpg', format: 'JPEG', folded: false, empty: false, note: 'Synthetic EXIF on a generated pixel image.' },
  { id: 'iphone-heic-makernote', file: 'iphone-heic-makernote.heic', format: 'HEIC', folded: false, empty: false, note: 'Synthetic MakerNote on a public libheif test image.' },
  { id: 'sd-png-text-chunk', file: 'sd-png-text-chunk.png', format: 'PNG', folded: false, empty: false, note: 'Placeholder generation text in a PNG tEXt chunk.' },
  { id: 'c2pa-signed-manifest', file: 'c2pa-signed-manifest.jpg', format: 'JPEG', folded: true, empty: false, note: 'Public C2PA test asset from contentauth/c2pa-rs; its test signing chain is not a trust claim by this site.' },
  { id: 'adobe-xmp-iptc-full', file: 'adobe-xmp-iptc-full.jpg', format: 'JPEG', folded: true, empty: false, note: 'Synthetic XMP, IPTC and EXIF segments on a generated image.' },
  { id: 'webp-exif-chunk', file: 'webp-exif-chunk.webp', format: 'WebP', folded: false, empty: false, note: 'Synthetic EXIF and XMP chunks in a generated WebP file.' },
  { id: 'no-tags-at-all', file: 'no-tags-at-all.jpg', format: 'JPEG', folded: false, empty: true, note: 'A generated image with no metadata segments to remove.' },
  { id: 'already-cleaned', file: 'already-cleaned.png', format: 'PNG', folded: false, empty: true, note: 'The output of the same cleaning engine, read again.' },
];

let enginePromise;
async function engine() {
  if (!enginePromise) {
    const output = join(ROOT, '.test-build', 'examples-engine.mjs');
    await build({
      entryPoints: [join(ROOT, 'scripts', 'examples', 'engine.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outfile: output,
      external: ['exifr'],
      logLevel: 'error',
    });
    enginePromise = import(pathToFileURL(output).href);
  }
  return enginePromise;
}

export async function cleanBytes(bytes) {
  const { stripImage } = await engine();
  return stripImage(bytes);
}

export async function readSamples() {
  const { inspectBytes, stripImage, buildDiff } = await engine();
  const samples = [];
  for (const meta of SAMPLE_META) {
    const bytes = new Uint8Array(readFileSync(join(ASSET_DIR, meta.file)));
    const inspected = inspectBytes(bytes);
    const stripped = await stripImage(bytes);
    const after = inspectBytes(stripped.bytes);
    const beforeActions = inspected.format === 'heic' ? stripped.actions : inspected.actions;
    const diff = buildDiff(beforeActions, after.actions);
    samples.push({
      ...meta,
      bytes: bytes.length,
      outputBytes: stripped.bytes.length,
      rows: diff.rows.filter((row) => row.status !== 'kept').map((row) => ({
        group: row.group,
        name: row.name,
        before: row.before,
        after: row.after,
        status: row.status,
        note: row.note ?? '',
      })),
    });
  }
  return samples;
}

export function serializeSamples(samples) {
  return `export const EXAMPLES = ${JSON.stringify(samples, null, 2)} as const;\n`;
}

export async function writeSnapshot() {
  const samples = await readSamples();
  writeFileSync(DATA_FILE, serializeSamples(samples));
  return samples;
}

export function readSnapshot() {
  const source = readFileSync(DATA_FILE, 'utf8');
  const match = source.match(/^export const EXAMPLES = ([\s\S]*) as const;\s*$/);
  if (!match) throw new Error('Unexpected examples.ts format');
  return JSON.parse(match[1]);
}
