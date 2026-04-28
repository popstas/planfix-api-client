import { ContactApi } from '../src/generated';
import type { Configuration } from '../src/generated';
import type { PostContactByIdRequest } from '../src/generated/apis/ContactApi';
import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  csv: string;
  fieldId: number;
  limit: number;
  dryRun: boolean;
  logCsv: string;
}

interface CsvRow {
  contactId: number;
  contactNumberRaw: string;
  lastPaymentDate: string;
}

interface Stats {
  totalRows: number;
  skippedEmptyDate: number;
  skippedInvalidDate: number;
  skippedInvalidId: number;
  matched: number;
  needUpdate: number;
  updated: number;
  errors: number;
}

interface LogRow {
  date: string;
  level: string;
  contact_id: string;
  contact_name: string;
  current_value: string;
  expected_value: string;
  action: string;
  note: string;
}

const defaultCsv = 'data/contacts-last-payment-date.csv';
const defaultFieldId = 873;
const defaultLogCsv = 'data/contacts-last-payment-date-log.csv';

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
const logRows: LogRow[] = [];

function parseArgs(args: string[]): Options {
  const options: Options = {
    csv: defaultCsv,
    fieldId: defaultFieldId,
    limit: 0,
    dryRun: false,
    logCsv: defaultLogCsv,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv') {
      options.csv = args[++i];
    } else if (arg === '--fieldId') {
      options.fieldId = Number(args[++i]);
    } else if (arg === '--limit') {
      options.limit = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    } else if (arg === '--logCsv') {
      options.logCsv = args[++i];
    }
  }

  if (!options.csv) {
    throw new Error('csv is required');
  }
  if (!options.fieldId) {
    throw new Error('fieldId is required');
  }
  if (!options.logCsv) {
    throw new Error('logCsv is required');
  }
  if (!Number.isFinite(options.limit) || options.limit < 0) {
    throw new Error('limit must be a non-negative number');
  }

  return options;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map(v => v.trim());
}

function isValidDateFormat(value: string): boolean {
  return /^\d{2}-\d{2}-\d{4}$/.test(value);
}

function parseCsv(filePath: string): CsvRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseDelimitedLine(lines[0], ';');
  const contactIndex = headers.indexOf('Клиент номер');
  const dateIndex = headers.indexOf('Дата');

  if (contactIndex === -1) {
    throw new Error('CSV header "Клиент номер" not found');
  }
  if (dateIndex === -1) {
    throw new Error('CSV header "Дата" not found');
  }

  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) {
      continue;
    }

    const values = parseDelimitedLine(line, ';');
    const contactNumberRaw = (values[contactIndex] ?? '').trim();
    const lastPaymentDate = (values[dateIndex] ?? '').trim();
    const contactId = Number(contactNumberRaw);

    if (!Number.isFinite(contactId)) {
      rows.push({ contactId: NaN, contactNumberRaw, lastPaymentDate });
      continue;
    }

    rows.push({ contactId, contactNumberRaw, lastPaymentDate });
  }

  return rows;
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeLogCsv(filePath: string, rows: LogRow[]) {
  if (!rows.length) {
    return;
  }

  ensureDirectory(filePath);
  const headers: (keyof LogRow)[] = [
    'date',
    'level',
    'contact_id',
    'contact_name',
    'current_value',
    'expected_value',
    'action',
    'note',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(header => csvEscape(String(row[header] ?? ''))).join(','));
  }

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf-8');
}

function addLogRow(row: Omit<LogRow, 'date'>) {
  logRows.push({
    date: new Date().toISOString(),
    ...row,
  });
}

function getCurrentFieldValue(contact: any, fieldId: number): string {
  const customField = contact.customFieldData?.find((cf: any) => cf.field?.id === fieldId);
  if (!customField) {
    return '';
  }

  const value = customField.value as unknown;
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

async function updateContactDate(contactId: number, value: string): Promise<void> {
  const params: PostContactByIdRequest = {
    id: String(contactId),
    contactRequest: {
      id: contactId,
      customFieldData: [
        {
          field: { id: opts.fieldId },
          value: value as unknown as object,
        },
      ],
    },
  };

  await contactApi.postContactById(params);
}

async function formatApiError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const errAny = error as any;
  const status = errAny?.response?.status;
  const statusText = errAny?.response?.statusText;
  const responseData = errAny?.response?.data;
  let responseText = '';

  if (errAny?.response?.text && !errAny?.response?.bodyUsed) {
    try {
      responseText = await errAny.response.text();
    } catch {
      responseText = '';
    }
  }

  if (status != null || responseData != null) {
    const statusPart = status != null ? `status ${status}${statusText ? ` ${statusText}` : ''}` : '';
    let dataPart = '';

    if (typeof responseData === 'string') {
      dataPart = responseData;
    } else if (responseData != null) {
      try {
        dataPart = JSON.stringify(responseData);
      } catch {
        dataPart = String(responseData);
      }
    }

    return [error.message, statusPart, dataPart, responseText].filter(Boolean).join(' | ');
  }

  return [error.message, responseText].filter(Boolean).join(' | ');
}

export async function contactsUpdateLastPaymentDate() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);

  const stats: Stats = {
    totalRows: 0,
    skippedEmptyDate: 0,
    skippedInvalidDate: 0,
    skippedInvalidId: 0,
    matched: 0,
    needUpdate: 0,
    updated: 0,
    errors: 0,
  };

  if (opts.dryRun) {
    console.log('DRY RUN MODE: no data will be modified');
  }

  console.log(`Reading CSV: ${opts.csv}`);
  const rows = parseCsv(opts.csv);
  stats.totalRows = rows.length;
  console.log(`Rows loaded: ${rows.length}`);
  if (opts.limit > 0) {
    console.log(`Limit: ${opts.limit}`);
  }

  const rowsToProcess = opts.limit > 0 ? rows.slice(0, opts.limit) : rows;
  for (const row of rowsToProcess) {
    if (!Number.isFinite(row.contactId)) {
      stats.skippedInvalidId++;
      const note = `Invalid contact id "${row.contactNumberRaw}"`;
      console.warn(`Skip row: ${note}`);
      addLogRow({
        level: 'warn',
        contact_id: row.contactNumberRaw,
        contact_name: '',
        current_value: '',
        expected_value: row.lastPaymentDate,
        action: 'skip_invalid_id',
        note,
      });
      continue;
    }

    if (!row.lastPaymentDate) {
      stats.skippedEmptyDate++;
      const note = 'Empty date in CSV';
      addLogRow({
        level: 'warn',
        contact_id: String(row.contactId),
        contact_name: '',
        current_value: '',
        expected_value: '',
        action: 'skip_empty_date',
        note,
      });
      continue;
    }

    if (!isValidDateFormat(row.lastPaymentDate)) {
      stats.skippedInvalidDate++;
      const note = `Invalid date format "${row.lastPaymentDate}" (expected DD-MM-YYYY)`;
      console.warn(`Skip row for ${row.contactId}: ${note}`);
      addLogRow({
        level: 'warn',
        contact_id: String(row.contactId),
        contact_name: '',
        current_value: '',
        expected_value: row.lastPaymentDate,
        action: 'skip_invalid_date',
        note,
      });
      continue;
    }

    let contactName = '(unknown)';
    try {
      const response = await contactApi.getContactById({
        id: String(row.contactId),
        fields: `id,name,${opts.fieldId}`,
      });
      const contact = response.contact;
      if (!contact?.id) {
        stats.errors++;
        const note = 'Contact not found';
        console.warn(`Contact not found: ${row.contactId}`);
        addLogRow({
          level: 'error',
          contact_id: String(row.contactId),
          contact_name: '',
          current_value: '',
          expected_value: row.lastPaymentDate,
          action: 'contact_not_found',
          note,
        });
        continue;
      }

      contactName = contact.name ?? '(no name)';
      const currentValue = getCurrentFieldValue(contact, opts.fieldId);
      if (currentValue === row.lastPaymentDate) {
        stats.matched++;
        addLogRow({
          level: 'info',
          contact_id: String(row.contactId),
          contact_name: contactName,
          current_value: currentValue,
          expected_value: row.lastPaymentDate,
          action: 'already_matched',
          note: 'No changes needed',
        });
        continue;
      }

      stats.needUpdate++;
      if (opts.dryRun) {
        console.log(
          `[DRY RUN] contact ${row.contactId} (${contactName}): "${currentValue}" -> "${row.lastPaymentDate}"`,
        );
        addLogRow({
          level: 'info',
          contact_id: String(row.contactId),
          contact_name: contactName,
          current_value: currentValue,
          expected_value: row.lastPaymentDate,
          action: 'dry_run_update',
          note: 'Would update value',
        });
        continue;
      }

      await updateContactDate(row.contactId, row.lastPaymentDate);
      stats.updated++;
      console.log(`Updated contact ${row.contactId} (${contactName})`);
      addLogRow({
        level: 'info',
        contact_id: String(row.contactId),
        contact_name: contactName,
        current_value: currentValue,
        expected_value: row.lastPaymentDate,
        action: 'updated',
        note: 'Value updated',
      });
    } catch (error) {
      stats.errors++;
      const details = await formatApiError(error);
      console.error(`Failed contact ${row.contactId} (${contactName}): ${details}`);
      addLogRow({
        level: 'error',
        contact_id: String(row.contactId),
        contact_name: contactName,
        current_value: '',
        expected_value: row.lastPaymentDate,
        action: 'failed',
        note: details,
      });
    }
  }

  writeLogCsv(opts.logCsv, logRows);

  console.log('\nDone.');
  console.log(`Total rows: ${stats.totalRows}`);
  console.log(`Skipped (empty date): ${stats.skippedEmptyDate}`);
  console.log(`Skipped (invalid date): ${stats.skippedInvalidDate}`);
  console.log(`Skipped (invalid id): ${stats.skippedInvalidId}`);
  console.log(`Already matched: ${stats.matched}`);
  console.log(`Need update: ${stats.needUpdate}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Log saved: ${opts.logCsv}`);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  contactsUpdateLastPaymentDate().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
