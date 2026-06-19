/**
 * Assemble LLM cleanup results + original data into the preview CSV
 * data/contacts-telegram-fix/telegram-cleanup-llm.csv (each field next to its
 * *_new value). Read-only.
 *
 * Corrections applied on top of the raw LLM output:
 *  - phone category: a phone in telegram stays in telegram, cleaned (+digits),
 *    NOT moved out and NOT replaced with '-' (rules 1 & 5).
 *  - comments never shrink: base = original comments with a leading
 *    "https://t.me/" stripped, plus any new @handles the LLM surfaced.
 *  - emails_extra restored from contacts-clients-with-contact.csv; a 2nd+ email
 *    (incl. one extracted from the telegram text) goes to emails_extra.
 */
import * as fs from 'fs';

const dir = 'data/contacts-telegram-fix';
const INPUT = `${dir}/_spaces-input.json`;
const RESULTS = `${dir}/results`;
const CLIENTS = `${dir}/contacts-clients-with-contact.csv`;
const DST = `${dir}/telegram-cleanup-llm.csv`;

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
  const s = String(v).replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normPhone(raw: string): string {
  let d = (raw.match(/\d/g) || []).join('');
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  if (d.length === 10 && d.startsWith('9')) d = '7' + d;
  if (d.length < 7 || d.length > 15) return '';
  return '+' + d;
}

function stripLeadingTme(s: string): string {
  return (s || '').replace(/^\s*https?:\/\/t\.me\//i, '').trim();
}

function handles(s: string): string[] {
  const out: string[] = [];
  const re = /@[A-Za-z][A-Za-z0-9_]{3,31}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s || ''))) out.push(m[0]);
  return out;
}

interface Src { id: string; name: string; telegram: string; contact_person: string; whatsapp: string; phones: string; email: string; comments: string; }
interface Res { id: string; new_telegram: string; new_contact_person: string; new_whatsapp: string; new_phones: string; new_comments: string; new_email: string; category: string; note: string; }

function main() {
  const src: Src[] = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));

  // emails_extra (and comments) by id from the clients CSV
  const crows = parseCsv(fs.readFileSync(CLIENTS, 'utf-8'));
  const chead = crows.shift()!;
  const cI = (n: string) => chead.indexOf(n);
  const extraById = new Map<string, string>();
  for (const r of crows) extraById.set(r[cI('contact_id')], r[cI('emails_extra')] ?? '');

  const resById = new Map<string, Res>();
  for (const f of fs.readdirSync(RESULTS).filter(x => /^result-\d+\.json$/.test(x))) {
    const obj = JSON.parse(fs.readFileSync(`${RESULTS}/${f}`, 'utf-8'));
    for (const r of obj.results ?? []) resById.set(String(r.id), r);
  }

  const cols = [
    'contact_id', 'name',
    'telegram', 'telegram_new',
    'contact_person', 'contact_person_new',
    'whatsapp', 'whatsapp_new',
    'phones', 'phones_new',
    'email', 'email_new',
    'emails_extra', 'emails_extra_new',
    'comments', 'comments_new',
    'category', 'note', 'url',
  ];

  const out: string[] = [cols.join(',')];
  const counts: Record<string, number> = {};
  let missing = 0;

  for (const s of src) {
    const r = resById.get(String(s.id));
    if (!r) { missing++; continue; }
    counts[r.category] = (counts[r.category] || 0) + 1;

    // --- telegram: phone stays in telegram, cleaned ---
    let telegram_new = r.new_telegram;
    let contact_person_new = r.new_contact_person || s.contact_person;
    let whatsapp_new = r.new_whatsapp || s.whatsapp;
    let phones_new = r.new_phones || s.phones;
    if (r.category === 'phone') {
      // phone bound to telegram: take it from the telegram text, else from the
      // contact's phones field ("по номеру" cases where the number lives there)
      const p = normPhone(s.telegram) || normPhone(s.phones);
      telegram_new = p || '-';
      // pure phone: don't move it out / don't invent rep
      contact_person_new = s.contact_person;
      phones_new = s.phones;
      whatsapp_new = s.whatsapp;
    }

    // --- comments: never shrink; strip leading t.me; add new @handles ---
    const base = stripLeadingTme(s.comments);
    const adds = handles(r.new_comments).filter(h => !base.includes(h.replace(/^@/, '')) && !base.includes(h));
    const comments_new = [base, ...adds].filter(Boolean).join('; ');

    // --- emails: collect all, primary in email, rest in emails_extra ---
    const origExtra = (extraById.get(String(s.id)) || '').split(/;\s*/).filter(Boolean);
    const all: string[] = [];
    const push = (e: string) => { const v = (e || '').trim(); if (v && /@/.test(v) && !all.includes(v)) all.push(v); };
    push(s.email);
    origExtra.forEach(push);
    if (r.new_email && r.new_email !== s.email) push(r.new_email);
    const email_new = all[0] ?? s.email ?? '';
    const emails_extra_new = all.slice(1).join('; ');

    const rec: Record<string, string> = {
      contact_id: s.id,
      name: s.name,
      telegram: s.telegram,
      telegram_new,
      contact_person: s.contact_person,
      contact_person_new,
      whatsapp: s.whatsapp,
      whatsapp_new,
      phones: s.phones,
      phones_new,
      email: s.email,
      email_new,
      emails_extra: extraById.get(String(s.id)) || '',
      emails_extra_new,
      comments: s.comments,
      comments_new,
      category: r.category,
      note: r.note,
      url: `https://${process.env.PLANFIX_ACCOUNT ?? 'tagilcity'}.planfix.com/contact/${s.id}`,
    };
    out.push(cols.map(c => esc(rec[c] ?? '')).join(','));
  }

  fs.writeFileSync(DST, out.join('\n') + '\n', 'utf-8');
  console.log(`Assembled ${src.length - missing}/${src.length} -> ${DST}`);
  if (missing) console.log(`MISSING: ${missing}`);
  console.log('By category:');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
}

main();
