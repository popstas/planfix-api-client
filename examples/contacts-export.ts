import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  limit: number;
  out: string;
}

const COLUMNS = [
  'contact_id',
  'url',
  'name',
  'contact_person',
  'group',
  'phones',
  'email',
  'emails_extra',
  'telegram',
  'telegram_old',
  'telegram_id',
  'telegram_id_system',
  'whatsapp',
  'comments',
  'do_not_contact',
  'updated_date',
] as const;

type Row = Record<(typeof COLUMNS)[number], string>;

const pageSize = 100;
const defaultOut = 'data/contacts-telegram-fix/contacts-export.csv';

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let account: string;

function parseArgs(args: string[]): Options {
  const options: Options = { limit: 0, out: defaultOut };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--limit') options.limit = Number(args[++i]);
    else if (a === '--out') options.out = String(args[++i]);
  }
  return options;
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeCell(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeHeader(filePath: string) {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, COLUMNS.join(',') + '\n', 'utf-8');
}

function appendRows(filePath: string, rows: Row[]) {
  if (!rows.length) return;
  const lines = rows.map(r => COLUMNS.map(c => escapeCell(r[c])).join(','));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function cfValue(contact: any, id: number): string {
  const v = contact.customFieldData?.find((f: any) => f.field?.id === id)?.value;
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function joinPhones(phones: any): string {
  if (!Array.isArray(phones)) return '';
  return phones.map((p: any) => p?.number ?? '').filter(Boolean).join('; ');
}

function joinEmails(emails: any): string {
  if (!Array.isArray(emails)) return '';
  return emails.filter(Boolean).join('; ');
}

function stripTme(s: any): string {
  if (typeof s !== 'string') return '';
  return s.replace(/^https?:\/\/t\.me\//i, '');
}

function buildRow(c: any): Row {
  return {
    contact_id: String(c.id ?? ''),
    url: account ? `https://${account}.planfix.com/contact/${c.id}` : '',
    name: [c.name, c.midname, c.lastname].filter(Boolean).join(' ').trim(),
    contact_person: cfValue(c, 385),
    group: c.group?.name ?? '',
    phones: joinPhones(c.phones),
    email: c.email ?? '',
    emails_extra: joinEmails(c.additionalEmailAddresses),
    telegram: stripTme(c.telegram),
    telegram_old: cfValue(c, 383),
    telegram_id: cfValue(c, 899),
    telegram_id_system: c.telegramId ?? '',
    whatsapp: cfValue(c, 893),
    comments: cfValue(c, 895),
    do_not_contact: cfValue(c, 777),
    updated_date: c.dateOfLastUpdate?.date ?? '',
  };
}

export async function contactsExport() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  account = process.env.PLANFIX_ACCOUNT ?? '';

  const fields = [
    'id', 'name', 'midname', 'lastname',
    'telegram', 'telegramId',
    'email', 'additionalEmailAddresses',
    'phones', 'group', 'dateOfLastUpdate',
    385, 383, 899, 893, 895, 777,
  ].join(',');

  writeHeader(opts.out);

  let offset = 0;
  let exported = 0;

  while (true) {
    const res = await contactApi.getContactList({
      getContactListRequest: { offset, pageSize, fields },
    });
    const contacts = res.contacts ?? [];
    if (contacts.length === 0) break;

    let batch = contacts;
    if (opts.limit > 0 && exported + batch.length > opts.limit) {
      batch = batch.slice(0, opts.limit - exported);
    }

    appendRows(opts.out, batch.map(buildRow));
    exported += batch.length;

    console.log(`offset=${offset}: exported ${exported}`);

    if (opts.limit > 0 && exported >= opts.limit) break;
    if (contacts.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`\nDone. Exported ${exported} contact(s) to ${opts.out}`);
}

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}

if (isMainModule()) {
  contactsExport().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
