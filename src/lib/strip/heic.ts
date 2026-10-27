import { ascii, concat, type SegmentAction, type StripOutput } from './common';

interface Box {
  type: string;
  start: number;
  size: number;
  headerSize: number;
}

interface Extent {
  offset: number;
  length: number;
  absoluteStart: number;
}

interface IlocItem {
  id: number;
  constructionMethod: number;
  baseOffset: number;
  extents: Extent[];
}

const XMP_CONTENT_TYPE = 'application/rdf+xml';

function parseBoxes(bytes: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
    let size = view.getUint32(0);
    const type = ascii(bytes, offset + 4, 4);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      size = Number(view.getBigUint64(8));
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) break;
    boxes.push({ type, start: offset, size, headerSize });
    offset += size;
  }
  return boxes;
}

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
}

function u16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readSizedInt(bytes: Uint8Array, offset: number, size: number): number {
  let value = 0;
  for (let i = 0; i < size; i++) value = value * 256 + bytes[offset + i];
  return value;
}

function writeSizedInt(out: number[], value: number, size: number): void {
  const tmp = new Array<number>(size);
  for (let i = size - 1; i >= 0; i--) {
    tmp[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  out.push(...tmp);
}

function makeBox(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  new DataView(out.buffer).setUint32(0, out.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function fullBoxPayload(bytes: Uint8Array, box: Box): Uint8Array {
  return bytes.slice(box.start + box.headerSize + 4, box.start + box.size);
}

function cstring(bytes: Uint8Array, start: number, end: number): { value: string; next: number } {
  let i = start;
  let value = '';
  while (i < end && bytes[i] !== 0) value += String.fromCharCode(bytes[i++]);
  return { value, next: i + 1 };
}

export function stripHeic(bytes: Uint8Array): StripOutput {
  const top = parseBoxes(bytes, 0, bytes.length);
  if (!top.some((box) => box.type === 'ftyp')) throw new Error('Not a HEIC file');
  const actions: SegmentAction[] = [];
  const removedRanges: { start: number; end: number }[] = [];
  const mdat = top.find((box) => box.type === 'mdat');
  const meta = top.find((box) => box.type === 'meta');
  const idat = meta
    ? parseBoxes(bytes, meta.start + meta.headerSize + 4, meta.start + meta.size).find((box) => box.type === 'idat')
    : undefined;
  const mdatPayloadStart = mdat ? mdat.start + mdat.headerSize : -1;
  const idatPayloadStart = idat ? idat.start + idat.headerSize : -1;

  const removedIds = new Set<number>();
  let removedExif = 0;
  let removedXmp = 0;

  let rebuiltMeta: Uint8Array | undefined;

  if (meta) {
    const children = parseBoxes(bytes, meta.start + meta.headerSize + 4, meta.start + meta.size);
    const iinf = children.find((box) => box.type === 'iinf');
    const iloc = children.find((box) => box.type === 'iloc');
    const keptItems: IlocItem[] = [];

    if (iinf) {
      const payloadStart = iinf.start + iinf.headerSize + 4;
      const version = bytes[iinf.start + iinf.headerSize];
      const countSize = version === 0 ? 2 : 4;
      const entriesStart = payloadStart + countSize;
      const infeBoxes = parseBoxes(bytes, entriesStart, iinf.start + iinf.size);
      const keptInfe: Box[] = [];
      for (const infe of infeBoxes) {
        if (infe.type !== 'infe') {
          keptInfe.push(infe);
          continue;
        }
        const infeVersion = bytes[infe.start + infe.headerSize];
        let cursor = infe.start + infe.headerSize + 4;
        const idSize = infeVersion === 2 ? 2 : 4;
        const id = readSizedInt(bytes, cursor, idSize);
        cursor += idSize + 2;
        const itemType = ascii(bytes, cursor, 4);
        cursor += 4;
        const nameEnd = cstring(bytes, cursor, infe.start + infe.size);
        cursor = nameEnd.next;
        let contentType = '';
        if (itemType === 'mime') {
          contentType = cstring(bytes, cursor, infe.start + infe.size).value;
        }
        if (itemType === 'Exif') {
          removedIds.add(id);
          removedExif++;
        } else if (itemType === 'mime' && contentType === XMP_CONTENT_TYPE) {
          removedIds.add(id);
          removedXmp++;
        } else {
          keptInfe.push(infe);
        }
      }
      if (removedIds.size > 0) {
        const entryCount = keptInfe.filter((box) => box.type === 'infe').length;
        const headBytes = Array.from(bytes.slice(payloadStart, entriesStart));
        const countArr: number[] = [];
        writeSizedInt(countArr, entryCount, countSize);
        headBytes.splice(0, countSize, ...countArr);
        const bodyParts: Uint8Array[] = [new Uint8Array(headBytes)];
        for (const box of keptInfe) bodyParts.push(bytes.slice(box.start, box.start + box.size));
        (iinf as Box & { rebuilt?: Uint8Array }).rebuilt = concat([
          bytes.slice(iinf.start + iinf.headerSize, payloadStart),
          concat(bodyParts),
        ]);
      }
    }

    if (iloc && removedIds.size > 0) {
      const boxStart = iloc.start + iloc.headerSize;
      const version = bytes[boxStart];
      const payloadStart = boxStart + 4;
      const sizes = bytes[payloadStart];
      const sizes2 = bytes[payloadStart + 1];
      const offsetSize = sizes >> 4;
      const lengthSize = sizes & 0x0f;
      const baseOffsetSize = sizes2 >> 4;
      const indexSize = version === 1 || version === 2 ? sizes2 & 0x0f : 0;
      let cursor = payloadStart + 2;
      const itemCount = version === 2 ? u32(bytes, cursor) : u16(bytes, cursor);
      cursor += version === 2 ? 4 : 2;
      const items: IlocItem[] = [];
      for (let n = 0; n < itemCount; n++) {
        const idSize = version === 2 ? 4 : 2;
        const id = readSizedInt(bytes, cursor, idSize);
        cursor += idSize;
        let constructionMethod = 0;
        if (version === 1 || version === 2) {
          constructionMethod = u16(bytes, cursor) & 0x0f;
          cursor += 2;
        }
        cursor += 2;
        const baseOffset = readSizedInt(bytes, cursor, baseOffsetSize);
        cursor += baseOffsetSize;
        const extentCount = u16(bytes, cursor);
        cursor += 2;
        const extents: Extent[] = [];
        for (let e = 0; e < extentCount; e++) {
          if ((version === 1 || version === 2) && indexSize > 0) cursor += indexSize;
          const extentOffset = readSizedInt(bytes, cursor, offsetSize);
          cursor += offsetSize;
          const extentLength = readSizedInt(bytes, cursor, lengthSize);
          cursor += lengthSize;
          const absoluteStart =
            constructionMethod === 0
              ? baseOffset + extentOffset
              : constructionMethod === 1
                ? idatPayloadStart + extentOffset
                : -1;
          extents.push({ offset: extentOffset, length: extentLength, absoluteStart });
        }
        items.push({ id, constructionMethod, baseOffset, extents });
      }

      for (const item of items) {
        if (!removedIds.has(item.id)) {
          keptItems.push(item);
          continue;
        }
        for (const extent of item.extents) {
          if (extent.absoluteStart < 0) throw new Error('Unsupported HEIC construction method');
          removedRanges.push({ start: extent.absoluteStart, end: extent.absoluteStart + extent.length });
        }
      }

      const shiftFor = (absoluteStart: number): number => {
        let delta = 0;
        for (const range of removedRanges) {
          if (range.end <= absoluteStart) delta += range.end - range.start;
        }
        return delta;
      };

      const out: number[] = [sizes, sizes2];
      const keptCount = keptItems.length;
      writeSizedInt(out, keptCount, version === 2 ? 4 : 2);
      for (const item of keptItems) {
        writeSizedInt(out, item.id, version === 2 ? 4 : 2);
        if (version === 1 || version === 2) {
          out.push(0, item.constructionMethod);
        }
        out.push(0, 0);
        writeSizedInt(out, 0, baseOffsetSize);
        writeSizedInt(out, item.extents.length, 2);
        for (const extent of item.extents) {
          if (indexSize > 0) writeSizedInt(out, 0, indexSize);
          const anchor = item.constructionMethod === 1 ? idatPayloadStart : 0;
          const newOffset = extent.absoluteStart - shiftFor(extent.absoluteStart) - anchor;
          writeSizedInt(out, newOffset, offsetSize);
          writeSizedInt(out, extent.length, lengthSize);
        }
      }
      (iloc as Box & { rebuilt?: Uint8Array }).rebuilt = concat([
        bytes.slice(boxStart, payloadStart),
        new Uint8Array(out),
      ]);
    }

    const metaParts: Uint8Array[] = [bytes.slice(meta.start + meta.headerSize, meta.start + meta.headerSize + 4)];
    for (const child of children) {
      const rebuilt = (child as Box & { rebuilt?: Uint8Array }).rebuilt;
      if (rebuilt) {
        metaParts.push(makeBox(child.type, rebuilt));
      } else if (child.type === 'idat' && removedRanges.length > 0) {
        const payloadStart = child.start + child.headerSize;
        const payloadEnd = child.start + child.size;
        const pieces: Uint8Array[] = [];
        let cursor = payloadStart;
        const ranges = removedRanges
          .filter((range) => range.start >= payloadStart && range.end <= payloadEnd)
          .sort((a, b) => a.start - b.start);
        for (const range of ranges) {
          pieces.push(bytes.slice(cursor, range.start));
          cursor = range.end;
        }
        pieces.push(bytes.slice(cursor, payloadEnd));
        metaParts.push(makeBox('idat', concat(pieces)));
      } else {
        metaParts.push(bytes.slice(child.start, child.start + child.size));
      }
    }
    rebuiltMeta = makeBox('meta', concat(metaParts));
  }

  if (removedExif > 0) {
    actions.push({ group: 'EXIF / TIFF', name: 'meta EXIF item', disposition: 'removed', count: removedExif });
  }
  if (removedXmp > 0) {
    actions.push({ group: 'XMP', name: 'meta XMP item', disposition: 'removed', count: removedXmp });
  }
  if (meta && parseBoxes(bytes, meta.start + meta.headerSize + 4, meta.start + meta.size)
    .some((box) => box.type === 'iprp')) {
    actions.push({
      group: 'ICC color profile',
      name: 'iprp/colr (color)',
      disposition: 'kept on purpose',
      count: 1,
      note: 'kept for color accuracy',
    });
  }

  const outParts: Uint8Array[] = [];
  for (const box of top) {
    if (box.type === 'uuid') {
      actions.push({
        group: 'Content Credentials (C2PA)',
        name: 'uuid (JUMBF manifest)',
        disposition: 'removed',
        count: 1,
        note: 'manifest segment removed',
      });
      continue;
    }
    if (box.type === 'meta' && rebuiltMeta) {
      outParts.push(rebuiltMeta);
      continue;
    }
    if (box.type === 'mdat' && removedRanges.length > 0) {
      const payloadStart = box.start + box.headerSize;
      const payloadEnd = box.start + box.size;
      const pieces: Uint8Array[] = [];
      let cursor = payloadStart;
      const ranges = removedRanges
        .filter((range) => range.start >= payloadStart && range.end <= payloadEnd)
        .sort((a, b) => a.start - b.start);
      for (const range of ranges) {
        pieces.push(bytes.slice(cursor, range.start));
        cursor = range.end;
      }
      pieces.push(bytes.slice(cursor, payloadEnd));
      outParts.push(bytes.slice(box.start, payloadStart), concat(pieces));
      const mdatHeader = outParts[outParts.length - 2];
      new DataView(mdatHeader.buffer, mdatHeader.byteOffset, 4).setUint32(0, box.headerSize + concat(pieces).length);
      continue;
    }
    outParts.push(bytes.slice(box.start, box.start + box.size));
  }
  return { bytes: concat(outParts), actions };
}
