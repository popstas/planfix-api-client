import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  apply: boolean;
  limit: number;
  input: string;
}

interface LogRow {
  contact_id: string;
  url: string;
  result: string;
  note: string;
}

const notesFieldId = 895;
const defaultInput = 'data/telegram-cleanup-review.csv';
const logPath = 'data/telegram-review-backup-log.csv';

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let account: string;

function parseArgs(args: string[]): Options {
  const options: Options = { apply: false, limit: 0, input: defaultInput };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') options.apply = true;
    else if (args[i] === '--limit') options.limit = Number(args[++i]);
    else if (args[i] === '--input') options.input = args[++i];
  }
  return options;
}

/** Minimal RFC-4180 CSV parser (handles quotes and embedded newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\r') {
        // skip
      } else if (ch === '"') inQuotes = true;
      else field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function escapeCsv(value: string) {
  if (value == null) return '';
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function writeCsv(filePath: string, rows: LogRow[]) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const headers: (keyof LogRow)[] = ['contact_id', 'url', 'result', 'note'];
  const lines = [headers.join(',')];
  rows.forEach(r => lines.push(headers.map(h => escapeCsv(r[h] ?? '')).join(',')));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function existingNote(contact: any): string {
  const cf = contact.customFieldData?.find((c: any) => c.field?.id === notesFieldId);
  const v = cf?.value;
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export async function contactsTelegramReviewBackup() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  account = process.env.PLANFIX_ACCOUNT ?? '';

  const rows = parseCsv(fs.readFileSync(opts.input, 'utf-8'));
  const header = rows.shift() ?? [];
  const idIdx = header.indexOf('contact_id');
  const rawIdx = header.indexOf('telegram_raw');
  if (idIdx < 0 || rawIdx < 0) {
    throw new Error(`Unexpected CSV header in ${opts.input}: ${header.join(',')}`);
  }

  const log: LogRow[] = [];
  const counts: Record<string, number> = {};
  let processed = 0;

  for (const row of rows) {
    const id = (row[idIdx] ?? '').trim();
    const raw = row[rawIdx] ?? '';
    if (!id) continue;
    processed++;
    const url = account ? `https://${account}.planfix.com/contact/${id}` : '';

    if (raw.trim() === '') {
      counts['skip-empty'] = (counts['skip-empty'] ?? 0) + 1;
      log.push({ contact_id: id, url, result: 'skip-empty', note: 'no telegram value' });
    } else if (!opts.apply) {
      counts['would-write'] = (counts['would-write'] ?? 0) + 1;
      log.push({ contact_id: id, url, result: 'would-write', note: `895 <= ${raw}` });
    } else {
      try {
        const resp: any = await contactApi.getContactById({ id, fields: `id,${notesFieldId}` });
        const contact = resp.contact ?? resp;
        if (existingNote(contact)) {
          counts['skip-exists'] = (counts['skip-exists'] ?? 0) + 1;
          log.push({ contact_id: id, url, result: 'skip-exists', note: '895 already set' });
        } else {
          await contactApi.postContactById({
            id,
            contactRequest: {
              customFieldData: [
                { field: { id: notesFieldId }, value: raw as unknown as object },
              ],
            },
            silent: true,
          });
          counts['updated'] = (counts['updated'] ?? 0) + 1;
          log.push({ contact_id: id, url, result: 'updated', note: `895 <= ${raw}` });
          console.log(`Updated contact ${id}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        counts['error'] = (counts['error'] ?? 0) + 1;
        log.push({ contact_id: id, url, result: 'error', note: message });
        console.error(`Failed contact ${id}: ${message}`);
      }
    }

    if (opts.limit > 0 && processed >= opts.limit) break;
  }

  if (opts.apply) writeCsv(logPath, log);

  console.log(`\nMode: ${opts.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Input: ${opts.input}`);
  console.log(`Processed: ${processed}`);
  Object.entries(counts).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  if (opts.apply) console.log(`\nLog written to ${logPath}`);
}

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}

if (isMainModule()) {
  contactsTelegramReviewBackup().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
