/**
 * Read data/contacts-telegram-fix/telegram-with-spaces.csv and produce a
 * proposal CSV (telegram-spaces-actions.csv). For every contact it keeps the
 * original fields and adds a *_new column right next to each field that may
 * change (telegram, contact_person, whatsapp, phones, comments), so the
 * planned change is visible side by side. Read-only — writes only the local
 * proposal file, nothing is sent to Planfix.
 *
 * Rules (per cleanup spec):
 *   - "telegram by phone": telegram_new = clean +<digits>
 *   - whatsapp mention: number -> whatsapp_new, telegram_new = '-'
 *   - real @handle (or bare username): telegram_new = handle (no '@')
 *   - representative / different person name: -> contact_person_new, tg '-'
 *   - absence markers ("нет", "не указан", "нет профиля"...): telegram_new = '-'
 *   - '@' is always stripped from telegram_new
 */
import * as fs from 'fs';

const SRC = 'data/contacts-telegram-fix/telegram-with-spaces.csv';
const DST = 'data/contacts-telegram-fix/telegram-spaces-actions.csv';

function parseCsv(s: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let f = '';
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else {
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
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// strip unicode directional/invisible marks, unify dashes, collapse whitespace
function clean(s: string): string {
  return (s || '')
    .replace(/[‎‏‪-‮⁦-⁩]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normPhone(raw: string): { phone: string; guessed: boolean } {
  let d = (raw.match(/\d/g) || []).join('');
  let guessed = false;
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  // bare 10-digit RU mobile (starts with 9) -> prepend 7
  if (d.length === 10 && d.startsWith('9')) { d = '7' + d; guessed = true; }
  if (d.length < 7 || d.length > 15) return { phone: '', guessed: false };
  return { phone: '+' + d, guessed };
}

function extractPhones(s: string): { list: string[]; guessed: boolean } {
  const out = new Set<string>();
  let guessed = false;
  const re = /\+?\d[\d\s()\-]{5,}\d/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const r = normPhone(m[0]);
    if (r.phone) { out.add(r.phone); guessed = guessed || r.guessed; }
  }
  return { list: [...out], guessed };
}

// @handles, t.me/handles, and bare usernames that clearly are usernames
// (contain a digit or underscore -> not a plain personal name)
function extractHandles(s: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const at = /@([A-Za-z][A-Za-z0-9_]{3,31})/g;
  while ((m = at.exec(s))) out.add(m[1]);
  const tme = /t\.me\/([A-Za-z][A-Za-z0-9_]{3,31})/g;
  while ((m = tme.exec(s))) out.add(m[1]);
  const bare = /(?:^|[\s,;(])([A-Za-z][A-Za-z0-9]*[_0-9][A-Za-z0-9_]{2,})/g;
  while ((m = bare.exec(s))) {
    const w = m[1];
    if (!/^\+?\d+$/.test(w)) out.add(w); // not a pure number
  }
  return [...out];
}

function nameTokens(name: string): string[] {
  return clean(name).toLowerCase().split(/\s+/).filter(t => t.length >= 3);
}

const waKw = /whats?app|ватсап|вотсап|wa\.me/i;
const repKw = /представ|конт.{0,4}лиц|менеджер|жена|муж|мама|папа|дочь|сын|секретар|помощник|ассистент|будущ/i;
const hiddenKw = /скрыт|пересыла|по запросу|писать менеджеру|обращаться к менеджеру/i;
// pure "no telegram" markers -> just '-'
const absenceRe = /^(нет|не\s*т|пока\s*нет|нет\s*профил\w*|нет\s*тг|нет\s*телеграм\w*|не\s*указан\w*|не\s*указано|отсутству\w*|не\s*знаю|не\s*заполн\w*|—|-|\.)$/i;

function looksLikeName(s: string): boolean {
  const t = clean(s);
  if (!t) return false;
  if (/[.;:/@]|http|www/i.test(t)) return false; // sentence/url junk
  return t.split(/\s+/).length <= 4 && t.length <= 40;
}

interface Action {
  category: string;
  telegram_new: string;
  contact_person_new: string;
  whatsapp_new: string;
  phones_new: string;
  comments_new: string;
  needs_review: string;
  note: string;
}

function analyze(row: Record<string, string>): Action {
  const tg = clean(row.telegram);
  const { list: phones, guessed } = extractPhones(tg);
  const handles = extractHandles(tg);
  const tokens = nameTokens(row.name);
  const hasWa = waKw.test(tg);
  const hasRep = repKw.test(tg);
  const hasHidden = hiddenKw.test(tg);

  // residual text after removing phones / handles / urls
  const residual = clean(
    tg.replace(/\+?\d[\d\s()\-]{5,}\d/g, ' ')
      .replace(/@?[A-Za-z][A-Za-z0-9_]*[_0-9][A-Za-z0-9_]*/g, ' ')
      .replace(/@[A-Za-z][A-Za-z0-9_]{3,31}/g, ' ')
      .replace(/t\.me\/\S*/gi, ' ')
      .replace(/https?:\S*/gi, ' ')
      .replace(/[,;/()]/g, ' '),
  );

  const a: Action = {
    category: '',
    telegram_new: row.telegram,
    contact_person_new: row.contact_person,
    whatsapp_new: row.whatsapp,
    phones_new: row.phones,
    comments_new: row.comments,
    needs_review: 'yes',
    note: '',
  };

  const addPhone = (p: string) => {
    const cur = a.phones_new ? a.phones_new.split(/;\s*/).filter(Boolean) : [];
    if (!cur.includes(p)) cur.push(p);
    a.phones_new = cur.join('; ');
  };
  const stripAt = (s: string) => s.replace(/^@/, '');

  // 0) pure absence marker -> '-'
  if (absenceRe.test(tg)) {
    a.category = 'absence';
    a.telegram_new = '-';
    a.note = 'no telegram marker';
    a.needs_review = 'no';
    return a;
  }

  // 1) whatsapp explicitly mentioned with a number
  if (hasWa && phones.length) {
    a.category = 'whatsapp';
    a.whatsapp_new = a.whatsapp_new || phones[0];
    a.telegram_new = '-';
    a.note = `wa ${phones[0]} from telegram`;
    a.needs_review = phones.length > 1 || handles.length ? 'yes' : 'no';
    return a;
  }

  // 2) a real @handle / username present -> that is the telegram
  if (handles.length) {
    a.category = 'handle';
    a.telegram_new = stripAt(handles[0]);
    if (phones.length) { phones.forEach(addPhone); a.note += 'phone->phones; '; }
    if ((hasRep || (residual && !tokens.some(t => residual.toLowerCase().includes(t)))) && looksLikeName(residual)) {
      a.contact_person_new = a.contact_person_new || residual;
      a.note += `"${residual}"->contact_person; `;
    } else if (residual && !looksLikeName(residual)) {
      a.note += `residual:"${residual}"; `;
    }
    a.needs_review = handles.length > 1 || phones.length || residual.length >= 3 ? 'yes' : 'no';
    return a;
  }

  // 3) phone present, no handle -> "telegram by phone"
  if (phones.length) {
    a.category = 'phone';
    a.telegram_new = phones[0];
    if (phones.length > 1) phones.slice(1).forEach(addPhone);
    // NB: comments usually duplicate the old telegram link, so they cannot
    // corroborate the leftover text — only compare against name/contact_person.
    const elsewhere = (row.name + ' ' + row.contact_person).toLowerCase();
    let rev = phones.length > 1 || guessed;
    // a latin word left over may be a lost @handle -> always review
    const latinWord = residual.match(/[A-Za-z]{5,}/);
    if (latinWord) { a.note += `possible handle "${latinWord[0]}" in residual; `; rev = true; }
    if (residual.length >= 3 && !elsewhere.includes(residual.toLowerCase())) {
      if (looksLikeName(residual)) { a.contact_person_new = a.contact_person_new || residual; a.note += `"${residual}"->contact_person; `; }
      else a.note += `residual:"${residual}"; `;
      rev = true;
    }
    if (guessed) a.note += 'phone country code guessed; ';
    a.needs_review = rev ? 'yes' : 'no';
    return a;
  }

  // 4) hidden / forwarding markers
  if (hasHidden) {
    a.category = 'hidden';
    a.telegram_new = '-';
    a.note = 'hidden/forwarding marker';
    a.needs_review = 'yes';
    return a;
  }

  // 5) plain text / name, no phone no handle
  const sameAsClient = tokens.length > 0 && tokens.some(t => tg.toLowerCase().includes(t));
  if (sameAsClient) {
    a.category = 'client-name';
    a.telegram_new = '-';
    a.note = 'just client name, no handle';
    a.needs_review = 'yes';
    return a;
  }
  a.category = hasRep ? 'representative' : 'text/name';
  if (looksLikeName(tg)) {
    a.contact_person_new = a.contact_person_new || tg;
    a.telegram_new = '-';
    a.note = 'name differs from client -> contact_person';
  } else {
    a.telegram_new = '-';
    a.note = 'free text, manual distribution';
  }
  a.needs_review = 'yes';
  return a;
}

function main() {
  const rows = parseCsv(fs.readFileSync(SRC, 'utf-8'));
  const head = rows.shift()!;
  const I = (n: string) => head.indexOf(n);
  const get = (r: string[], n: string) => r[I(n)] ?? '';

  // output: original fields, with *_new placed right after each changeable field
  const outCols = [
    'contact_id', 'url', 'name', 'group',
    'telegram', 'telegram_new',
    'telegram_old',
    'contact_person', 'contact_person_new',
    'whatsapp', 'whatsapp_new',
    'phones', 'phones_new',
    'email', 'emails_extra',
    'comments', 'comments_new',
    'telegram_id', 'telegram_id_system', 'do_not_contact', 'updated_date',
    'category', 'needs_review', 'note',
  ];

  const counts: Record<string, number> = {};
  let review = 0;
  const out: string[] = [outCols.join(',')];

  for (const r of rows) {
    const row: Record<string, string> = {};
    for (const h of head) row[h] = get(r, h);
    const a = analyze(row);
    counts[a.category] = (counts[a.category] || 0) + 1;
    if (a.needs_review === 'yes') review++;

    const rec: Record<string, string> = {
      ...row,
      telegram_new: a.telegram_new,
      contact_person_new: a.contact_person_new,
      whatsapp_new: a.whatsapp_new,
      phones_new: a.phones_new,
      comments_new: a.comments_new,
      category: a.category,
      needs_review: a.needs_review,
      note: a.note.trim(),
    };
    out.push(outCols.map(c => esc(rec[c] ?? '')).join(','));
  }

  fs.writeFileSync(DST, out.join('\n') + '\n', 'utf-8');

  console.log(`Analyzed ${rows.length} contacts -> ${DST}`);
  console.log('By category:');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(3)}  ${k}`));
  console.log(`\nneeds_review: ${review}  |  auto-confident: ${rows.length - review}`);
}

main();
