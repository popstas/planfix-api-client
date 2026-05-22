import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  apply: boolean;
  limit: number;
}

interface PlanRow {
  contact_id: string;
  url: string;
  name: string;
  action: string;
  telegram_old: string;
  telegram_new: string;
  wa_893: string;
  note_895: string;
}

interface ReviewRow {
  contact_id: string;
  url: string;
  name: string;
  telegram_raw: string;
  reason: string;
}

interface LogRow {
  contact_id: string;
  url: string;
  action: string;
  result: string;
  note: string;
}

const pageSize = 100;
const planPath = 'data/telegram-cleanup-plan.csv';
const reviewPath = 'data/telegram-cleanup-review.csv';
const logPath = 'data/telegram-cleanup-log.csv';
const telegramFilterType = 4226;
const whatsappFieldId = 893;
const notesFieldId = 895;

const validUsername = /^[A-Za-z][A-Za-z0-9_]{4,31}$/;
// Detection runs against a whitespace-collapsed copy, so "вотс апп" / "Whats app" match too.
const whatsappRe = /whats?app|ватс?ап+|вотс?ап+|воц?ап|вац?ап|ватсаб|вотсаб/i;
// Removal keeps original spacing, so allow optional spaces between letters.
const whatsappStripRe =
  /w\s*h\s*a\s*t\s*s?\s*a\s*p\s*p?|в\s*[оа]\s*т\s*с?\s*а\s*п+|в\s*[оа]\s*ц\s*а\s*п|в\s*а\s*т\s*с\s*а\s*б/gi;
const phoneCandidateRe = /\+?\d[\d\s\-()]{5,}\d/g;
const usernameTokenRe = /[A-Za-z][A-Za-z0-9_]{4,}/;

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let account: string;

function parseArgs(args: string[]): Options {
  const options: Options = { apply: false, limit: 0 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') {
      options.apply = true;
    } else if (args[i] === '--limit') {
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

function escapeCsv(value: string) {
  if (value == null) return '';
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeCsv<T extends Record<string, string>>(
  filePath: string,
  headers: (keyof T)[],
  rows: T[],
) {
  ensureDirectory(filePath);
  const lines: string[] = [headers.join(',')];
  rows.forEach(row => {
    lines.push(headers.map(h => escapeCsv(row[h] ?? '')).join(','));
  });
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/** Strip @, t.me/ and tg:// prefixes, returning the candidate username. */
function normalizeTelegram(raw: string): string {
  let s = String(raw).trim();
  s = s.replace(/^@/, '').trim();
  s = s.replace(/^(https?:\/\/)?t\.me\//i, '');
  s = s.replace(/^tg:\/\/resolve\?domain=/i, '');
  s = s.replace(/[/?].*$/, '');
  return s.trim();
}

/** digits only; 11-digit 8XXXXXXXXXX -> +7XXXXXXXXXX; reject <10 or >15 digits. */
function normalizePhone(candidate: string): string | null {
  let d = candidate.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '8') {
    d = '7' + d.slice(1);
  }
  if (d.length < 10 || d.length > 15) {
    return null;
  }
  return '+' + d;
}

/** Distinct normalized phone numbers found in a value. */
function extractPhones(raw: string): string[] {
  const matches = raw.match(phoneCandidateRe) ?? [];
  const out: string[] = [];
  for (const m of matches) {
    const p = normalizePhone(m);
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

/** raw minus t.me/https prefixes, phone substrings and whatsapp keyword, collapsed. */
function leftoverText(raw: string): string {
  let s = String(raw);
  s = s.replace(/(https?:\/\/)?t\.me\//gi, ' ');
  s = s.replace(/tg:\/\/resolve\?domain=/gi, ' ');
  s = s.replace(phoneCandidateRe, ' ');
  s = s.replace(whatsappStripRe, ' ');
  s = s.replace(/[@]/g, ' ');
  // drop separators that carried meaning only between removed parts
  s = s.replace(/\s+/g, ' ').replace(/\s*[/,;|]+\s*/g, ' ');
  s = s.replace(/^[\s.\-—]+|[\s.\-—]+$/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  // a token must contain at least one letter to be meaningful
  return /[A-Za-zА-Яа-яЁё]/.test(s) ? s : '';
}

interface Decision {
  action: 'keep' | 'whatsapp' | 'telegram_by_number' | 'review';
  telegramNew?: string;
  wa?: string;
  note?: string;
  reason?: string;
}

function decide(raw: string): Decision {
  const trimmed = raw.trim();
  const normalized = normalizeTelegram(trimmed);

  if (validUsername.test(normalized)) {
    return { action: 'keep' };
  }

  const phones = extractPhones(trimmed);
  const hasKeyword = whatsappRe.test(trimmed.replace(/\s+/g, ''));
  const leftover = leftoverText(trimmed);
  const hasUsernameToken = usernameTokenRe.test(leftover);

  if (hasKeyword) {
    if (phones.length === 1 && !hasUsernameToken) {
      return { action: 'whatsapp', telegramNew: '-', wa: phones[0], note: leftover };
    }
    let reason = 'whatsapp_multiple_phones';
    if (phones.length === 0) reason = 'whatsapp_no_phone';
    else if (hasUsernameToken) reason = 'whatsapp_and_username';
    return { action: 'review', reason };
  }

  if (phones.length === 1 && !hasUsernameToken) {
    const note = ['Телеграм по номеру', leftover].filter(Boolean).join('; ');
    return { action: 'telegram_by_number', note };
  }

  let reason = 'other';
  if (phones.length > 1) reason = 'multiple_phones';
  else if (phones.length === 1 && hasUsernameToken) reason = 'phone_with_username';
  else if (normalized === '' || /^[-—._]+$/.test(normalized)) reason = 'empty';
  else if (/[А-Яа-яЁё]/.test(normalized)) reason = 'commentary';
  return { action: 'review', reason };
}

function customFieldValue(contact: any, fieldId: number): string {
  const cf = contact.customFieldData?.find((c: any) => c.field?.id === fieldId);
  const v = cf?.value;
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export async function contactsTelegramCleanup() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  account = process.env.PLANFIX_ACCOUNT ?? '';

  const fields = `id,name,midname,lastname,telegram,${whatsappFieldId},${notesFieldId}`;
  const filters = [
    { type: telegramFilterType as const, operator: 'notequal' as const, value: '' },
  ];

  const plan: PlanRow[] = [];
  const review: ReviewRow[] = [];
  const log: LogRow[] = [];
  const counts: Record<string, number> = {};
  let scanned = 0;
  let offset = 0;

  const urlOf = (id: unknown) =>
    account ? `https://${account}.planfix.com/contact/${id}` : '';
  const nameOf = (c: any) =>
    [c.name, c.midname, c.lastname].filter(Boolean).join(' ').trim();

  while (true) {
    const response = await contactApi.getContactList({
      getContactListRequest: { offset, pageSize, fields, filters },
    });
    const contacts = response.contacts ?? [];
    if (contacts.length === 0) break;

    for (const contact of contacts as any[]) {
      scanned++;
      const raw = contact.telegram == null ? '' : String(contact.telegram);
      const d = decide(raw);
      counts[d.action] = (counts[d.action] ?? 0) + 1;

      const id = String(contact.id ?? '');
      const url = urlOf(contact.id);
      const name = nameOf(contact);

      if (d.action === 'keep') {
        // untouched
      } else if (d.action === 'review') {
        review.push({ contact_id: id, url, name, telegram_raw: raw, reason: d.reason ?? '' });
      } else {
        const row: PlanRow = {
          contact_id: id,
          url,
          name,
          action: d.action,
          telegram_old: raw,
          telegram_new: d.telegramNew ?? raw,
          wa_893: d.wa ?? '',
          note_895: d.note ?? '',
        };
        plan.push(row);
        if (opts.apply) {
          await applyContact(contact, d, log);
        }
      }

      if (opts.limit > 0 && scanned >= opts.limit) break;
    }

    console.log(
      `offset=${offset}: scanned ${scanned}, plan ${plan.length}, review ${review.length}`,
    );

    if (opts.limit > 0 && scanned >= opts.limit) break;
    if (contacts.length < pageSize) break;
    offset += pageSize;
  }

  writeCsv<PlanRow>(
    planPath,
    ['contact_id', 'url', 'name', 'action', 'telegram_old', 'telegram_new', 'wa_893', 'note_895'],
    plan,
  );
  writeCsv<ReviewRow>(
    reviewPath,
    ['contact_id', 'url', 'name', 'telegram_raw', 'reason'],
    review,
  );
  if (opts.apply) {
    writeCsv<LogRow>(logPath, ['contact_id', 'url', 'action', 'result', 'note'], log);
  }

  console.log(`\nMode: ${opts.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Scanned: ${scanned}`);
  console.log('By action:');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\nPlan written to ${planPath} (${plan.length} rows)`);
  console.log(`Review written to ${reviewPath} (${review.length} rows)`);
  if (opts.apply) {
    const errors = log.filter(r => r.result === 'error').length;
    console.log(`Log written to ${logPath} (${log.length} rows, ${errors} errors)`);
  }
}

async function applyContact(contact: any, d: Decision, log: LogRow[]) {
  const id = String(contact.id ?? '');
  const url = account ? `https://${account}.planfix.com/contact/${contact.id}` : '';
  const contactRequest: any = {};
  const skipped: string[] = [];

  if (d.telegramNew != null && d.telegramNew !== String(contact.telegram ?? '')) {
    contactRequest.telegram = d.telegramNew;
  }

  const customFieldData: any[] = [];
  if (d.wa) {
    if (customFieldValue(contact, whatsappFieldId)) {
      skipped.push('893');
    } else {
      customFieldData.push({ field: { id: whatsappFieldId }, value: d.wa as unknown as object });
    }
  }
  if (d.note) {
    if (customFieldValue(contact, notesFieldId)) {
      skipped.push('895');
    } else {
      customFieldData.push({ field: { id: notesFieldId }, value: d.note as unknown as object });
    }
  }
  if (customFieldData.length) {
    contactRequest.customFieldData = customFieldData;
  }

  if (Object.keys(contactRequest).length === 0) {
    log.push({
      contact_id: id,
      url,
      action: d.action,
      result: 'skip-exists',
      note: `nothing to write (existing: ${skipped.join(',') || 'none'})`,
    });
    return;
  }

  try {
    await contactApi.postContactById({ id, contactRequest, silent: true });
    log.push({
      contact_id: id,
      url,
      action: d.action,
      result: 'updated',
      note: [
        contactRequest.telegram != null ? `telegram=${contactRequest.telegram}` : '',
        d.wa && !skipped.includes('893') ? `893=${d.wa}` : '',
        d.note && !skipped.includes('895') ? `895=${d.note}` : '',
        skipped.length ? `skipped=${skipped.join(',')}` : '',
      ]
        .filter(Boolean)
        .join('; '),
    });
    console.log(`Updated contact ${id} [${d.action}]`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.push({ contact_id: id, url, action: d.action, result: 'error', note: message });
    console.error(`Failed contact ${id}: ${message}`);
  }
}

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}

if (isMainModule()) {
  contactsTelegramCleanup().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
