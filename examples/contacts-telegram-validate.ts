import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  limit: number;
}

interface ReportRow {
  contact_id: string;
  url: string;
  name: string;
  telegram_raw: string;
  normalized: string;
  category: string;
  reasons: string;
  suggested_clean: string;
}

const pageSize = 100;
const defaultReportPath = 'data/telegram-invalid.csv';
const telegramFilterType = 4226;
const validUsername = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let account: string;

function parseArgs(args: string[]): Options {
  const options: Options = { limit: 0 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') {
      options.limit = Number(args[++i]);
    }
  }
  return options;
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeCsv(filePath: string, rows: ReportRow[]) {
  const headers: (keyof ReportRow)[] = [
    'contact_id',
    'url',
    'name',
    'telegram_raw',
    'normalized',
    'category',
    'reasons',
    'suggested_clean',
  ];

  const escape = (value: string) => {
    if (value == null) {
      return '';
    }
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  ensureDirectory(filePath);

  const lines: string[] = [headers.join(',')];
  rows.forEach(row => {
    lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
  });

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * Strip @, t.me/ and tg:// prefixes, returning the candidate username.
 */
function normalizeTelegram(raw: string): string {
  let s = String(raw).trim();
  s = s.replace(/^@/, '').trim();
  s = s.replace(/^(https?:\/\/)?t\.me\//i, '');
  s = s.replace(/^tg:\/\/resolve\?domain=/i, '');
  // drop a trailing slash or query left over from a link
  s = s.replace(/[/?].*$/, '');
  return s.trim();
}

/**
 * Returns null if the value is a valid Telegram username, otherwise the list of
 * reason tags describing why it is invalid.
 */
function classify(raw: string, normalized: string): string[] {
  const reasons: string[] = [];

  if (normalized === '' || /^[-—._]+$/.test(normalized)) {
    return ['empty'];
  }
  if (validUsername.test(normalized)) {
    return [];
  }

  if (/[а-яё]/i.test(normalized)) reasons.push('cyrillic');
  if (/\s/.test(raw.trim())) reasons.push('spaces');
  if (/^\+?[\d\s()\-]+$/.test(raw.trim())) reasons.push('phone');
  if (/https?:\/\//i.test(raw) || raw.includes('/')) reasons.push('url');
  if (normalized.length < 5) reasons.push('too_short');
  if (normalized.length > 32) reasons.push('too_long');
  if (!/^[A-Za-z]/.test(normalized)) reasons.push('bad_start');
  if (/[^A-Za-z0-9_]/.test(normalized)) reasons.push('invalid_chars');

  if (reasons.length === 0) reasons.push('other');
  return reasons;
}

export async function contactsTelegramValidate() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  account = process.env.PLANFIX_ACCOUNT ?? '';

  const fields = 'id,name,midname,lastname,telegram';
  const filters = [
    { type: telegramFilterType as const, operator: 'notequal' as const, value: '' },
  ];

  const report: ReportRow[] = [];
  const categoryCounts: Record<string, number> = {};
  let scanned = 0;
  let offset = 0;

  while (true) {
    const response = await contactApi.getContactList({
      getContactListRequest: { offset, pageSize, fields, filters },
    });

    const contacts = response.contacts ?? [];
    if (contacts.length === 0) {
      break;
    }

    for (const contact of contacts) {
      scanned++;
      const raw = contact.telegram == null ? '' : String(contact.telegram);
      const normalized = normalizeTelegram(raw);
      const reasons = classify(raw, normalized);

      if (reasons.length > 0) {
        const category = reasons[0];
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

        const suggested = validUsername.test(normalized) ? normalized : '';
        const name = [contact.name, (contact as any).midname, contact.lastname]
          .filter(Boolean)
          .join(' ')
          .trim();

        report.push({
          contact_id: String(contact.id ?? ''),
          url: account ? `https://${account}.planfix.com/contact/${contact.id}` : '',
          name,
          telegram_raw: raw,
          normalized,
          category,
          reasons: reasons.join(';'),
          suggested_clean: suggested,
        });
      }

      if (opts.limit > 0 && scanned >= opts.limit) {
        break;
      }
    }

    console.log(`offset=${offset}: scanned ${scanned}, invalid ${report.length}`);

    if (opts.limit > 0 && scanned >= opts.limit) {
      break;
    }
    if (contacts.length < pageSize) {
      break;
    }
    offset += pageSize;
  }

  writeCsv(defaultReportPath, report);

  console.log(`\nScanned (with telegram set): ${scanned}`);
  console.log(`Invalid: ${report.length}`);
  console.log('By category:');
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`));
  console.log(`\nReport written to ${defaultReportPath}`);
}

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}

if (isMainModule()) {
  contactsTelegramValidate().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
