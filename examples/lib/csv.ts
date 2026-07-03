/**
 * CSV helpers shared by example scripts.
 *
 * Writing follows the AGENTS.md audit-log convention (reference:
 * change-manager-in-subtasks.ts): header only when the file is new/empty,
 * escaped values, appendFileSync. Reading is a proper RFC-4180 parser that
 * handles quoted values, "" escapes and embedded newlines — do not use naive
 * `line.split(',')` in new scripts.
 */

import * as fs from 'fs';
import * as path from 'path';

/** mkdir -p for the parent directory of a file path. */
export function ensureDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Quote a CSV value when it contains a comma, quote or line break. */
export function escapeCsvValue(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Append rows to a CSV audit log; write the header only when the file is
 * new/empty so repeated runs keep appending to the same reviewable log.
 */
export function appendCsvLog(filePath: string, headers: string[], rows: string[][]): void {
  if (!rows.length) return;
  ensureDirectory(filePath);

  const addHeader = !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
  const lines = addHeader ? [headers.join(',')] : [];
  for (const row of rows) lines.push(row.map(escapeCsvValue).join(','));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/** Overwrite a CSV file with a header and rows (exports/reports family). */
export function writeCsvFile(filePath: string, headers: string[], rows: string[][]): void {
  ensureDirectory(filePath);
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(row.map(escapeCsvValue).join(','));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

export interface CsvLogger {
  add(row: string[]): void;
  /** Flush pending rows to disk. Call in `finally` so partial runs keep their log. */
  flush(): void;
  readonly count: number;
}

/** Batch log rows in memory and append them in one write on flush(). */
export function createCsvLogger(filePath: string, headers: string[]): CsvLogger {
  const pending: string[][] = [];
  let written = 0;
  return {
    add(row: string[]): void {
      pending.push(row);
    },
    flush(): void {
      if (!pending.length) return;
      appendCsvLog(filePath, headers, pending);
      written += pending.length;
      pending.length = 0;
    },
    get count(): number {
      return written + pending.length;
    },
  };
}

export interface ParseCsvOptions {
  delimiter?: ',' | ';';
}

/**
 * RFC-4180 CSV parser: quoted values, "" escapes, embedded delimiters and
 * newlines, \r\n line endings, BOM. Returns rows of cells.
 */
export function parseCsv(text: string, opts: ParseCsvOptions = {}): string[][] {
  const delimiter = opts.delimiter ?? ',';
  const src = text.replace(/^﻿/, '');

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }

  // Drop fully empty trailing lines.
  return rows.filter(r => r.length > 1 || r[0] !== '');
}

export interface CsvFile {
  headers: string[];
  rows: Record<string, string>[];
}

/** Read a CSV file and key each row by the header names. */
export function readCsvFile(filePath: string, opts: ParseCsvOptions = {}): CsvFile {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  const raw = parseCsv(fs.readFileSync(filePath, 'utf-8'), opts);
  if (!raw.length) return { headers: [], rows: [] };

  const headers = raw[0].map(h => h.trim());
  const rows = raw.slice(1).map(cells => {
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? '';
    });
    return record;
  });
  return { headers, rows };
}
