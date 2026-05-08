import { ContactApi, DirectoryApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface DirectoryConfig {
  name: string;
  directoryId: number;
  fieldId: number;
}

interface RubricsConfig {
  rubricsDirectoryId: number;
  contactFieldId: number;
  directories: DirectoryConfig[];
}

interface Options {
  config: string;
  csv: string;
  dryRun: boolean;
  limit: number;
}

interface LogRow {
  date: string;
  level: string;
  entity: string;
  entity_id: string;
  directory: string;
  field_id: string;
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  action: string;
  note: string;
}

interface ResolvedPair {
  fromId: number;
  toId: number;
  fromName: string;
  toName: string;
}

const pageSize = 100;
// Filter type for directory entries — "set of directory entries" custom field
// 6114 = set, 6107 = single (in directory filter namespace, 6xxx)
const DIR_FILTER_TYPE_SET = 6114;
// Contact filter type for set-of-directory-entries
const CONTACT_FILTER_TYPE_SET = 4114;
const MAX_ERRORS = 3;

let opts: Options;
let cfg: RubricsConfig;
let configuration: Configuration;
let contactApi: ContactApi;
let directoryApi: DirectoryApi;
let logRows: LogRow[] = [];
let pairsProcessed = 0;
let stats = { entries: 0, contacts: 0, skipped: 0, errors: 0 };

function parseArgs(args: string[]): Options {
  const options: Options = {
    config: 'data/rubrics-config.json',
    csv: 'data/rubrics-merge.csv',
    dryRun: false,
    limit: Number.POSITIVE_INFINITY,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config') options.config = args[++i];
    else if (a === '--csv') options.csv = args[++i];
    else if (a === '--dryRun') options.dryRun = true;
    else if (a === '--limit') options.limit = Number(args[++i]);
  }
  return options;
}

function loadRubricsConfig(filePath: string): RubricsConfig {
  if (!fs.existsSync(filePath)) throw new Error(`config file not found: ${filePath}`);
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<RubricsConfig>;
  if (!parsed.rubricsDirectoryId) throw new Error(`"rubricsDirectoryId" must be set`);
  if (!parsed.contactFieldId) throw new Error(`"contactFieldId" must be set`);
  if (!Array.isArray(parsed.directories) || parsed.directories.length === 0) {
    throw new Error(`"directories" must be a non-empty array`);
  }
  for (const d of parsed.directories) {
    if (!d.name || !d.directoryId || !d.fieldId) {
      throw new Error(`each directories entry needs name, directoryId, fieldId`);
    }
  }
  return parsed as RubricsConfig;
}

function ensureDirectory(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeCsv(v: string): string {
  if (v == null) return '';
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function writeLog(filePath: string, rows: LogRow[]) {
  if (!rows.length) return;
  const headers: (keyof LogRow)[] = [
    'date', 'level', 'entity', 'entity_id', 'directory', 'field_id',
    'from_id', 'from_name', 'to_id', 'to_name', 'action', 'note',
  ];
  ensureDirectory(filePath);
  const addHeader = !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
  const lines: string[] = [];
  if (addHeader) lines.push(headers.join(','));
  rows.forEach(r => lines.push(headers.map(h => escapeCsv(r[h] ?? '')).join(',')));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function recordLog(row: Omit<LogRow, 'date'>) {
  logRows.push({ date: new Date().toISOString(), ...row });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === ',') { out.push(cur); cur = ''; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseMergeCsv(filePath: string): { from: string; to: string }[] {
  if (!fs.existsSync(filePath)) throw new Error(`CSV file not found: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
  const fromIdx = headers.indexOf('from');
  const toIdx = headers.indexOf('to');
  if (fromIdx < 0 || toIdx < 0) throw new Error(`CSV must have "from" and "to" columns`);
  const result: { from: string; to: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const from = cells[fromIdx];
    const to = cells[toIdx];
    if (from && to) result.push({ from, to });
  }
  return result;
}

async function fetchRubricsMap(directoryId: number): Promise<Map<string, { id: number; name: string }>> {
  const cacheDir = path.resolve('data/cache');
  const cacheFile = path.join(cacheDir, `rubrics-${directoryId}.json`);
  if (fs.existsSync(cacheFile)) {
    const ageSec = (Date.now() - fs.statSync(cacheFile).mtimeMs) / 1000;
    if (ageSec < 3600) {
      try {
        const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as Array<[string, { id: number; name: string }]>;
        console.log(`  cached: ${raw.length} entries (${cacheFile})`);
        return new Map(raw);
      } catch { /* fall through */ }
    }
  }

  const dirInfo = await directoryApi.getDirectoryById({ id: directoryId, fields: 'id,name,fields' });
  const directory = dirInfo.directory;
  const fieldIds = directory?.fields?.map(f => f.id).filter((id): id is number => id != null) ?? [];
  const nameField = directory?.fields?.find(f =>
    f.name?.toLowerCase().includes('name') || f.name?.toLowerCase().includes('назван'),
  ) ?? directory?.fields?.[0];
  const nameFieldId = nameField?.id;
  if (!nameFieldId) throw new Error(`cannot find name field in directory ${directoryId}`);

  const fieldsStr = ['key', ...fieldIds.map(String)].join(',');
  const map = new Map<string, { id: number; name: string }>();
  let offset = 0;
  while (true) {
    const resp = await directoryApi.postListDirectoryEntries({
      id: String(directoryId),
      postListDirectoryEntriesRequest: { pageSize, offset, fields: fieldsStr, entriesOnly: true },
    });
    const entries = resp.directoryEntries ?? [];
    for (const e of entries) {
      if (e.key == null) continue;
      const cf = e.customFieldData?.find(c => c.field?.id === nameFieldId);
      const cfValue = cf?.value as unknown;
      const name = typeof cfValue === 'string' ? cfValue.trim() : undefined;
      if (name) map.set(name.toLowerCase(), { id: e.key, name });
    }
    if (entries.length < pageSize) break;
    offset += pageSize;
  }

  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(Array.from(map.entries())));
  console.log(`  fetched ${map.size} entries (cached → ${cacheFile})`);
  return map;
}

function extractDirIds(entity: any, fieldId: number): Set<number> {
  const ids = new Set<number>();
  const cf = entity.customFieldData?.find((c: any) => c.field?.id === fieldId);
  if (!cf) return ids;
  if ('valueId' in cf && cf.valueId != null) {
    const arr = Array.isArray(cf.valueId) ? cf.valueId : [cf.valueId];
    arr.forEach((v: any) => { if (typeof v === 'number') ids.add(v); });
  } else if (cf.value) {
    if (Array.isArray(cf.value)) {
      cf.value.forEach((v: any) => {
        if (typeof v === 'object' && v && 'id' in v && v.id != null) ids.add(Number(v.id));
        else if (typeof v === 'number') ids.add(v);
      });
    } else if (typeof cf.value === 'object' && 'id' in cf.value) {
      const id = (cf.value as { id?: number }).id;
      if (id != null) ids.add(Number(id));
    } else if (typeof cf.value === 'number') {
      ids.add(cf.value);
    }
  }
  return ids;
}

async function extractErrorMessage(error: unknown): Promise<string> {
  if (error instanceof Error) {
    if ('response' in error && (error as any).response) {
      try {
        const text = await (error as any).response.text();
        return `${error.message}: ${text}`;
      } catch { /* ignore */ }
    }
    return error.message;
  }
  return String(error);
}

async function processDirectoryEntries(dir: DirectoryConfig, pair: ResolvedPair) {
  if (stats.errors >= MAX_ERRORS) return;
  const { fromId, toId, fromName, toName } = pair;
  const fields = `key,${dir.fieldId}`;
  const seenKeys = new Set<number>();

  while (true) {
    if (stats.errors >= MAX_ERRORS) return;
    let response;
    try {
      response = await directoryApi.postListDirectoryEntries({
        id: String(dir.directoryId),
        postListDirectoryEntriesRequest: {
          pageSize, offset: 0, fields, entriesOnly: true,
          filters: [{
            type: DIR_FILTER_TYPE_SET as any,
            field: dir.fieldId,
            operator: 'equal' as const,
            value: String(fromId) as any,
          }],
        },
      });
    } catch (error) {
      const msg = await extractErrorMessage(error);
      console.error(`  ${dir.name}: list error: ${msg}`);
      stats.errors++;
      recordLog({
        level: 'error', entity: 'entry', entity_id: '',
        directory: dir.name, field_id: String(dir.fieldId),
        from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
        action: 'list-error', note: msg,
      });
      return;
    }
    const entries = response.directoryEntries ?? [];
    if (!entries.length) break;
    const newKeys = entries.filter(e => e.key != null && !seenKeys.has(e.key)).length;
    if (newKeys === 0) break;

    for (const entry of entries) {
      if (stats.errors >= MAX_ERRORS) return;
      if (entry.key == null || seenKeys.has(entry.key)) continue;
      seenKeys.add(entry.key);
      const currentIds = extractDirIds(entry, dir.fieldId);
      if (!currentIds.has(fromId)) {
        stats.skipped++;
        recordLog({
          level: 'warning', entity: 'entry', entity_id: String(entry.key),
          directory: dir.name, field_id: String(dir.fieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'skip', note: `from-id not in field (current: ${[...currentIds].join(',') || 'none'})`,
        });
        continue;
      }
      currentIds.delete(fromId);
      currentIds.add(toId);
      const newIds = [...currentIds];

      if (opts.dryRun) {
        console.log(`  [DRY] ${dir.name} entry ${entry.key}: ${fromId}→${toId}`);
        recordLog({
          level: 'info', entity: 'entry', entity_id: String(entry.key),
          directory: dir.name, field_id: String(dir.fieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'dry-run', note: `would set [${newIds.join(',')}]`,
        });
        stats.entries++;
        continue;
      }

      try {
        await directoryApi.postUpdateDirectoryEntry({
          id: String(dir.directoryId),
          key: entry.key,
          directoryEntryRequest: {
            customFieldData: [{
              field: { id: dir.fieldId },
              value: newIds.map(id => ({ id })),
            }],
          } as any,
        });
        console.log(`  ${dir.name} entry ${entry.key}: ${fromId}→${toId}`);
        stats.entries++;
        recordLog({
          level: 'info', entity: 'entry', entity_id: String(entry.key),
          directory: dir.name, field_id: String(dir.fieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'update', note: `set [${newIds.join(',')}]`,
        });
      } catch (error) {
        stats.errors++;
        const msg = await extractErrorMessage(error);
        console.error(`  ${dir.name} entry ${entry.key} update failed: ${msg}`);
        recordLog({
          level: 'error', entity: 'entry', entity_id: String(entry.key),
          directory: dir.name, field_id: String(dir.fieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'error', note: msg,
        });
      }
    }

    if (entries.length < pageSize) break;
    // updated entries leave the filter, so offset stays 0
  }
}

async function processContacts(pair: ResolvedPair) {
  if (stats.errors >= MAX_ERRORS) return;
  const { fromId, toId, fromName, toName } = pair;
  const fields = `id,name,${cfg.contactFieldId}`;
  const seenIds = new Set<number>();

  while (true) {
    if (stats.errors >= MAX_ERRORS) return;
    let response;
    try {
      response = await contactApi.getContactList({
        getContactListRequest: {
          pageSize, offset: 0, fields,
          filters: [{
            type: CONTACT_FILTER_TYPE_SET as any,
            operator: 'equal' as const,
            value: String(fromId) as any,
            field: cfg.contactFieldId,
          }] as any,
        },
      });
    } catch (error) {
      const msg = await extractErrorMessage(error);
      console.error(`  contacts list error: ${msg}`);
      stats.errors++;
      recordLog({
        level: 'error', entity: 'contact', entity_id: '',
        directory: 'contacts', field_id: String(cfg.contactFieldId),
        from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
        action: 'list-error', note: msg,
      });
      return;
    }
    const contacts = response.contacts ?? [];
    if (!contacts.length) break;
    const newOnes = contacts.filter(c => c.id != null && !seenIds.has(c.id)).length;
    if (newOnes === 0) break;

    for (const contact of contacts) {
      if (stats.errors >= MAX_ERRORS) return;
      if (contact.id == null || seenIds.has(contact.id)) continue;
      seenIds.add(contact.id);
      const currentIds = extractDirIds(contact, cfg.contactFieldId);
      if (!currentIds.has(fromId)) {
        stats.skipped++;
        recordLog({
          level: 'warning', entity: 'contact', entity_id: String(contact.id),
          directory: 'contacts', field_id: String(cfg.contactFieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'skip', note: `from-id not in field (current: ${[...currentIds].join(',') || 'none'})`,
        });
        continue;
      }
      currentIds.delete(fromId);
      currentIds.add(toId);
      const newIds = [...currentIds];

      if (opts.dryRun) {
        console.log(`  [DRY] contact ${contact.id}: ${fromId}→${toId}`);
        recordLog({
          level: 'info', entity: 'contact', entity_id: String(contact.id),
          directory: 'contacts', field_id: String(cfg.contactFieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'dry-run', note: `would set [${newIds.join(',')}]`,
        });
        stats.contacts++;
        continue;
      }

      try {
        await contactApi.postContactById({
          id: String(contact.id),
          contactRequest: {
            customFieldData: [{
              field: { id: cfg.contactFieldId },
              value: newIds.map(id => ({ id })),
            }],
          } as any,
        });
        console.log(`  contact ${contact.id}: ${fromId}→${toId}`);
        stats.contacts++;
        recordLog({
          level: 'info', entity: 'contact', entity_id: String(contact.id),
          directory: 'contacts', field_id: String(cfg.contactFieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'update', note: `set [${newIds.join(',')}]`,
        });
      } catch (error) {
        stats.errors++;
        const msg = await extractErrorMessage(error);
        console.error(`  contact ${contact.id} update failed: ${msg}`);
        recordLog({
          level: 'error', entity: 'contact', entity_id: String(contact.id),
          directory: 'contacts', field_id: String(cfg.contactFieldId),
          from_id: String(fromId), from_name: fromName, to_id: String(toId), to_name: toName,
          action: 'error', note: msg,
        });
      }
    }

    if (contacts.length < pageSize) break;
  }
}

export async function rubricsMerge() {
  opts = parseArgs(process.argv.slice(2));
  cfg = loadRubricsConfig(opts.config);
  configuration = loadConfig();
  contactApi = new ContactApi(configuration);
  directoryApi = new DirectoryApi(configuration);
  logRows = [];
  pairsProcessed = 0;
  stats = { entries: 0, contacts: 0, skipped: 0, errors: 0 };

  const logPath = opts.csv.replace(/\.csv$/, '-log.csv');
  console.log(`config: rubricsDirectoryId=${cfg.rubricsDirectoryId}, contactFieldId=${cfg.contactFieldId}`);
  console.log(`  ${cfg.directories.length} content directories: ${cfg.directories.map(d => `${d.name}(${d.directoryId}/${d.fieldId})`).join(', ')}`);
  console.log(`csv: ${opts.csv}, dryRun=${opts.dryRun}, limit=${opts.limit === Infinity ? '∞' : opts.limit}`);

  try {
    const pairs = parseMergeCsv(opts.csv);
    console.log(`Loaded ${pairs.length} merge pairs from CSV\n`);

    console.log(`=== Loading rubrics directory ${cfg.rubricsDirectoryId} ===`);
    const rubricsMap = await fetchRubricsMap(cfg.rubricsDirectoryId);

    const resolved: ResolvedPair[] = [];
    const unresolved: { from: string; to: string }[] = [];
    for (const { from, to } of pairs) {
      const fromEntry = rubricsMap.get(from.toLowerCase());
      const toEntry = rubricsMap.get(to.toLowerCase());
      if (!fromEntry || !toEntry) {
        unresolved.push({ from, to });
        continue;
      }
      resolved.push({ fromId: fromEntry.id, toId: toEntry.id, fromName: fromEntry.name, toName: toEntry.name });
    }
    console.log(`  resolved ${resolved.length}/${pairs.length} pairs (${unresolved.length} skipped)`);
    for (const u of unresolved) {
      recordLog({
        level: 'warning', entity: 'pair', entity_id: '',
        directory: 'rubrics', field_id: '',
        from_id: '', from_name: u.from, to_id: '', to_name: u.to,
        action: 'skip', note: 'from or to not in rubrics directory',
      });
    }

    for (const pair of resolved) {
      if (pairsProcessed >= opts.limit || stats.errors >= MAX_ERRORS) {
        console.log(`stop: limit=${opts.limit} reached or errors=${stats.errors}`);
        break;
      }
      console.log(`\n-- ${pair.fromName} (${pair.fromId}) → ${pair.toName} (${pair.toId})`);
      for (const dir of cfg.directories) {
        if (stats.errors >= MAX_ERRORS) break;
        await processDirectoryEntries(dir, pair);
      }
      if (stats.errors >= MAX_ERRORS) break;
      await processContacts(pair);
      pairsProcessed++;
    }

    console.log(`\n--- Summary ---`);
    console.log(`Pairs processed:           ${pairsProcessed}/${resolved.length}`);
    console.log(`Directory entries updated: ${stats.entries}`);
    console.log(`Contacts updated:          ${stats.contacts}`);
    console.log(`Skipped:                   ${stats.skipped}`);
    console.log(`Errors:                    ${stats.errors}`);
  } finally {
    writeLog(logPath, logRows);
    console.log(`Log written to ${logPath}`);
    logRows = [];
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  rubricsMerge().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
