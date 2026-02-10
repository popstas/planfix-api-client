import { ContactApi, DirectoryApi } from '../src/generated';
import type { PostContactRequest } from '../src/generated/apis/ContactApi';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  csv: string;
  handbookId: number;
  fieldCityId: number;
  fieldRegionId: number;
  dryRun: boolean;
}

interface LogRow {
  date: string;
  level: string;
  contact_id: string;
  contact_number: string;
  city_value: string;
  region_matched: string;
  action: string;
  note: string;
}

const pageSize = 100;

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let directoryApi: DirectoryApi;
let logRows: LogRow[] = [];
let handbookCacheFile: string | undefined;
const contactCacheDir = path.resolve('data/cache/contacts');
let statsChanged = 0;
let statsNotChanged = 0;

function parseArgs(args: string[]): Options {
  const options: Options = {
    csv: 'data/contacts-migrate-region.csv',
    handbookId: 245,
    fieldCityId: 399,
    fieldRegionId: 829,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv') {
      options.csv = args[++i];
    } else if (arg === '--handbookId') {
      options.handbookId = Number(args[++i]);
    } else if (arg === '--fieldCityId') {
      options.fieldCityId = Number(args[++i]);
    } else if (arg === '--fieldRegionId') {
      options.fieldRegionId = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }

  if (!options.csv) {
    throw new Error('csv is required');
  }
  if (!options.handbookId) {
    throw new Error('handbookId is required');
  }
  if (!options.fieldCityId) {
    throw new Error('fieldCityId is required');
  }
  if (!options.fieldRegionId) {
    throw new Error('fieldRegionId is required');
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
    'city_value',
    'region_matched',
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
    city_value: row.city_value,
    region_matched: row.region_matched,
    action: row.action,
    note: row.note,
  });
}

function parseCsv(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(';').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(';');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });
    return row;
  });
}

async function fetchAllHandbookEntries(handbookId: number): Promise<Map<string, { id: number; name: string }>> {
  const regionMap = new Map<string, { id: number; name: string }>();
  let offset = 0;

  console.log(`Fetching handbook entries from directory ${handbookId}...`);

  // First, get directory structure to find field IDs
  let regionFieldId: number | undefined;
  try {
    const dirInfo = await directoryApi.getDirectoryById({ id: handbookId, fields: 'id,name,fields' });
    const directory = dirInfo.directory;
    console.log(`Directory: ${directory?.name}`);
    
    // Find the field that contains country names ("Страна")
    const regionField = directory?.fields?.find(f => 
      f.name?.toLowerCase().includes('страна') || 
      f.name?.toLowerCase().includes('country')
    );
    regionFieldId = regionField?.id;
    
    if (!regionFieldId) {
      // Fallback: use the first field if there are exactly 2 fields (country and region)
      if (directory?.fields && directory.fields.length >= 1) {
        regionFieldId = directory.fields[0].id;
        console.log(`Using first field (${directory.fields[0].name}, id: ${regionFieldId}) as region field`);
      } else {
        throw new Error('Could not determine region field ID from directory structure');
      }
    } else if (regionField) {
      console.log(`Found region field: ${regionField.name} (id: ${regionFieldId})`);
    }
  } catch (error) {
    console.error(`Failed to get directory ${handbookId}:`, error);
    throw new Error(`Directory ${handbookId} not found or inaccessible`);
  }

  // Build fields string: key + all directory field IDs
  const dirInfo = await directoryApi.getDirectoryById({ id: handbookId, fields: 'fields' });
  const fieldIds = dirInfo.directory?.fields?.map(f => f.id).filter((id): id is number => id != null) ?? [];
  const fieldsStr = ['key', ...fieldIds.map(String)].join(',');

  while (true) {
    const response = await directoryApi.postListDirectoryEntries({
      id: String(handbookId),
      postListDirectoryEntriesRequest: {
        pageSize,
        offset,
        fields: fieldsStr,
        entriesOnly: true,
      },
    });

    const entries = response.directoryEntries ?? [];
    console.log(`Fetched ${entries.length} entries at offset ${offset}`);
    
    for (const entry of entries) {
      if (entry.key == null) continue;
      
      // Extract region name from customFieldData using the region field ID
      let name: string | undefined;
      
      if (entry.customFieldData && regionFieldId) {
        const regionField = entry.customFieldData.find(cf => cf.field?.id === regionFieldId);
        if (regionField?.value && typeof regionField.value === 'string') {
          name = regionField.value;
        }
      }
      
      if (name) {
        const nameStr = name.trim();
        regionMap.set(nameStr, { id: entry.key, name: nameStr });
      } else {
        console.warn(`Entry id ${entry.key} has no region value`);
      }
    }

    if (entries.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  console.log(`Loaded ${regionMap.size} region entries from handbook`);
  if (regionMap.size > 0) {
    console.log('Sample entries:', Array.from(regionMap.keys()).slice(0, 5).join(', '));
  }
  return regionMap;
}

// Mapping for common country name variations to standard names
const regionsMap: Record<string, string> = {
  'рф': 'Russia',
  'россия': 'Russia',
  'российская федерация': 'Russia',
  'russia': 'Russia',
  'russian federation': 'Russia',
  'usa': 'United States of America',
  'сша': 'United States of America',
  'united states': 'United States of America',
  'united states of america': 'United States of America',
  'us': 'United States of America',
  'америка': 'United States of America',
  'ukraine': 'Ukraine',
  'украина': 'Ukraine',
  'uk': 'United Kingdom',
  'United Kingdom': 'United Kingdom',
  'великобритания': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'great britain': 'United Kingdom',
  'britain': 'United Kingdom',
  'казахстан': 'Kazakhstan',
  'kazakhstan': 'Kazakhstan',
  'беларусь': 'Belarus',
  'belarus': 'Belarus',
  'белоруссия': 'Belarus',
  'armenia': 'Armenia',
  'армения': 'Armenia',
  'azerbaijan': 'Azerbaijan',
  'азербайджан': 'Azerbaijan',
  'georgia': 'Georgia',
  'грузия': 'Georgia',
  'uzbekistan': 'Uzbekistan',
  'узбекистан': 'Uzbekistan',
  'kyrgyzstan': 'Kyrgyzstan',
  'кыргызстан': 'Kyrgyzstan',
  'киргизия': 'Kyrgyzstan',
  'нидерланды': 'Netherlands',
  'tajikistan': 'Tajikistan',
  'таиланд': 'Thailand',
  'таджикистан': 'Tajikistan',
  'turkmenistan': 'Turkmenistan',
  'туркменистан': 'Turkmenistan',
  'moldova': 'Moldova',
  'молдова': 'Moldova',
  'latvia': 'Latvia',
  'латвия': 'Latvia',
  'lithuania': 'Lithuania',
  'литва': 'Lithuania',
  'estonia': 'Estonia',
  'эстония': 'Estonia',
  
  'poland': 'Poland',
  'польша': 'Poland',
  'germany': 'Germany',
  'германия': 'Germany',
  'france': 'France',
  'франция': 'France',
  'spain': 'Spain',
  'испания': 'Spain',
  'italy': 'Italy',
  'италия': 'Italy',
  'turkey': 'Turkey',
  'турция': 'Turkey',
  'china': 'China',
  'китай': 'China',
  'india': 'India',
  'индия': 'India',
  'canada': 'Canada',
  'канада': 'Canada',
  'israel': 'Israel',
  'израиль': 'Israel',
  'uae': 'United Arab Emirates',
  'оаэ': 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  'emirates': 'United Arab Emirates',
  'vietnam': 'Vietnam',
  'вьетнам': 'Vietnam',
  'mexico': 'Mexico',
  'мексика': 'Mexico',
  'San Francisco': 'United States of America',
};

function normalizeRegionName(name: string): string {
  const normalized = name.trim().toLowerCase();
  return regionsMap[normalized] || name.trim();
}

function findMatchingRegions(
  cityValue: string,
  regionMap: Map<string, { id: number; name: string }>,
): Array<{ id: number; name: string }> {
  if (!cityValue || !cityValue.trim()) {
    return [];
  }

  // Split by common separators: comma, semicolon, slash, pipe, or "•"
  const parts = cityValue
    .split(/[,;\/|•]/)
    .map(part => {
      // Remove text in parentheses (e.g., "РФ (гражданство)" -> "РФ")
      part = part.replace(/\([^)]*\)/g, '').trim();
      return part;
    })
    .filter(part => part.length > 0);

  const matchedRegions: Array<{ id: number; name: string }> = [];
  const seenIds = new Set<number>();

  for (const part of parts) {
    // Normalize the part using the mapping
    const normalizedPart = normalizeRegionName(part).toLowerCase();

    let found = false;

    // Try includes match first (more flexible)
    for (const [regionName, regionData] of regionMap.entries()) {
      if (seenIds.has(regionData.id)) continue;
      
      const normalizedRegion = regionName.toLowerCase();
      // Check if part is included in region name or region name is included in part
      if (normalizedRegion.includes(normalizedPart) || normalizedPart.includes(normalizedRegion)) {
        matchedRegions.push(regionData);
        seenIds.add(regionData.id);
        found = true;
        break;
      }
    }

    // If no includes match, try exact match as fallback
    if (!found) {
      for (const [regionName, regionData] of regionMap.entries()) {
        const normalizedRegion = regionName.toLowerCase();
        if (normalizedRegion === normalizedPart && !seenIds.has(regionData.id)) {
          matchedRegions.push(regionData);
          seenIds.add(regionData.id);
          break;
        }
      }
    }
  }

  return matchedRegions;
}

interface ParsedContactRow {
  contactId: number;
  contactNumber: string;
  csvCity: string;
  csvRegion: string;
}

function parseContactRow(row: Record<string, string>): ParsedContactRow | null {
  const contactNumber = row['Номер']?.trim();
  const csvCity = row['Город']?.trim();
  const csvRegion = row['Region']?.trim();

  if (!contactNumber) {
    recordLogRow({
      level: 'error',
      contact_id: '',
      contact_number: '',
      city_value: csvCity || '',
      region_matched: '',
      action: 'skip',
      note: 'Missing contact number in CSV',
    });
    return null;
  }

  const contactId = Number(contactNumber);
  if (!Number.isFinite(contactId)) {
    recordLogRow({
      level: 'error',
      contact_id: '',
      contact_number: contactNumber,
      city_value: csvCity || '',
      region_matched: '',
      action: 'skip',
      note: `Invalid contact number: ${contactNumber}`,
    });
    return null;
  }

  return { contactId, contactNumber, csvCity: csvCity || '', csvRegion: csvRegion || '' };
}

function getContactCacheFile(contactId: number, fieldsStr: string): string {
  const cacheKey = `id-${contactId}_fields:${fieldsStr}`;
  return path.join(contactCacheDir, `${cacheKey}.json`);
}

function readContactCache(contactId: number, fieldsStr: string): any | undefined {
  const contactCacheFile = getContactCacheFile(contactId, fieldsStr);
  if (fs.existsSync(contactCacheFile)) {
    const stat = fs.statSync(contactCacheFile);
    const ageSec = (Date.now() - stat.mtimeMs) / 1000;
    if (ageSec < 86400) {
      try {
        const raw = fs.readFileSync(contactCacheFile, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        // ignore & treat as missing cache
      }
    }
  }
  return undefined;
}

function writeContactCache(contactId: number, fieldsStr: string, data: any): void {
  if (!fs.existsSync(contactCacheDir)) {
    fs.mkdirSync(contactCacheDir, { recursive: true });
  }
  const contactCacheFile = getContactCacheFile(contactId, fieldsStr);
  fs.writeFileSync(contactCacheFile, JSON.stringify(data));
}

function deleteContactCache(contactId: number): void {
  if (!fs.existsSync(contactCacheDir)) return;
  
  const files = fs.readdirSync(contactCacheDir);
  const pattern = new RegExp(`^id-${contactId}_fields`);
  for (const file of files) {
    if (pattern.test(file)) {
      const filePath = path.join(contactCacheDir, file);
      fs.unlinkSync(filePath);
    }
  }
}

async function fetchContactFromApi(contactId: number, fieldsStr: string): Promise<any> {
  const response = await contactApi.getContactById({
    id: String(contactId),
    fields: fieldsStr,
  });
  return response.contact;
}

async function getContactWithCache(
  contactId: number,
  fieldsStr: string,
  contactNumber: string,
  csvCity: string,
): Promise<any | null> {
  const cachedContact = readContactCache(contactId, fieldsStr);
  if (cachedContact) {
    return cachedContact;
  }

  try {
    const contact = await fetchContactFromApi(contactId, fieldsStr);
    if (contact) {
      writeContactCache(contactId, fieldsStr, contact);
    }
    return contact;
  } catch (error) {
    recordLogRow({
      level: 'error',
      contact_id: String(contactId),
      contact_number: contactNumber,
      city_value: csvCity,
      region_matched: '',
      action: 'skip',
      note: `Contact not found: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

function extractCityValue(contact: any, fieldCityId: number): string | null {
  const cityField = contact.customFieldData?.find((cf: any) => cf.field?.id === fieldCityId);
  const cityValue = cityField?.value as string | undefined;
  const cityValueStr = cityValue ? String(cityValue).trim() : '';
  return cityValueStr || null;
}

function extractCurrentRegionKeys(contact: any, fieldRegionId: number): Set<number> {
  const currentRegionKeys = new Set<number>();
  const regionField = contact.customFieldData?.find((cf: any) => cf.field?.id === fieldRegionId);
  
  if (!regionField) {
    return currentRegionKeys;
  }

  // Try valueId first (for directory fields, this might be the id)
  if ('valueId' in regionField && regionField.valueId != null) {
    const valueId = regionField.valueId;
    const ids = Array.isArray(valueId) ? valueId : [valueId];
    ids.forEach(id => currentRegionKeys.add(id as number));
  }
  // Try value with id property (could be array or single)
  else if (regionField.value) {
    if (Array.isArray(regionField.value)) {
      regionField.value.forEach((v: any) => {
        if (typeof v === 'object' && 'id' in v && v.id != null) {
          currentRegionKeys.add(v.id);
        } else if (typeof v === 'number') {
          currentRegionKeys.add(v);
        }
      });
    } else if (typeof regionField.value === 'object' && 'id' in regionField.value) {
      const id = (regionField.value as { id?: number }).id;
      if (id != null) currentRegionKeys.add(id);
    } else if (typeof regionField.value === 'number') {
      currentRegionKeys.add(regionField.value);
    }
  }

  return currentRegionKeys;
}

function shouldUpdateRegions(
  matchedRegions: Array<{ id: number; name: string }>,
  currentRegionKeys: Set<number>,
): boolean {
  const matchedIds = new Set(matchedRegions.map(r => r.id));
  const allMatched = matchedRegions.every(r => currentRegionKeys.has(r.id));
  const noChanges = allMatched && currentRegionKeys.size === matchedIds.size;
  return !noChanges;
}

function formatRegionUpdateData(
  matchedRegions: Array<{ id: number; name: string }>,
  fieldRegionId: number,
): any {
  // Always use array for value, even for single values
  return {
    field: { id: fieldRegionId },
    value: matchedRegions.map(r => ({ id: r.id })),
  };
}

async function extractErrorDetails(error: unknown): Promise<{ message: string; status?: number; statusText?: string }> {
  let errorMessage = 'Unknown error';
  let status: number | undefined;
  let statusText: string | undefined;
  
  if (error instanceof Error) {
    errorMessage = error.message;
    if ('response' in error && (error as any).response) {
      try {
        const response = (error as any).response;
        status = response.status;
        statusText = response.statusText;
        const text = await response.text();
        errorMessage = `${error.message}: ${text}`;
      } catch (e) {
        // Ignore if we can't read the response
      }
    }
  } else {
    errorMessage = String(error);
  }
  
  return { message: errorMessage, status, statusText };
}

async function updateContactRegions(
  contact: any,
  matchedRegions: Array<{ id: number; name: string }>,
  fieldRegionId: number,
  dryRun: boolean,
  contactNumber: string,
  cityValueStr: string,
  currentRegionKeys: Set<number>,
): Promise<void> {
  const regionNames = matchedRegions.map(r => r.name).join(', ');
  const regionIds = matchedRegions.map(r => r.id);
  const currentKeysStr = Array.from(currentRegionKeys).join(', ');
  const newKeysStr = regionIds.join(', ');

  if (dryRun) {
    console.log(
      `[DRY RUN] Would update contact ${contact.id} (${contactNumber}): city "${cityValueStr}" -> regions "${regionNames}" (ids: ${newKeysStr})`,
    );
    recordLogRow({
      level: 'info',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      city_value: cityValueStr,
      region_matched: regionNames,
      action: 'dry-run',
      note: `Would update regions from [${currentKeysStr || 'none'}] to [${newKeysStr}]`,
    });
    return;
  }

  const updateData = formatRegionUpdateData(matchedRegions, fieldRegionId);

  try {
    const params: PostContactRequest = {
      contactRequest: {
        id: contact.id,
        customFieldData: [updateData],
      },
    };
    const result = await contactApi.postContact(params);

    // Reset handbook cache after successful update
    if (handbookCacheFile && fs.existsSync(handbookCacheFile)) {
      fs.unlinkSync(handbookCacheFile);
    }

    // Reset contact cache for this contact id
    deleteContactCache(contact.id!);

    console.log(
      `Updated contact ${contact.id} (${contactNumber}): city "${cityValueStr}" -> regions "${regionNames}"`,
    );
    statsChanged++;
    recordLogRow({
      level: 'info',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      city_value: cityValueStr,
      region_matched: regionNames,
      action: 'update',
      note: `Updated regions from [${currentKeysStr || 'none'}] to [${newKeysStr}]`,
    });
  } catch (error) {
    const { message, status, statusText } = await extractErrorDetails(error);
    const statusInfo = status != null ? ` [${status}${statusText ? ` ${statusText}` : ''}]` : '';
    console.error(`Failed to update contact ${contact.id} (${contactNumber}): ${message}${statusInfo}`);
    if (status != null || statusText != null) {
      console.error(`Response status: ${status ?? 'N/A'}, statusText: ${statusText ?? 'N/A'}`);
    }
    
    recordLogRow({
      level: 'error',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      city_value: cityValueStr,
      region_matched: regionNames,
      action: 'error',
      note: `Update failed: ${message}${statusInfo}`,
    });
  }
}

async function processContact(
  row: Record<string, string>,
  regionMap: Map<string, { id: number; name: string }>,
): Promise<void> {
  const parsed = parseContactRow(row);
  if (!parsed) {
    return;
  }

  const { contactId, contactNumber, csvCity } = parsed;
  const fieldsStr = `id,${opts.fieldCityId},${opts.fieldRegionId}`;

  const contact = await getContactWithCache(contactId, fieldsStr, contactNumber, csvCity);
  if (!contact || !contact.id) {
    recordLogRow({
      level: 'error',
      contact_id: String(contactId),
      contact_number: contactNumber,
      city_value: csvCity,
      region_matched: '',
      action: 'skip',
      note: 'Contact not found',
    });
    return;
  }

  const cityValueStr = extractCityValue(contact, opts.fieldCityId);
  if (!cityValueStr) {
    recordLogRow({
      level: 'warning',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      city_value: '',
      region_matched: '',
      action: 'skip',
      note: 'City field is empty',
    });
    return;
  }

  const matchedRegions = findMatchingRegions(cityValueStr, regionMap);
  if (matchedRegions.length === 0) {
    recordLogRow({
      level: 'warning',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      city_value: cityValueStr,
      region_matched: '',
      action: 'skip',
      note: `No matching regions found for city: ${cityValueStr}`,
    });
    return;
  }

  const currentRegionKeys = extractCurrentRegionKeys(contact, opts.fieldRegionId);
  
  if (!shouldUpdateRegions(matchedRegions, currentRegionKeys)) {
    const regionNames = matchedRegions.map(r => r.name).join(', ');
    // console.log(
    //   `Not changed contact ${contact.id} (${contactNumber}): city "${cityValueStr}" -> regions "${regionNames}" (already set)`,
    // );
    statsNotChanged++;
    recordLogRow({
      level: 'info',
      contact_id: String(contact.id),
      contact_number: contactNumber,
      city_value: cityValueStr,
      region_matched: regionNames,
      action: 'skip',
      note: 'Regions already set correctly',
    });
    return;
  }

  await updateContactRegions(
    contact,
    matchedRegions,
    opts.fieldRegionId,
    opts.dryRun,
    contactNumber,
    cityValueStr,
    currentRegionKeys,
  );
}

export async function contactsMigrateRegion() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  directoryApi = new DirectoryApi(config);
  logRows = [];
  statsChanged = 0;
  statsNotChanged = 0;

  try {
    console.log(`Reading CSV from ${opts.csv}`);
    const rows = parseCsv(opts.csv);
    console.log(`Found ${rows.length} rows in CSV`);

    console.log(`Loading handbook entries from directory ${opts.handbookId}...`);
    // Cache regionMap by opts.handbookId for 3600 seconds (1 hour)
    const cacheDir = path.resolve('data/cache');
    handbookCacheFile = path.join(cacheDir, `regionMap-${opts.handbookId}.json`);
    let regionMap: Map<string, { id: number; name: string }>;

    // Helper: safely read JSON cache file
    function readCache(): any | undefined {
      if (fs.existsSync(handbookCacheFile!)) {
        const stat = fs.statSync(handbookCacheFile!);
        const ageSec = (Date.now() - stat.mtimeMs) / 1000;
        if (ageSec < 3600) {
          try {
            const raw = fs.readFileSync(handbookCacheFile!, 'utf8');
            return JSON.parse(raw);
          } catch (e) {
            // ignore & treat as missing cache
          }
        }
      }
    }

    // Helper: write regionMap to cache
    function writeCache(obj: any) {
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(handbookCacheFile!, JSON.stringify(obj));
    }

    // Helper: delete cache file
    function deleteCache() {
      if (handbookCacheFile && fs.existsSync(handbookCacheFile)) {
        fs.unlinkSync(handbookCacheFile);
        console.log(`Deleted handbook cache: ${handbookCacheFile}`);
      }
    }    

    const cached = readCache();
    if (cached && Array.isArray(cached)) {
      // Migrate old cache format (key -> id) if needed
      const migrated: Array<[string, { id: number; name: string }]> = cached.map(([name, data]: [string, any]) => {
        if (data && 'key' in data && !('id' in data)) {
          return [name, { id: data.key, name: data.name }];
        }
        return [name, data];
      });
      // restore Map from cached array
      regionMap = new Map(migrated);
      console.log(`Loaded regionMap from cache (${handbookCacheFile})`);
    } else {
      regionMap = await fetchAllHandbookEntries(opts.handbookId);
      // Convert Map to array before json
      writeCache(Array.from(regionMap.entries()));
      console.log(`Saved regionMap to cache (${handbookCacheFile})`);
    }

    if (regionMap.size === 0) {
      throw new Error('No region entries found in handbook');
    }

    console.log(`Processing ${rows.length} contacts...`);
    let processed = 0;
    for (const row of rows) {
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${rows.length} contacts...`);
      }
      await processContact(row, regionMap);
    }

    console.log(`\nCompleted processing ${rows.length} contacts`);
    console.log(`Changed: ${statsChanged}, Not changed: ${statsNotChanged}`);
  } finally {
    const logPath = opts.csv.replace(/\.csv$/, '-log.csv');
    writeCsv(logPath, logRows);
    console.log(`Log written to ${logPath}`);
    logRows = [];
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  contactsMigrateRegion().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}

