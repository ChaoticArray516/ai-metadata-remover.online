import { ENGINE_VERSION, PARSER_VERSION } from '../strip/common';
import type { FieldDiff } from '../inspect/compare';
import { renderReportHtml, type ReportData, type ReportState } from './template';

export interface ReportInput {
  fileName: string;
  format: string;
  originalBytes: number;
  outputBytes: number;
  sha256: string;
  diff: FieldDiff;
  durationMs: number;
  cleanedAt?: string;
}

export interface BuiltReport {
  data: ReportData;
  html: string;
  json: string;
  htmlBlob: Blob;
  jsonBlob: Blob;
}

export function reportStateFor(diff: FieldDiff): ReportState {
  if (diff.remaining > 0) return 'S4';
  if (diff.leftUntouched > 0) return 'S3';
  return 'S2';
}

export function buildReport(input: ReportInput): BuiltReport {
  const data: ReportData = {
    schemaVersion: 'v1.0',
    reportVersion: 'v1.1',
    engineVersion: ENGINE_VERSION,
    parserVersion: PARSER_VERSION,
    state: reportStateFor(input.diff),
    fileName: input.fileName.split(/[\\/]/).pop() ?? input.fileName,
    format: input.format,
    originalBytes: input.originalBytes,
    outputBytes: input.outputBytes,
    sha256: input.sha256,
    cleanedAt: input.cleanedAt ?? new Date().toISOString(),
    durationMs: input.durationMs,
    rows: input.diff.rows,
  };
  const html = renderReportHtml(data);
  const json = JSON.stringify(data, null, 2);
  return {
    data,
    html,
    json,
    htmlBlob: new Blob([html], { type: 'text/html' }),
    jsonBlob: new Blob([json], { type: 'application/json' }),
  };
}
