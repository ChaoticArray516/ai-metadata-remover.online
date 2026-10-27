import { ascii, concat, type SegmentAction, type StripOutput } from './common';

export interface JpegSegment {
  marker: number;
  name: string;
  start: number;
  end: number;
  action?: SegmentAction;
}

const XMP_NS = 'http://ns.adobe.com/xap/1.0/';

function startsWith(bytes: Uint8Array, offset: number, text: string): boolean {
  return ascii(bytes, offset, text.length) === text;
}

export function scanJpeg(bytes: Uint8Array): JpegSegment[] {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Not a JPEG file');
  }
  const segments: JpegSegment[] = [];
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    if (marker === 0xda) {
      segments.push({ marker, name: 'SOS', start: offset, end: bytes.length });
      break;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) break;
    const end = offset + 2 + length;
    if (end > bytes.length) break;
    const dataStart = offset + 4;
    let name = `APP${marker - 0xe0}`;
    let action: SegmentAction | undefined;
    if (marker === 0xe1) {
      if (startsWith(bytes, dataStart, 'Exif')) {
        name = 'APP1 EXIF';
        action = { group: 'EXIF / TIFF', name: 'APP1 (EXIF)', disposition: 'removed', count: 1 };
      } else if (startsWith(bytes, dataStart, XMP_NS)) {
        name = 'APP1 XMP';
        action = { group: 'XMP', name: 'APP1 (XMP)', disposition: 'removed', count: 1 };
      } else if (startsWith(bytes, dataStart, 'http://ns.adobe.com/xmp/extension/')) {
        name = 'APP1 XMP extension';
        action = { group: 'XMP', name: 'APP1 (extended XMP)', disposition: 'removed', count: 1 };
      }
    } else if (marker === 0xed) {
      name = 'APP13 IPTC';
      action = { group: 'IPTC', name: 'APP13 (IPTC)', disposition: 'removed', count: 1 };
    } else if (marker === 0xeb) {
      name = 'APP11 JUMBF';
      action = {
        group: 'Content Credentials (C2PA)',
        name: 'APP11 (JUMBF manifest)',
        disposition: 'removed',
        count: 1,
        note: 'manifest segment removed',
      };
    } else if (marker === 0xe2) {
      name = 'APP2 ICC';
      action = {
        group: 'ICC color profile',
        name: 'APP2 (ICC)',
        disposition: 'kept on purpose',
        count: 1,
        note: 'kept for color accuracy',
      };
    } else if (marker === 0xe0) {
      name = 'APP0 JFIF';
      action = {
        group: 'JFIF / format headers',
        name: 'APP0 (JFIF)',
        disposition: 'kept on purpose',
        count: 1,
      };
    }
    segments.push({ marker, name, start: offset, end, action });
    offset = end;
  }
  return segments;
}

export function stripJpeg(bytes: Uint8Array): StripOutput {
  const segments = scanJpeg(bytes);
  const parts: Uint8Array[] = [bytes.slice(0, 2)];
  const actions: SegmentAction[] = [];
  for (const segment of segments) {
    if (segment.marker === 0xda) {
      parts.push(bytes.slice(segment.start));
      break;
    }
    if (segment.action) actions.push(segment.action);
    if (segment.action?.disposition === 'removed') continue;
    parts.push(bytes.slice(segment.start, segment.end));
  }
  return { bytes: concat(parts), actions };
}
