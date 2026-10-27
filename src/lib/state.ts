export type ToolState =
  | 'idle'
  | 'selected'
  | 'inspecting'
  | 'stripped'
  | 'reinspecting'
  | 'report_ready'
  | 'error';

export type ToolError = 'unsupported_format' | 'too_large' | 'read_error' | 'strip_error' | 'multiple_files';

export interface ToolModel {
  state: ToolState;
  error?: ToolError;
  slow: boolean;
  fileName?: string;
}

export type ToolEvent =
  | { type: 'select'; fileName: string }
  | { type: 'invalid'; error: ToolError }
  | { type: 'inspect' }
  | { type: 'stripped' }
  | { type: 'reinspect' }
  | { type: 'ready' }
  | { type: 'fail'; error: ToolError }
  | { type: 'slow' }
  | { type: 'reset' };

export const initialModel: ToolModel = { state: 'idle', slow: false };

export function reducer(model: ToolModel, event: ToolEvent): ToolModel {
  switch (event.type) {
    case 'select':
      return { state: 'selected', slow: false, fileName: event.fileName };
    case 'invalid':
      return { state: 'error', error: event.error, slow: false };
    case 'inspect':
      return { ...model, state: 'inspecting' };
    case 'stripped':
      return { ...model, state: 'stripped' };
    case 'reinspect':
      return { ...model, state: 'reinspecting' };
    case 'ready':
      return { ...model, state: 'report_ready', slow: false };
    case 'fail':
      return { state: 'error', error: event.error, slow: false };
    case 'slow':
      return { ...model, slow: true };
    case 'reset':
      return initialModel;
    default:
      return model;
  }
}

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const WARN_FILE_BYTES = 50 * 1024 * 1024;

const MIME_FORMATS: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
};

const EXT_FORMATS: Record<string, string> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
};

export interface Validation {
  ok: boolean;
  error?: ToolError;
  format?: string;
  sizeWarning?: boolean;
}

export function validateFiles(files: { name: string; type: string; size: number }[]): Validation {
  if (files.length !== 1) return { ok: false, error: 'multiple_files' };
  const file = files[0];
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'too_large' };
  let format = MIME_FORMATS[file.type];
  if (!format && file.type === '') {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    format = EXT_FORMATS[ext];
  }
  if (!format) return { ok: false, error: 'unsupported_format' };
  return { ok: true, format, sizeWarning: file.size > WARN_FILE_BYTES };
}
