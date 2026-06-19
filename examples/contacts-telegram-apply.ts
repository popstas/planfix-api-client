/**
 * Apply the cleaned telegram values from
 * data/contacts-telegram-fix/telegram-cleanup-llm.csv back into Planfix.
 *
 * SAFE BY DEFAULT: runs as a dry-run unless --apply is passed. For every
 * contact it compares each field's current value with its *_new value and only
 * sends the fields that actually changed.
 *
 * Field mapping:
 *   telegram_new      -> standard field `telegram`
 *   email_new         -> standard field `email`
 *   emails_extra_new  -> standard field `additionalEmailAddresses`
 *   phones_new        -> standard field `phones` (type 1)
 *   contact_person_new-> custom field 385
 *   whatsapp_new      -> custom field 893
 *   comments_new      -> custom field 895
 *
 * Usage:
 *   tsx examples/contacts-telegram-apply.ts            # dry run (default)
 *   tsx examples/contacts-telegram-apply.ts --apply    # really write
 *   tsx examples/contacts-telegram-apply.ts --limit 20 # first 20 contacts
 */
import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const DEFAULT_SRC = 'data/contacts-telegram-fix/telegram-cleanup-llm.csv';

const CF_CONTACT_PERSON = 385;
const CF_WHATSAPP = 893;
const CF_COMMENTS = 895;

interface Options { apply: boolean; limit: number; src: string; }

function parseArgs(args: string[]): Options {
  const o: Options = { apply: false, limit: 0, src: DEFAULT_SRC };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--apply') o.apply = true;
    else if (args[i] === '--dryRun') o.apply = false;
    else if (args[i] === '--limit') o.limit = Number(args[++i]);
    else if (args[i] === '--src') o.src = String(args[++i]);
  }
  return o;
}

function parseCsv(s: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else {
      if (c === '"') q = true;
      else if (c === ',') { cur.push(f); f = ''; }
      else if (c === '\n') { cur.push(f); rows.push(cur); cur = []; f = ''; }
      else if (c === '\r') { /* skip */ }
      else f += c;
    }
  }
  if (f.length || cur.length) { cur.push(f); rows.push(cur); }
  return rows;
}

function esc(v: string): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const norm = (s: string) => (s ?? '').trim();
const splitList = (s: string) => norm(s).split(/;\s*/).filter(Boolean);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const config: Configuration = loadConfig();
  const api = new ContactApi(config);

  const rows = parseCsv(fs.readFileSync(opts.src, 'utf-8'));
  const head = rows.shift()!;
  const I = (n: string) => head.indexOf(n);
  const get = (r: string[], n: string) => r[I(n)] ?? '';
  const LOG = opts.src.replace(/\.csv$/, '') + '-apply-log.csv';

  console.log(`Source: ${opts.src}`);
  console.log(`Mode: ${opts.apply ? 'APPLY (writing to Planfix)' : 'DRY RUN'}${opts.limit ? `, limit ${opts.limit}` : ''}`);

  const logRows: string[] = ['contact_id,url,changed_fields,result,note'];
  let processed = 0;
  let withChanges = 0;
  let written = 0;
  let failed = 0;

  for (const r of rows) {
    if (opts.limit && processed >= opts.limit) break;
    processed++;

    const id = get(r, 'contact_id');
    const url = get(r, 'url');
    const changed: string[] = [];
    const contactRequest: any = {};
    const customFieldData: any[] = [];

    // standard fields
    if (norm(get(r, 'telegram_new')) !== norm(get(r, 'telegram'))) {
      contactRequest.telegram = norm(get(r, 'telegram_new'));
      changed.push(`telegram="${contactRequest.telegram}"`);
    }
    if (norm(get(r, 'email_new')) !== norm(get(r, 'email'))) {
      contactRequest.email = norm(get(r, 'email_new'));
      changed.push(`email="${contactRequest.email}"`);
    }
    if (norm(get(r, 'emails_extra_new')) !== norm(get(r, 'emails_extra'))) {
      contactRequest.additionalEmailAddresses = splitList(get(r, 'emails_extra_new'));
      changed.push(`emails_extra=[${contactRequest.additionalEmailAddresses.join('; ')}]`);
    }
    if (norm(get(r, 'phones_new')) !== norm(get(r, 'phones'))) {
      contactRequest.phones = splitList(get(r, 'phones_new')).map(number => ({ number, type: 1 }));
      changed.push(`phones=[${splitList(get(r, 'phones_new')).join('; ')}]`);
    }

    // custom fields
    const cf = (id385: number, newCol: string, oldCol: string, label: string) => {
      if (norm(get(r, newCol)) !== norm(get(r, oldCol))) {
        customFieldData.push({ field: { id: id385 }, value: norm(get(r, newCol)) });
        changed.push(`${label}="${norm(get(r, newCol))}"`);
      }
    };
    cf(CF_CONTACT_PERSON, 'contact_person_new', 'contact_person', 'contact_person');
    cf(CF_WHATSAPP, 'whatsapp_new', 'whatsapp', 'whatsapp');
    cf(CF_COMMENTS, 'comments_new', 'comments', 'comments');

    if (!changed.length) {
      logRows.push([id, url, '', 'skip', 'no change'].map(esc).join(','));
      continue;
    }
    withChanges++;
    if (customFieldData.length) contactRequest.customFieldData = customFieldData;

    if (!opts.apply) {
      console.log(`[DRY] #${id}: ${changed.join(' | ')}`);
      logRows.push([id, url, changed.join(' | '), 'dry-run', ''].map(esc).join(','));
      continue;
    }

    try {
      await api.postContactById({ id: String(id), contactRequest, silent: true });
      written++;
      console.log(`[OK] #${id}: ${changed.join(' | ')}`);
      logRows.push([id, url, changed.join(' | '), 'ok', ''].map(esc).join(','));
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[ERR] #${id}: ${msg}`);
      logRows.push([id, url, changed.join(' | '), 'error', msg].map(esc).join(','));
    }
  }

  fs.writeFileSync(LOG, logRows.join('\n') + '\n', 'utf-8');
  console.log(`\nProcessed: ${processed} | with changes: ${withChanges} | ${opts.apply ? `written: ${written}, failed: ${failed}` : 'dry-run (nothing written)'}`);
  console.log(`Log: ${LOG}`);
}

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}

if (isMainModule()) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
