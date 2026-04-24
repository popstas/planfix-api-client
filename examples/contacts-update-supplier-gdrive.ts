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
}

interface CsvRow {
  contactId: number;
  contactNumber: string;
  emailsRaw: string;
}

interface Stats {
  totalRows: number;
  skippedEmptyEmail: number;
  skippedInvalidId: number;
  matched: number;
  needUpdate: number;
  updated: number;
  errors: number;
}

const defaultCsv = 'data/contacts-suppliers.csv';
const defaultFieldId = 867;

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;

function parseArgs(args: string[]): Options {
  const options: Options = {
    csv: defaultCsv,
    fieldId: defaultFieldId,
    limit: 0,
    dryRun: false,
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
    }
  }

  if (!options.csv) {
    throw new Error('csv is required');
  }
  if (!options.fieldId) {
    throw new Error('fieldId is required');
  }
  if (!Number.isFinite(options.limit) || options.limit < 0) {
    throw new Error('limit must be a non-negative number');
  }

  return options;
}

function parseCsvLine(line: string): string[] {
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

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map(v => v.trim());
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

  const headers = parseCsvLine(lines[0]);
  const contactIndex = headers.indexOf('Номер');
  const emailIndex = headers.indexOf('Email');
  if (contactIndex === -1) {
    throw new Error('CSV header "Номер" not found');
  }
  if (emailIndex === -1) {
    throw new Error('CSV header "Email" not found');
  }

  const rows: CsvRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) {
      continue;
    }
    const values = parseCsvLine(line);
    const contactNumber = (values[contactIndex] ?? '').trim();
    const emailsRaw = (values[emailIndex] ?? '').trim();

    const contactId = Number(contactNumber);
    if (!Number.isFinite(contactId)) {
      rows.push({ contactId: NaN, contactNumber, emailsRaw });
      continue;
    }

    rows.push({ contactId, contactNumber, emailsRaw });
  }

  return rows;
}

function splitEmailsByComma(input: string): string[] {
  return input
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
}

function normalizeForCompare(emails: string[]): string[] {
  return Array.from(new Set(emails.map(v => v.toLowerCase()))).sort();
}

function extractCurrentEmails(contact: any, fieldId: number): string[] {
  const customField = contact.customFieldData?.find((cf: any) => cf.field?.id === fieldId);
  if (!customField) {
    return [];
  }

  const value = customField.value as unknown;
  if (typeof value === 'string') {
    return splitEmailsByComma(value);
  }

  // Fallback for unexpected API shapes
  if (Array.isArray(value)) {
    return splitEmailsByComma(value.map(v => String(v ?? '')).join(','));
  }
  return [];
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

async function updateContactEmails(contactId: number, emails: string[]): Promise<void> {
  const params: PostContactByIdRequest = {
    id: String(contactId),
    contactRequest: {
      id: contactId,
      customFieldData: [
        {
          field: { id: opts.fieldId },
          value: emails.join(', ') as unknown as object,
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

export async function contactsUpdateSupplierGdrive() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);

  const stats: Stats = {
    totalRows: 0,
    skippedEmptyEmail: 0,
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
      console.warn(`Skip row: invalid contact id "${row.contactNumber}"`);
      continue;
    }

    const expectedEmails = splitEmailsByComma(row.emailsRaw);
    const expectedEmailsNormalized = normalizeForCompare(expectedEmails);
    if (expectedEmails.length === 0) {
      stats.skippedEmptyEmail++;
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
        console.warn(`Contact not found: ${row.contactId}`);
        continue;
      }
      contactName = contact.name ?? '(no name)';

      const currentEmails = extractCurrentEmails(contact, opts.fieldId);
      const currentEmailsNormalized = normalizeForCompare(currentEmails);
      if (arraysEqual(currentEmailsNormalized, expectedEmailsNormalized)) {
        stats.matched++;
        continue;
      }

      stats.needUpdate++;
      if (opts.dryRun) {
        console.log(
          `[DRY RUN] contact ${row.contactId} (${contactName}): "${currentEmails.join(', ')}" -> "${expectedEmails.join(', ')}"`,
        );
        continue;
      }

      await updateContactEmails(row.contactId, expectedEmails);
      stats.updated++;
      console.log(`Updated contact ${row.contactId} (${contactName})`);
    } catch (error) {
      stats.errors++;
      const details = await formatApiError(error);
      console.error(`Failed contact ${row.contactId} (${contactName}): ${details}`);
    }
  }

  console.log('\nDone.');
  console.log(`Total rows: ${stats.totalRows}`);
  console.log(`Skipped (empty email): ${stats.skippedEmptyEmail}`);
  console.log(`Skipped (invalid id): ${stats.skippedInvalidId}`);
  console.log(`Already matched: ${stats.matched}`);
  console.log(`Need update: ${stats.needUpdate}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Errors: ${stats.errors}`);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  contactsUpdateSupplierGdrive().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
