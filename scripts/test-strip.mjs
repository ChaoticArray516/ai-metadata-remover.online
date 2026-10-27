import { strict as assert } from 'node:assert';
import { stripJpeg, scanJpeg } from '../src/lib/strip/jpeg';
import { stripPng, scanPng } from '../src/lib/strip/png';
import { stripWebp, scanWebp } from '../src/lib/strip/webp';
import { stripHeic } from '../src/lib/strip/heic';
import { stripImage, detectFormat } from '../src/lib/strip/strip';
import { validateFiles, reducer, initialModel, MAX_FILE_BYTES } from '../src/lib/state';

const enc = new TextEncoder();
let passed = 0;
function ok(label, condition) {
  assert(condition, label);
  passed++;
  console.log(`  PASS ${label}`);
}

function be32(value) {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}
function le32(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
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
  return cat(new Uint8Array([0xff, code]), be32(payload.length + 2).slice(2), payload);
}
function includesBytes(haystack, needle) {
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function exifTiff() {
  const make = enc.encode('TestCam\0');
  const header = cat(enc.encode('II'), new Uint8Array([42, 0]), le32(8).reverse());
  const ifd = cat(new Uint8Array([1, 0]), new Uint8Array([0x0f, 0x01, 2, 0]), le32(make.length).reverse(), le32(26).reverse(), new Uint8Array([0, 0, 0, 0]), make);
  return cat(enc.encode('Exif\0\0'), header, ifd);
}

function jpegSample(i) {
  const icc = enc.encode(`ICC_PROFILE_FAKE_${i}`);
  const xmp = enc.encode(`http://ns.adobe.com/xap/1.0/\0<x>37.7749,-122.4194 serialSN${i}</x>`);
  return cat(
    new Uint8Array([0xff, 0xd8]),
    marker(0xe0, enc.encode('JFIF\0')),
    marker(0xe1, exifTiff()),
    marker(0xe1, xmp),
    marker(0xe2, icc),
    marker(0xed, enc.encode('Photoshop 3.0\0IPTC')),
    marker(0xeb, enc.encode('JUMBF manifest')),
    new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x01]),
    enc.encode(`ENTROPY_${i}_%.?`),
    new Uint8Array([0xff, 0xd9]),
  );
}

function pngSample(i) {
  const chunk = (type, payload) => cat(le32(payload.length).reverse(), enc.encode(type), payload, new Uint8Array([0, 0, 0, 1]));
  return cat(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', new Uint8Array(13).fill(1)),
    chunk('tEXt', enc.encode(`parameters\0prompt text ${i} 37.7749`)),
    chunk('iTXt', enc.encode('XML:com.adobe.xmp\0\0\0\0\0<xmp/>')),
    chunk('zTXt', enc.encode('workflow\0\0nodes')),
    chunk('eXIf', exifTiff()),
    chunk('caBX', enc.encode('JUMBF')),
    chunk('iCCP', enc.encode(`icc${i}`)),
    chunk('IDAT', enc.encode(`PIXELS_${i}`)),
    chunk('IEND', new Uint8Array(0)),
  );
}

function webpSample(i) {
  const chunk = (fourcc, payload) => {
    const parts = [enc.encode(fourcc), le32(payload.length), payload];
    if (payload.length % 2) parts.push(new Uint8Array([0]));
    return cat(...parts);
  };
  const vp8x = new Uint8Array(10);
  vp8x[0] = 0x08 | 0x04 | 0x20;
  const body = cat(
    chunk('VP8X', vp8x),
    chunk('ICCP', enc.encode(`icc${i}`)),
    chunk('EXIF', exifTiff()),
    chunk('XMP ', enc.encode('<xmp/>')),
    chunk('VP8L', enc.encode(`PIXELS_${i}`)),
  );
  return cat(enc.encode('RIFF'), le32(4 + body.length), enc.encode('WEBP'), body);
}

function heicSample(i) {
  const box = (type, payload) => cat(be32(8 + payload.length), enc.encode(type), payload);
  const full = (type, version, payload) => box(type, cat(new Uint8Array([version, 0, 0, 0]), payload));
  const exifPayload = enc.encode(`Exif\0\0EXIFDATA_${i}`);
  const xmpPayload = enc.encode('<xmp>heic</xmp>');
  const imagePayload = enc.encode(`IMAGE_DATA_${i}_UNTOUCHED`);
  const infe = (id, type, extra) =>
    full('infe', 2, cat(new Uint8Array([0, id, 0, 0]), enc.encode(type), new Uint8Array([0]), extra));
  const iinf = full('iinf', 0, cat(
    new Uint8Array([0, 3]),
    infe(1, 'Exif', new Uint8Array(0)),
    infe(2, 'mime', enc.encode('application/rdf+xml\0')),
    infe(3, 'hvc1', new Uint8Array(0)),
  ));
  const buildIloc = (exifOffset) => full('iloc', 1, cat(
    new Uint8Array([0x44, 0x00]),
    new Uint8Array([0, 3]),
    new Uint8Array([0, 1, 0, 0, 0, 0, 0, 1]), be32(exifOffset), be32(exifPayload.length),
    new Uint8Array([0, 2, 0, 1, 0, 0, 0, 1]), be32(0), be32(xmpPayload.length),
    new Uint8Array([0, 3, 0, 0, 0, 0, 0, 1]), be32(exifOffset + exifPayload.length), be32(imagePayload.length),
  ));
  const buildMeta = (exifOffset) => full('meta', 0, cat(
    box('hdlr', new Uint8Array(4)),
    iinf,
    buildIloc(exifOffset),
    box('iprp', new Uint8Array(0)),
    box('idat', xmpPayload),
  ));
  const ftyp = box('ftyp', enc.encode('heic\0\0\0\0mif1'));
  const metaLength = buildMeta(0).length;
  const exifOffset = ftyp.length + metaLength + 8;
  const meta = buildMeta(exifOffset);
  const mdat = box('mdat', cat(exifPayload, imagePayload));
  const uuid = box('uuid', enc.encode('c2pa-manifest'));
  return cat(ftyp, meta, mdat, uuid);
}

function parseBoxes(bytes, start, end) {
  const boxes = [];
  let offset = start;
  while (offset + 8 <= end) {
    const size = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    assert(size >= 8 && offset + size <= end, `box size mismatch for ${type}`);
    boxes.push({ type, start: offset, size });
    offset += size;
  }
  assert(offset === end, 'boxes must exactly cover their parent');
  return boxes;
}

async function run() {
  for (let i = 0; i < 10; i++) {
    const input = jpegSample(i);
    const { bytes: out, actions } = stripJpeg(input);
    const after = scanJpeg(out);
    ok(`jpeg ${i} EXIF/XMP/IPTC/JUMBF removed`, !after.some((s) => s.action?.disposition === 'removed'));
    ok(`jpeg ${i} removed actions recorded`, actions.filter((a) => a.disposition === 'removed').length === 4);
    const iccIn = input.slice(input.indexOf(0xe2) - 1);
    const iccBefore = scanJpeg(input).find((s) => s.name === 'APP2 ICC');
    const iccAfter = after.find((s) => s.name === 'APP2 ICC');
    ok(`jpeg ${i} ICC bytes identical`, Buffer.from(input.slice(iccBefore.start, iccBefore.end)).equals(Buffer.from(out.slice(iccAfter.start, iccAfter.end))));
    void iccIn;
    const sosBefore = input.slice(scanJpeg(input).find((s) => s.marker === 0xda).start);
    const sosAfter = out.slice(after.find((s) => s.marker === 0xda).start);
    ok(`jpeg ${i} SOS tail byte-identical`, Buffer.from(sosBefore).equals(Buffer.from(sosAfter)));
    ok(`jpeg ${i} idempotent`, Buffer.from(stripJpeg(out).bytes).equals(Buffer.from(out)));
    const exifr = await import('exifr');
    const parse = exifr.parse ?? exifr.default.parse;
    const parsed = await parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength)).catch(() => ({}));
    ok(`jpeg ${i} independent exifr re-read has no Make`, !parsed || !parsed.Make);
  }

  for (let i = 0; i < 10; i++) {
    const input = pngSample(i);
    const { bytes: out } = stripPng(input);
    const after = scanPng(out);
    ok(`png ${i} text/eXIf/caBX removed`, !after.some((c) => ['tEXt', 'iTXt', 'zTXt', 'eXIf', 'caBX'].includes(c.type)));
    const idatBefore = scanPng(input).find((c) => c.type === 'IDAT');
    const idatAfter = after.find((c) => c.type === 'IDAT');
    ok(`png ${i} IDAT untouched`, Buffer.from(input.slice(idatBefore.start, idatBefore.end)).equals(Buffer.from(out.slice(idatAfter.start, idatAfter.end))));
    ok(`png ${i} iCCP kept`, after.some((c) => c.type === 'iCCP'));
    ok(`png ${i} idempotent`, Buffer.from(stripPng(out).bytes).equals(Buffer.from(out)));
  }

  for (let i = 0; i < 10; i++) {
    const input = webpSample(i);
    const { bytes: out } = stripWebp(input);
    const after = scanWebp(out);
    ok(`webp ${i} EXIF/XMP removed`, !after.some((c) => c.fourcc === 'EXIF' || c.fourcc === 'XMP '));
    const vp8x = after.find((c) => c.fourcc === 'VP8X');
    ok(`webp ${i} VP8X flags cleared`, (out[vp8x.start + 8] & 0x0c) === 0 && (out[vp8x.start + 8] & 0x20) === 0x20);
    const riffSize = new DataView(out.buffer, out.byteOffset + 4, 4).getUint32(0, true);
    ok(`webp ${i} RIFF size correct`, riffSize + 8 === out.length);
    ok(`webp ${i} idempotent`, Buffer.from(stripWebp(out).bytes).equals(Buffer.from(out)));
  }

  for (let i = 0; i < 10; i++) {
    const input = heicSample(i);
    const { bytes: out } = stripHeic(input);
    ok(`heic ${i} EXIF/XMP payload gone`, !includesBytes(out, enc.encode(`EXIFDATA_${i}`)) && !includesBytes(out, enc.encode('<xmp>heic</xmp>')));
    ok(`heic ${i} uuid removed`, !parseBoxes(out, 0, out.length).some((b) => b.type === 'uuid'));
    ok(`heic ${i} image data intact`, includesBytes(out, enc.encode(`IMAGE_DATA_${i}_UNTOUCHED`)));
    const meta = parseBoxes(out, 0, out.length).find((b) => b.type === 'meta');
    parseBoxes(out, meta.start + 12, meta.start + meta.size);
    ok(`heic ${i} box sizes consistent`, true);
    ok(`heic ${i} idempotent`, Buffer.from(stripHeic(out).bytes).equals(Buffer.from(out)));
  }

  const dispatch = await stripImage(jpegSample(0));
  ok('stripImage detects jpeg', dispatch.format === 'jpeg');
  ok('detectFormat heic', detectFormat(heicSample(0)) === 'heic');
  ok('detectFormat webp', detectFormat(webpSample(0)) === 'webp');
  ok('detectFormat png', detectFormat(pngSample(0)) === 'png');

  ok('validate multiple files', validateFiles([{ name: 'a.jpg', type: 'image/jpeg', size: 1 }, { name: 'b.jpg', type: 'image/jpeg', size: 1 }]).error === 'multiple_files');
  ok('validate too large', validateFiles([{ name: 'a.jpg', type: 'image/jpeg', size: MAX_FILE_BYTES + 1 }]).error === 'too_large');
  ok('validate wrong MIME', validateFiles([{ name: 'a.svg', type: 'image/svg+xml', size: 1 }]).error === 'unsupported_format');
  ok('validate empty type + .heic falls back to extension', validateFiles([{ name: 'IMG_1.HEIC', type: '', size: 1 }]).format === 'heic');
  ok('validate 50..100MB only warns', validateFiles([{ name: 'a.jpg', type: 'image/jpeg', size: 60 * 1024 * 1024 }]).sizeWarning === true);

  let model = reducer(initialModel, { type: 'select', fileName: 'a.jpg' });
  model = reducer(model, { type: 'inspect' });
  model = reducer(model, { type: 'stripped' });
  model = reducer(model, { type: 'reinspect' });
  model = reducer(model, { type: 'ready' });
  ok('reducer reaches report_ready', model.state === 'report_ready');
  ok('reducer error branch', reducer(initialModel, { type: 'invalid', error: 'too_large' }).error === 'too_large');

  console.log(`test-strip: ${passed} assertions passed`);
}

await run();
