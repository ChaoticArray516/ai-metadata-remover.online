import { ascii, concat, type SegmentAction, type StripOutput } from './common';

const FLAG_EXIF = 0x08;
const FLAG_XMP = 0x04;

export interface WebpChunk {
  fourcc: string;
  start: number;
  end: number;
  action?: SegmentAction;
}

export function scanWebp(bytes: Uint8Array): WebpChunk[] {
  if (bytes.length < 16 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    throw new Error('Not a WebP file');
  }
  const chunks: WebpChunk[] = [];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = ascii(bytes, offset, 4);
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4);
    const size = view.getUint32(0, true);
    const end = offset + 8 + size + (size % 2);
    if (end > bytes.length) break;
    const chunk: WebpChunk = { fourcc, start: offset, end };
    if (fourcc === 'EXIF') {
      chunk.action = { group: 'EXIF / TIFF', name: 'EXIF', disposition: 'removed', count: 1 };
    } else if (fourcc === 'XMP ') {
      chunk.action = { group: 'XMP', name: 'XMP ', disposition: 'removed', count: 1 };
    } else if (fourcc === 'ICCP') {
      chunk.action = {
        group: 'ICC color profile',
        name: 'ICCP',
        disposition: 'kept on purpose',
        count: 1,
        note: 'kept for color accuracy',
      };
    }
    chunks.push(chunk);
    offset = end;
  }
  return chunks;
}

export function stripWebp(bytes: Uint8Array): StripOutput {
  const chunks = scanWebp(bytes);
  const parts: Uint8Array[] = [];
  const actions: SegmentAction[] = [];
  for (const chunk of chunks) {
    if (chunk.action) actions.push(chunk.action);
    if (chunk.action?.disposition === 'removed') continue;
    if (chunk.fourcc === 'VP8X') {
      const patched = bytes.slice(chunk.start, chunk.end);
      patched[8] &= ~(FLAG_EXIF | FLAG_XMP);
      parts.push(patched);
      continue;
    }
    parts.push(bytes.slice(chunk.start, chunk.end));
  }
  const body = concat(parts);
  const header = bytes.slice(0, 12);
  new DataView(header.buffer, header.byteOffset + 4, 4).setUint32(0, 4 + body.length, true);
  return { bytes: concat([header, body]), actions };
}
