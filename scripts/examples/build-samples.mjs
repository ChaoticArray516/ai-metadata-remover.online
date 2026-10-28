import { createCanvas } from 'canvas';
import piexif from 'piexifjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_DIR, ROOT, cleanBytes, writeSnapshot } from './snapshot.mjs';

const enc = new TextEncoder();
const canvas = createCanvas(64, 64);
const context = canvas.getContext('2d');
context.fillStyle = '#dce7f5';
context.fillRect(0, 0, 64, 64);
context.fillStyle = '#345b8c';
context.fillRect(8, 8, 48, 48);

function exifObject(serial = 'SN-TEST-0001') {
  const zeroth = {
    [piexif.ImageIFD.Make]: 'Google',
    [piexif.ImageIFD.Model]: 'Pixel 7',
    [piexif.ImageIFD.Software]: 'test-builder',
    [piexif.ImageIFD.DateTime]: '2026:01:01 00:00:00',
    [piexif.ImageIFD.CameraSerialNumber]: serial,
  };
  const exif = {
    [piexif.ExifIFD.DateTimeOriginal]: '2026:01:01 00:00:00',
    [piexif.ExifIFD.DateTimeDigitized]: '2026:01:01 00:00:00',
    [piexif.ExifIFD.BodySerialNumber]: serial,
    [piexif.ExifIFD.LensMake]: 'test-lens',
    [piexif.ExifIFD.LensModel]: 'test-lens-0mm',
    [piexif.ExifIFD.MakerNote]: 'TEST-MAKERNOTE',
  };
  const gps = {
    [piexif.GPSIFD.GPSLatitudeRef]: 'N',
    [piexif.GPSIFD.GPSLatitude]: [[0, 1], [0, 1], [0, 10000]],
    [piexif.GPSIFD.GPSLongitudeRef]: 'E',
    [piexif.GPSIFD.GPSLongitude]: [[0, 1], [0, 1], [0, 10000]],
  };
  return { '0th': zeroth, Exif: exif, GPS: gps, Interop: {}, '1st': {}, thumbnail: undefined };
}

function jpegWithExif() {
  const source = canvas.toDataURL('image/jpeg');
  return Buffer.from(piexif.insert(piexif.dump(exifObject()), source).split(',')[1], 'base64');
}
function cat(...parts) {
  return Buffer.concat(parts.map((part) => Buffer.isBuffer(part) ? part : Buffer.from(part)));
}
function be32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value >>> 0);
  return out;
}
function marker(code, payload) {
  const length = Buffer.alloc(2);
  length.writeUInt16BE(payload.length + 2);
  return cat(Buffer.from([0xff, code]), length, payload);
}
function box(type, payload) {
  return cat(be32(payload.length + 8), Buffer.from(type), payload);
}
function fullBox(type, version, payload) {
  return box(type, cat(Buffer.from([version, 0, 0, 0]), payload));
}
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, payload) {
  const body = cat(Buffer.from(type), payload);
  return cat(be32(payload.length), body, be32(crc32(body)));
}
function pngWithText() {
  const source = canvas.toBuffer('image/png');
  const text = pngChunk('tEXt', enc.encode('parameters\0steps=0, sampler=PLACEHOLDER, seed=0'));
  const idat = source.indexOf(Buffer.from('IDAT')) - 4;
  return cat(source.subarray(0, idat), text, source.subarray(idat));
}
function webpWithExif() {
  const source = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x20 | 0x08 | 0x04;
  const chunk = (type, payload) => cat(Buffer.from(type), (() => { const b = Buffer.alloc(4); b.writeUInt32LE(payload.length); return b; })(), payload, payload.length % 2 ? Buffer.from([0]) : Buffer.alloc(0));
  const body = cat(chunk('VP8X', vp8x), chunk('EXIF', Buffer.from(piexif.dump(exifObject('SN-TEST-0006')), 'binary')), chunk('XMP ', enc.encode('<xmp>test</xmp>')), source.subarray(12));
  const size = Buffer.alloc(4);
  size.writeUInt32LE(body.length + 4);
  return cat(Buffer.from('RIFF'), size, Buffer.from('WEBP'), body);
}
function parseBoxes(bytes, start, end) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    const size = bytes.readUInt32BE(offset);
    if (size < 8 || offset + size > end) break;
    boxes.push({ type: bytes.toString('ascii', offset + 4, offset + 8), start: offset, size, headerSize: 8 });
    offset += size;
  }
  return boxes;
}
function readSized(bytes, offset, size) {
  let value = 0;
  for (let i = 0; i < size; i++) value = value * 256 + bytes[offset + i];
  return value;
}
function sized(value, size) {
  const out = Buffer.alloc(size);
  for (let i = size - 1; i >= 0; i--) {
    out[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return out;
}
function addHeicExif(source, exifPayload) {
  const top = parseBoxes(source, 0, source.length);
  const meta = top.find((item) => item.type === 'meta');
  const mdat = top.find((item) => item.type === 'mdat');
  if (!meta || !mdat) throw new Error('Public HEIC lacks meta/mdat');
  const children = parseBoxes(source, meta.start + 12, meta.start + meta.size);
  const iinf = children.find((item) => item.type === 'iinf');
  const iloc = children.find((item) => item.type === 'iloc');
  if (!iinf || !iloc) throw new Error('Public HEIC lacks iinf/iloc');
  const iinfVersion = source[iinf.start + 8];
  const countSize = iinfVersion === 0 ? 2 : 4;
  const entriesStart = iinf.start + 12 + countSize;
  const infeBoxes = parseBoxes(source, entriesStart, iinf.start + iinf.size);
  let maxId = 0;
  for (const infe of infeBoxes) {
    if (infe.type !== 'infe') continue;
    const version = source[infe.start + 8];
    maxId = Math.max(maxId, readSized(source, infe.start + 12, version === 2 ? 2 : 4));
  }
  const newId = maxId + 1;
  const newInfe = fullBox('infe', 2, cat(sized(newId, 2), Buffer.alloc(2), Buffer.from('Exif'), Buffer.from([0])));
  const newCount = infeBoxes.filter((item) => item.type === 'infe').length + 1;
  const rebuiltIinf = fullBox('iinf', iinfVersion, cat(sized(newCount, countSize), source.subarray(entriesStart, iinf.start + iinf.size), newInfe));

  const ilocVersion = source[iloc.start + 8];
  const payloadStart = iloc.start + 12;
  const sizes = source[payloadStart];
  const sizes2 = source[payloadStart + 1];
  const offsetSize = sizes >> 4;
  const lengthSize = sizes & 0x0f;
  const baseOffsetSize = sizes2 >> 4;
  const indexSize = ilocVersion === 1 || ilocVersion === 2 ? sizes2 & 0x0f : 0;
  let cursor = payloadStart + 2;
  const itemCount = ilocVersion === 2 ? source.readUInt32BE(cursor) : source.readUInt16BE(cursor);
  cursor += ilocVersion === 2 ? 4 : 2;
  const items = [];
  for (let n = 0; n < itemCount; n++) {
    const id = readSized(source, cursor, ilocVersion === 2 ? 4 : 2);
    cursor += ilocVersion === 2 ? 4 : 2;
    let constructionMethod = 0;
    if (ilocVersion === 1 || ilocVersion === 2) {
      constructionMethod = source.readUInt16BE(cursor) & 0x0f;
      cursor += 2;
    }
    cursor += 2;
    const baseOffset = readSized(source, cursor, baseOffsetSize);
    cursor += baseOffsetSize;
    const extentCount = source.readUInt16BE(cursor);
    cursor += 2;
    const extents = [];
    for (let e = 0; e < extentCount; e++) {
      if ((ilocVersion === 1 || ilocVersion === 2) && indexSize > 0) cursor += indexSize;
      const extentOffset = readSized(source, cursor, offsetSize);
      cursor += offsetSize;
      const extentLength = readSized(source, cursor, lengthSize);
      cursor += lengthSize;
      extents.push({ extentOffset, extentLength });
    }
    items.push({ id, constructionMethod, baseOffset, extents });
  }
  const oldMetaSize = meta.size;
  const newRecordSize = (ilocVersion === 2 ? 4 : 2) + (ilocVersion === 1 || ilocVersion === 2 ? 2 : 0)
    + 2 + baseOffsetSize + 2 + indexSize + offsetSize + lengthSize;
  const metaGrowth = rebuiltIinf.length - iinf.size + newRecordSize;
  const newExifOffset = mdat.start + metaGrowth + mdat.size;
  const ilocHead = cat(Buffer.from([sizes, sizes2]), sized(itemCount + 1, ilocVersion === 2 ? 4 : 2));
  const records = [];
  for (const item of [...items, { id: newId, constructionMethod: 0, baseOffset: newExifOffset, extents: [{ extentOffset: 0, extentLength: exifPayload.length }] }]) {
    const parts = [sized(item.id, ilocVersion === 2 ? 4 : 2)];
    if (ilocVersion === 1 || ilocVersion === 2) parts.push(sized(item.constructionMethod, 2));
    parts.push(Buffer.alloc(2), sized(0, baseOffsetSize), sized(item.extents.length, 2));
    for (const extent of item.extents) {
      if (indexSize > 0) parts.push(Buffer.alloc(indexSize));
      const absolute = item.id === newId ? item.baseOffset : item.baseOffset + extent.extentOffset + (item.constructionMethod === 0 ? metaGrowth : 0);
      const relative = item.constructionMethod === 0 ? absolute : extent.extentOffset;
      parts.push(sized(relative, offsetSize), sized(extent.extentLength, lengthSize));
    }
    records.push(cat(...parts));
  }
  const rebuiltIloc = box('iloc', cat(source.subarray(iloc.start + 8, payloadStart), ilocHead, ...records));
  const metaParts = [source.subarray(meta.start + 8, meta.start + 12)];
  for (const child of children) {
    if (child.type === 'iinf') metaParts.push(rebuiltIinf);
    else if (child.type === 'iloc') metaParts.push(rebuiltIloc);
    else metaParts.push(source.subarray(child.start, child.start + child.size));
  }
  const rebuiltMeta = box('meta', cat(...metaParts));
  const delta = rebuiltMeta.length - oldMetaSize;
  if (delta !== rebuiltIinf.length - iinf.size + rebuiltIloc.length - iloc.size) {
    throw new Error(`HEIC size accounting failed: ${JSON.stringify({ delta, iinfGrowth: rebuiltIinf.length - iinf.size, ilocGrowth: rebuiltIloc.length - iloc.size, newRecordSize, itemCount })}`);
  }
  const rebuiltMdat = box('mdat', cat(source.subarray(mdat.start + 8, mdat.start + mdat.size), exifPayload));
  const output = [];
  for (const item of top) {
    if (item.type === 'meta') output.push(rebuiltMeta);
    else if (item.type === 'mdat' && item.start === mdat.start) output.push(rebuiltMdat);
    else output.push(source.subarray(item.start, item.start + item.size));
  }
  return cat(...output);
}

async function ensureSource(file, url) {
  if (!existsSync(file)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Source download failed: ${url} ${response.status}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(file);
}

mkdirSync(ASSET_DIR, { recursive: true });
writeFileSync(join(ASSET_DIR, 'pixel-exif-basic.jpg'), jpegWithExif());
const heicBase = await ensureSource(join(ROOT, '.test-build', 'example.heic'), 'https://raw.githubusercontent.com/strukturag/libheif/master/examples/example.heic');
writeFileSync(join(ASSET_DIR, 'iphone-heic-makernote.heic'), addHeicExif(heicBase, cat(Buffer.from('Exif\0\0'), Buffer.from(piexif.dump(exifObject('SN-TEST-0002')), 'binary'))));
writeFileSync(join(ASSET_DIR, 'sd-png-text-chunk.png'), pngWithText());
const c2paAsset = await ensureSource(join(ROOT, '.test-build', 'CA.jpg'), 'https://raw.githubusercontent.com/contentauth/c2pa-rs/main/sdk/tests/fixtures/CA.jpg');
writeFileSync(join(ASSET_DIR, 'c2pa-signed-manifest.jpg'), c2paAsset);
const xmp = enc.encode('http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description digitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></rdf:RDF></x:xmpmeta>');
const adobe = jpegWithExif();
writeFileSync(join(ASSET_DIR, 'adobe-xmp-iptc-full.jpg'), cat(adobe.subarray(0, 2), marker(0xe1, xmp), marker(0xed, enc.encode('Photoshop 3.0\0TEST-IPTC')), adobe.subarray(2)));
writeFileSync(join(ASSET_DIR, 'webp-exif-chunk.webp'), webpWithExif());
writeFileSync(join(ASSET_DIR, 'no-tags-at-all.jpg'), canvas.toBuffer('image/jpeg'));
const alreadyCleaned = await cleanBytes(pngWithText());
writeFileSync(join(ASSET_DIR, 'already-cleaned.png'), Buffer.from(alreadyCleaned.bytes));
writeFileSync(join(ASSET_DIR, 'sources.json'), JSON.stringify({
  heic: 'https://github.com/strukturag/libheif/blob/master/examples/example.heic',
  c2pa: 'https://github.com/contentauth/c2pa-rs/blob/main/sdk/tests/fixtures/CA.jpg',
}, null, 2) + '\n');
const samples = await writeSnapshot();
console.log(`Generated ${samples.length} samples and src/data/examples.ts`);
