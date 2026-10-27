import { scanJpeg } from '../strip/jpeg';
import { scanPng } from '../strip/png';
import { scanWebp } from '../strip/webp';
import { readXmpFields, type XmpFields } from '../strip/xmp';
import { detectFormat, type ImageFormat } from '../strip/strip';
import { PARSER_VERSION, type SegmentAction } from '../strip/common';

export interface Inspection {
  format: ImageFormat;
  parserVersion: string;
  actions: SegmentAction[];
  xmp: XmpFields;
  hasJumbf: boolean;
}

export function inspectBytes(bytes: Uint8Array): Inspection {
  const format = detectFormat(bytes);
  let actions: SegmentAction[] = [];
  if (format === 'jpeg') {
    actions = scanJpeg(bytes).flatMap((segment) => (segment.action ? [segment.action] : []));
  } else if (format === 'png') {
    actions = scanPng(bytes).flatMap((chunk) => (chunk.action ? [chunk.action] : []));
  } else if (format === 'webp') {
    actions = scanWebp(bytes).flatMap((chunk) => (chunk.action ? [chunk.action] : []));
  } else {
    // HEIC: exifr cannot read HEIC XMP; until real iPhone samples are verified
    // (MASTER_SOP §11-6), HEIC XMP display stays "not checked" and basic
    // inspection reports no field detail for this format.
    actions = [];
  }
  const hasJumbf = actions.some((action) => action.group === 'Content Credentials (C2PA)');
  return {
    format,
    parserVersion: PARSER_VERSION,
    actions,
    xmp: format === 'jpeg' ? readXmpFields(bytes) : {},
    hasJumbf,
  };
}

export const INSPECT_GROUPS = [
  'Device',
  'Dates',
  'GPS',
  'Software',
  'XMP',
  'IPTC',
  'Content Credentials',
  'Prompt & workflow text',
  'Other',
] as const;

export const EMPTY_FIELDS_MESSAGE = 'Nothing to show. This file did not carry these fields.';
export const DETECTION_HOOK = 'Nothing found does not mean the file is not AI';
