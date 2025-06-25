import { DirectoryApi } from '../src/generated';
import { loadConfig } from '../src/config';
import * as fs from 'fs';

interface Options {
  csv: string;
  directoryId: number;
  force: boolean;
}

function parseArgs(args: string[]): Options {
  const opts: Options = { csv: 'data/directory.csv', directoryId: 0, force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--csv') {
      opts.csv = args[++i];
    } else if (a === '--directoryId') {
      opts.directoryId = Number(args[++i]);
    } else if (a === '--force') {
      opts.force = true;
    }
  }
  if (!opts.directoryId) throw new Error('directoryId is required');
  return opts;
}

function parseCsv(path: string): Record<string, string>[] {
  const text = fs.readFileSync(path, 'utf-8');
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });
    return row;
  });
}

export async function directoryUpdate() {
  const opts = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const api = new DirectoryApi(config);

  // 1. Получить данные справочника
  const dirResp = await api.getDirectoryById({ id: opts.directoryId, fields: 'all' });
  console.log(JSON.stringify(dirResp, null, 2));
  const directory = dirResp.directory;
  if (!directory) throw new Error('Directory not found');

  const fieldMap = new Map<string, number>();
  directory.fields?.forEach(f => {
    if (f.id && f.name) fieldMap.set(f.name, f.id);
  });

  const rows = parseCsv(opts.csv);
  for (const row of rows) {
    const key = Number(row['ID']);
    if (!key) {
      console.warn('ID not found for row:', row);
      continue;
    }
    let entry;
    try {
      const entryResp = await api.getDirectoryIdEntryKey({ id: String(opts.directoryId), key, fields: 'all' });
      entry = entryResp.entry;
    } catch (e) {
      console.warn(`Entry not found for ID ${key}`);
      continue;
    }
    if (!entry) {
      console.warn(`Entry not found for ID ${key}`);
      continue;
    }

    const updates: any[] = [];
    for (const [col, value] of Object.entries(row)) {
      if (col === 'ID') continue;
      const fieldId = fieldMap.get(col);
      if (!fieldId) {
        console.warn(`Field not found: ${col}`);
        continue;
      }
      const existing = entry.customFieldData?.find(cf => cf.field?.id === fieldId);
      if (opts.force || !(existing && existing.value)) {
        updates.push({ field: { id: fieldId }, value });
      }
    }

    if (updates.length > 0) {
      await api.postUpdateDirectoryEntry({
        id: String(opts.directoryId),
        key,
        directoryEntryRequest: { customFieldData: updates },
      });
      const updated = await api.getDirectoryIdEntryKey({ id: String(opts.directoryId), key, fields: 'all' });
      console.log(JSON.stringify(updated.entry, null, 2));
    }
  }
}

if (require.main === module) {
  directoryUpdate().catch(err => console.error(err));
}
