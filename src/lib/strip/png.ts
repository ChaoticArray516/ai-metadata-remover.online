import { ascii, concat, type SegmentAction, type StripOutput } from './common';

export interface PngChunk {
  type: string;
  start: number;
  end: number;
  keyword?: string;
  action?: SegmentAction;
}

function readKeyword(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end && bytes[i] !== 0; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

export function scanPng(bytes: Uint8Array): PngChunk[] {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || signature.some((value, i) => bytes[i] !== value)) {
    throw new Error('Not a PNG file');
  }
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
    const length = view.getUint32(0);
    const type = ascii(bytes, offset + 4, 4);
    const end = offset + 12 + length;
    if (end > bytes.length) break;
    const chunk: PngChunk = { type, start: offset, end };
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') {
      chunk.keyword = readKeyword(bytes, offset + 8, end - 4);
      if (chunk.keyword === 'parameters' || chunk.keyword === 'workflow') {
        chunk.action = {
          group: 'Prompt & workflow text (AI generation settings)',
          name: `${type} (${chunk.keyword})`,
          disposition: 'removed',
          count: 1,
          note: 'Plain text, may contain your prompt',
        };
      } else if (chunk.keyword === 'XML:com.adobe.xmp') {
        chunk.action = { group: 'XMP', name: `${type} (XMP)`, disposition: 'removed', count: 1 };
      } else {
        chunk.action = { group: 'Other', name: `${type} (${chunk.keyword})`, disposition: 'removed', count: 1 };
      }
    } else if (type === 'eXIf') {
      chunk.action = { group: 'EXIF / TIFF', name: 'eXIf', disposition: 'removed', count: 1 };
    } else if (type === 'caBX') {
      chunk.action = {
        group: 'Content Credentials (C2PA)',
        name: 'caBX (JUMBF manifest)',
        disposition: 'removed',
        count: 1,
        note: 'manifest segment removed',
      };
    } else if (type === 'iCCP') {
      chunk.action = {
        group: 'ICC color profile',
        name: 'iCCP',
        disposition: 'left untouched (not inspected)',
        count: 1,
      };
    }
    chunks.push(chunk);
    offset = end;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function stripPng(bytes: Uint8Array): StripOutput {
  const chunks = scanPng(bytes);
  const parts: Uint8Array[] = [bytes.slice(0, 8)];
  const actions: SegmentAction[] = [];
  for (const chunk of chunks) {
    if (chunk.action) actions.push(chunk.action);
    if (chunk.action?.disposition === 'removed') continue;
    parts.push(bytes.slice(chunk.start, chunk.end));
  }
  return { bytes: concat(parts), actions };
}
