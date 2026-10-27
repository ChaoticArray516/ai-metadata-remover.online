let pending: Promise<typeof import('exifr')> | undefined;

function load(): Promise<typeof import('exifr')> {
  return (pending ??= import('exifr'));
}

export async function readFullFields(bytes: Uint8Array): Promise<Record<string, unknown>> {
  const exifr = await load();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const parsed = await exifr.parse(buffer as ArrayBuffer);
  return (parsed ?? {}) as Record<string, unknown>;
}
