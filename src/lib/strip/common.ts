export const ENGINE_VERSION = '0.1.0';
export const PARSER_VERSION = ENGINE_VERSION;

export type Disposition =
  | 'removed'
  | 'kept on purpose'
  | 'left untouched (not inspected)'
  | 'rebuilt'
  | 'could not parse';

export type SegmentGroup =
  | 'EXIF / TIFF'
  | 'XMP'
  | 'IPTC'
  | 'ICC color profile'
  | 'JFIF / format headers'
  | 'Content Credentials (C2PA)'
  | 'Prompt & workflow text (AI generation settings)'
  | 'Other';

export interface SegmentAction {
  group: SegmentGroup;
  name: string;
  disposition: Disposition;
  count: number;
  note?: string;
}

export interface StripOutput {
  bytes: Uint8Array;
  actions: SegmentAction[];
}

export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function concat(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = '';
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}
