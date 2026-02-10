import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';

interface Options {
  telegramOldId: number;
  dryRun: boolean;
}

interface LogRow {
  date: string;
  level: string;
  contact_id: string;
  contact_number: string;
  telegram_old_value: string;
  action: string;
  note: string;
}

const pageSize = 100;
const defaultLogPath = 'data/contacts-migrate-telegram-log.csv';

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let logRows: LogRow[] = [];
let statsChanged = 0;
let statsSkipped = 0;

function parseArgs(args: string[]): Options {
  const options: Options = {
    telegramOldId: 383,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--telegramOldId') {
      options.telegramOldId = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }

  if (!options.telegramOldId || !Number.isFinite(options.telegramOldId)) {
    throw new Error('telegramOldId is required and must be a number');
  }

  return options;
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeCsv(filePath: string, rows: LogRow[]) {
  if (!rows.length) {
    return;
  }

  const headers: (keyof LogRow)[] = [
    'date',
    'level',
    'contact_id',
    'contact_number',
    'telegram_old_value',
    'action',
    'note',
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

  const lines: string[] = [];
  const fileExists = fs.existsSync(filePath);
  let addHeader = true;

  if (fileExists) {
    const stats = fs.statSync(filePath);
    addHeader = stats.size === 0;
  }

  if (addHeader) {
    lines.push(headers.join(','));
  }

  rows.forEach(row => {
    lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
  });

  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function recordLogRow(row: Omit<LogRow, 'date'> & { date?: string }) {
  logRows.push({
    date: row.date ?? new Date().toISOString(),
    level: row.level,
    contact_id: row.contact_id,
    contact_number: row.contact_number,
    telegram_old_value: row.telegram_old_value,
    action: row.action,
    note: row.note,
  });
}

function extractTelegramValue(contact: any, telegramOldId: number): string | null {
  const field = contact.customFieldData?.find((cf: any) => cf.field?.id === telegramOldId);
  const raw = field?.value;
  if (raw == null || raw === '') {
    return null;
  }
  const s = String(raw).trim().replace(/^@/, '').trim();
  return s || null;
}

async function processContact(contact: any, telegramValue: string): Promise<void> {
  const contactNumber = String(contact.id ?? '');
  if (opts.dryRun) {
    console.log(
      `[DRY RUN] Would update contact ${contact.id}: telegram = "${telegramValue}"`,
    );
    recordLogRow({
      level: 'info',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      telegram_old_value: telegramValue,
      action: 'dry-run',
      note: `Would set telegram to ${telegramValue}`,
    });
    return;
  }

  try {
    await contactApi.postContactById({
      id: String(contact.id),
      contactRequest: { telegram: telegramValue },
      silent: true,
    });
    console.log(`Updated contact ${contact.id}: telegram = "${telegramValue}"`);
    statsChanged++;
    recordLogRow({
      level: 'info',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      telegram_old_value: telegramValue,
      action: 'update',
      note: `Set telegram to ${telegramValue}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to update contact ${contact.id}: ${message}`);
    recordLogRow({
      level: 'error',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      telegram_old_value: telegramValue,
      action: 'error',
      note: `Update failed: ${message}`,
    });
    process.exit(1);
  }
}

export async function contactsMigrateTelegram() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  logRows = [];
  statsChanged = 0;
  statsSkipped = 0;

  const fields = `id,name,midname,lastname,${opts.telegramOldId},telegram,telegramId`;
  const filters = [
    { type: 4101 as const, operator: 'notequal' as const, value: '', field: opts.telegramOldId },
    { type: 4226 as const, operator: 'equal' as const, value: '' },
  ];

  try {
    console.log(`telegramOldId=${opts.telegramOldId}, dryRun=${opts.dryRun}`);
    let round = 0;

    while (true) {
      round++;
      const response = await contactApi.getContactList({
        getContactListRequest: {
          offset: 0,
          pageSize,
          fields,
          filters,
        },
      });

      const contacts = response.contacts ?? [];
      if (contacts.length === 0) {
        console.log(`No more contacts to migrate (round ${round}).`);
        break;
      }

      console.log(`Round ${round}: found ${contacts.length} contact(s) to process.`);

      for (const contact of contacts) {
        const rawValue = extractTelegramValue(contact, opts.telegramOldId);
        if (!rawValue) {
          statsSkipped++;
          recordLogRow({
            level: 'warning',
            contact_id: String(contact.id),
            contact_number: String(contact.id),
            telegram_old_value: '',
            action: 'skip',
            note: 'No value in telegramOldId field',
          });
          continue;
        }
        await processContact(contact, rawValue);
      }
    }

    console.log(`\nCompleted. Updated: ${statsChanged}, Skipped: ${statsSkipped}`);
  } finally {
    writeCsv(defaultLogPath, logRows);
    console.log(`Log written to ${defaultLogPath}`);
    logRows = [];
  }
}

function isMainModule(): boolean {
  try {
    if (typeof require !== 'undefined' && require.main === module) return true;
  } catch {
    // ESM: no require
  }
  if (typeof process !== 'undefined' && process.argv[1]) {
    return process.argv[1].endsWith('contacts-migrate-telegram.ts') || process.argv[1].endsWith('contacts-migrate-telegram.js');
  }
  return false;
}

if (isMainModule()) {
  contactsMigrateTelegram().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
