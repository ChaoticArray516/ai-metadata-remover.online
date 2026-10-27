import { ascii, yieldToMain, type StripOutput } from './common';
import { stripJpeg } from './jpeg';
import { stripPng } from './png';
import { stripWebp } from './webp';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic';

export function detectFormat(bytes: Uint8Array): ImageFormat {
  if (bytes.length > 12 && bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg';
  if (bytes.length > 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return 'png';
  if (bytes.length > 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  if (bytes.length > 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (['heic', 'heix', 'hevc', 'heif', 'mif1', 'msf1', 'heis', 'avif'].includes(brand)) return 'heic';
  }
  throw new Error('unsupported_format');
}

export async function stripImage(bytes: Uint8Array): Promise<StripOutput & { format: ImageFormat }> {
  const format = detectFormat(bytes);
  await yieldToMain();
  if (format === 'jpeg') return { ...stripJpeg(bytes), format };
  if (format === 'png') return { ...stripPng(bytes), format };
  if (format === 'webp') return { ...stripWebp(bytes), format };
  const { stripHeic } = await import('./heic');
  await yieldToMain();
  return { ...stripHeic(bytes), format };
}
