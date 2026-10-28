import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_DIR, SAMPLE_META, readSamples, readSnapshot } from './snapshot.mjs';

const expectedIds = SAMPLE_META.map((sample) => sample.id);
const snapshot = readSnapshot();
const actual = await readSamples();
assert.deepEqual(actual, snapshot, 'examples.ts differs from a fresh engine read');
assert.deepEqual(actual.map((sample) => sample.id), expectedIds);
assert.equal(actual.length, 8);

for (const sample of actual) {
  const bytes = readFileSync(join(ASSET_DIR, sample.file));
  assert(bytes.length > 0, `${sample.id}: empty input`);
  assert(sample.outputBytes > 0, `${sample.id}: empty output`);
  const text = bytes.toString('latin1');
  assert(!/35\.|51\.|37\.7749|-122\.4194/.test(text), `${sample.id}: non-zero or real coordinates`);
  assert(!/SN-(?!TEST-\d{4})/.test(text), `${sample.id}: non-test serial number`);
  if (text.includes('steps=')) assert(text.includes('steps=0, sampler=PLACEHOLDER, seed=0'), `${sample.id}: non-placeholder prompt`);
  if (sample.empty) assert.equal(sample.rows.length, 0, `${sample.id}: empty sample has removed fields`);
  else assert(sample.rows.length > 0, `${sample.id}: expected engine-produced fields`);
  for (const row of sample.rows) {
    assert.equal(row.after, 0, `${sample.id}: field remains after cleaning`);
    assert.equal(row.status, 'removed', `${sample.id}: unexpected row state`);
  }
}
const c2pa = actual.find((sample) => sample.id === 'c2pa-signed-manifest');
assert(c2pa.note.includes('Public C2PA test asset'), 'C2PA source is not disclosed');
assert(c2pa.rows.some((row) => row.group.includes('Content Credentials')), 'C2PA manifest not read by engine');
const heic = actual.find((sample) => sample.id === 'iphone-heic-makernote');
assert(heic.note.includes('public libheif test image'), 'HEIC source is not disclosed');
assert(heic.rows.some((row) => row.name === 'meta EXIF item'), 'HEIC EXIF item not read by engine');
console.log('examples verify: 8 files, engine snapshots, synthetic values and public-source disclosures OK');
