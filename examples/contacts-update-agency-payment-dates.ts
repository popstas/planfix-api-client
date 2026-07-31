import { ContactApi, ReportApi } from '../src/generated';
import type { Configuration } from '../src/generated';
import type { PostContactByIdRequest } from '../src/generated/apis/ContactApi';
import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';

// Бэкфилл четырёх дат оплат на карточках агентств для KPI B2B.
//
// Источник - отчёт "B2B - оплаты за всё время" (ЦУП, id 6307): одна строка на оплату,
// с номером контакта-агентства и датой оплаты. Скрипт группирует строки по агентству,
// выводит из истории оплат четыре даты и пишет их в поля контакта.
//
// Дальше эти же даты поддерживает сценарий Планфикса на объекте Оплата клиента,
// скрипт нужен только чтобы заполнить историю один раз.

const REPORT_ID = 6307;

const FIELD_FIRST = 871; // Дата первой оплаты
const FIELD_LAST = 873; // Дата последней оплаты
const FIELD_PREV = 915; // Дата предпоследней оплаты
const FIELD_REVIVED = 917; // Дата возрождения

// Разрыв между оплатами, после которого агентство считается возрождённым.
const REVIVAL_GAP_DAYS = 180;
// Направление B2B стартовало 2026-06-01. Разрывы, закончившиеся раньше, - не про Уолтера,
// их засчитывать нельзя, иначе в "возрождённые" попадёт половина старой базы.
const HISTORY_START = '01-06-2026';

const COLUMN_AGENCY = 'Агентство';
const COLUMN_AGENCY_ID = 'Агентство номер';
const COLUMN_DATES = 'Даты оплат';

export interface AgencyDates {
  first: string | null;
  prev: string | null;
  last: string | null;
  revived: string | null;
}

interface Options {
  reportId: number;
  limit: number;
  dryRun: boolean;
  logCsv: string;
  maxSaveAgeMinutes: number;
  clearContacts: number[];
}

interface Stats {
  reportRows: number;
  agencies: number;
  skippedInvalidId: number;
  skippedNoDates: number;
  matched: number;
  needUpdate: number;
  updated: number;
  errors: number;
  revived: number;
}

interface LogRow {
  date: string;
  level: string;
  contact_id: string;
  contact_name: string;
  field: string;
  current_value: string;
  expected_value: string;
  action: string;
  note: string;
}

const defaultLogCsv = 'data/agency-payment-dates-log.csv';

let opts: Options;
let config: Configuration;
let contactApi: ContactApi;
let reportApi: ReportApi;
const logRows: LogRow[] = [];

// --- чистые функции, они же покрыты тестами ---

// Дата в отчёте Планфикса - "DD-MM-YYYY". В UTC-миллисекунды, чтобы сравнивать и сортировать.
function parseDmyUtc(value: string): number | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd));
}

// Ячейка "Даты оплат" приходит либо одной датой (строка-оплата), либо списком через
// запятую (строка-группа, если отчёт выгружен свёрнутым). Разбираем оба варианта.
export function parsePaymentDates(cell: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of String(cell ?? '').split(',')) {
    const value = part.trim();
    if (!value || parseDmyUtc(value) == null || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function deriveAgencyDates(payments: string[]): AgencyDates {
  const dates = [...new Set(payments.filter(Boolean))]
    .filter(d => parseDmyUtc(d) != null)
    .sort((a, b) => (parseDmyUtc(a) as number) - (parseDmyUtc(b) as number));

  if (dates.length === 0) {
    return { first: null, prev: null, last: null, revived: null };
  }

  const first = dates[0];
  const last = dates[dates.length - 1];
  const prev = dates.length > 1 ? dates[dates.length - 2] : null;

  const historyStart = parseDmyUtc(HISTORY_START) as number;
  let revived: string | null = null;
  for (let i = 1; i < dates.length; i++) {
    const gap = ((parseDmyUtc(dates[i]) as number) - (parseDmyUtc(dates[i - 1]) as number)) / 86_400_000;
    if (gap > REVIVAL_GAP_DAYS && (parseDmyUtc(dates[i]) as number) >= historyStart) {
      revived = dates[i];
    }
  }

  return { first, prev, last, revived };
}

// --- обвязка ---

function parseArgs(args: string[]): Options {
  const options: Options = {
    reportId: REPORT_ID,
    limit: 0,
    dryRun: false,
    logCsv: defaultLogCsv,
    maxSaveAgeMinutes: 60,
    clearContacts: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--reportId') {
      options.reportId = Number(args[++i]);
    } else if (arg === '--limit') {
      options.limit = Number(args[++i]);
    } else if (arg === '--dryRun' || arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--logCsv') {
      options.logCsv = args[++i];
    } else if (arg === '--maxSaveAgeMinutes') {
      options.maxSaveAgeMinutes = Number(args[++i]);
    } else if (arg === '--clearContacts') {
      options.clearContacts = String(args[++i] ?? '')
        .split(',')
        .map(v => Number(v.trim()))
        .filter(v => Number.isFinite(v) && v > 0);
    }
  }

  if (!Number.isFinite(options.reportId) || options.reportId <= 0) {
    throw new Error('reportId must be a positive number');
  }
  if (!Number.isFinite(options.limit) || options.limit < 0) {
    throw new Error('limit must be a non-negative number');
  }

  return options;
}

interface ReportItem {
  text?: string;
}
interface ReportRow {
  type?: string;
  items?: ReportItem[];
}

interface ReportSave {
  saveId: number;
  chunksCount: number;
  dateTime?: string;
}

// Последнее сохранение отчёта. Планфикс складывает результаты прогонов в список,
// свежее лежит первым.
async function getLatestSave(reportId: number): Promise<ReportSave | null> {
  // Через сгенерированный клиент dateTime десериализуется в пустой объект (модель ждёт
  // TimePoint, а Планфикс отдаёт строку), поэтому читаем сырой JSON.
  const response = await reportApi.getReportSaveListRaw({
    id: reportId,
    getReportSaveListRequest: {
      offset: 0,
      pageSize: 5,
      fields: 'id,reportId,dateTime,name,chunks,chunksCount',
    } as unknown as never,
  });
  const json = (await response.raw.json()) as {
    saves?: { id?: number; chunksCount?: number; dateTime?: string }[];
  };

  const save = json?.saves?.[0];
  if (!save?.id) return null;
  return {
    saveId: save.id,
    chunksCount: Number(save.chunksCount) || 1,
    dateTime: save.dateTime,
  };
}

// Прогнать отчёт и дождаться сохранения. Планфикс считает отчёт асинхронно:
// generate возвращает requestId, статус опрашиваем до появления save.
async function generateAndWait(reportId: number): Promise<ReportSave> {
  const generated = (await reportApi.generateReport({ id: reportId })) as unknown as {
    requestId?: string;
  };
  const requestId = generated?.requestId;
  if (!requestId) {
    throw new Error(`Report ${reportId}: generate returned no requestId`);
  }

  for (let attempt = 0; attempt < 120; attempt++) {
    const status = (await reportApi.checkGetReportSaveByRequestId({ requestId })) as unknown as {
      save?: { id?: number; chunksCount?: number };
    };
    const save = status?.save;
    if (save?.id) {
      return { saveId: save.id, chunksCount: Number(save.chunksCount) || 1 };
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error(`Report ${reportId}: generation did not finish in 4 minutes`);
}

// Планфикс разрешает генерировать один отчёт раз в 10 минут, поэтому свежее сохранение
// переиспользуем, а на упёршийся лимит откатываемся к последнему готовому.
async function resolveSave(reportId: number): Promise<ReportSave> {
  const latest = await getLatestSave(reportId);
  if (latest?.dateTime) {
    const ageMinutes = (Date.now() - Date.parse(latest.dateTime)) / 60000;
    if (Number.isFinite(ageMinutes) && ageMinutes <= opts.maxSaveAgeMinutes) {
      console.log(
        `Report ${reportId}: reusing save ${latest.saveId} from ${latest.dateTime} ` +
          `(${Math.round(ageMinutes)} min old)`,
      );
      return latest;
    }
  }

  try {
    return await generateAndWait(reportId);
  } catch (error) {
    if (!latest) throw error;
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Report ${reportId}: generate failed (${message}), using save ${latest.saveId}`);
    return latest;
  }
}

// Генерируемый клиент не разбирает вложенный data.rows, поэтому читаем сырой JSON.
async function fetchReportRows(reportId: number): Promise<Record<string, string>[]> {
  const { saveId, chunksCount } = await resolveSave(reportId);
  console.log(`Report ${reportId}: save ${saveId}, chunks ${chunksCount}`);

  const raw: ReportRow[] = [];
  for (let chunk = 0; chunk < chunksCount; chunk++) {
    const response = await reportApi.getReportSaveDataRaw({ id: reportId, saveId, chunk });
    const json = (await response.raw.json()) as { data?: { rows?: ReportRow[] } };
    const rows = json?.data?.rows;
    if (!rows) {
      throw new Error(`Report ${reportId}: chunk ${chunk} returned no rows`);
    }
    raw.push(...rows);
  }

  const header = raw.find(row => row.type === 'Header');
  if (!header?.items) {
    throw new Error(`Report ${reportId}: no header row`);
  }
  const names = header.items.map(item => String(item.text ?? ''));

  return raw
    .filter(row => row.type === 'Normal')
    .map(row => {
      const record: Record<string, string> = {};
      names.forEach((name, index) => {
        record[name] = String(row.items?.[index]?.text ?? '').trim();
      });
      return record;
    });
}

interface Agency {
  contactId: number;
  name: string;
  dates: string[];
}

function groupByAgency(rows: Record<string, string>[], stats: Stats): Agency[] {
  const byId = new Map<number, Agency>();

  for (const row of rows) {
    const idRaw = (row[COLUMN_AGENCY_ID] ?? '').replace(/\s/g, '');
    const contactId = Number(idRaw);
    // Номер 0 встречается у оплат со сломанной ссылкой на агентство - писать некуда.
    if (!idRaw || !Number.isFinite(contactId) || contactId <= 0) {
      stats.skippedInvalidId++;
      continue;
    }

    let agency = byId.get(contactId);
    if (!agency) {
      agency = { contactId, name: row[COLUMN_AGENCY] ?? '', dates: [] };
      byId.set(contactId, agency);
    }
    agency.dates.push(...parsePaymentDates(row[COLUMN_DATES] ?? ''));
  }

  return [...byId.values()].sort((a, b) => a.contactId - b.contactId);
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
  if (!rows.length) return;

  ensureDirectory(filePath);
  const headers: (keyof LogRow)[] = [
    'date',
    'level',
    'contact_id',
    'contact_name',
    'field',
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
  logRows.push({ date: new Date().toISOString(), ...row });
}

function getCurrentFieldValue(contact: unknown, fieldId: number): string {
  const data = (contact as { customFieldData?: { field?: { id?: number }; value?: unknown }[] })
    ?.customFieldData;
  const customField = data?.find(cf => cf.field?.id === fieldId);
  const value = customField?.value;
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Даты приходят как { date: "DD-MM-YYYY", datetime, time }.
    if (typeof obj.date === 'string') return obj.date.trim();
    if (typeof obj.datetime === 'string') return obj.datetime.trim();
    if (typeof obj.value === 'string') return obj.value.trim();
  }
  return String(value).trim();
}

async function updateContactFields(
  contactId: number,
  values: { fieldId: number; value: string }[],
): Promise<void> {
  const params: PostContactByIdRequest = {
    id: String(contactId),
    contactRequest: {
      id: contactId,
      customFieldData: values.map(v => ({
        field: { id: v.fieldId },
        value: v.value as unknown as object,
      })),
    },
  };

  await contactApi.postContactById(params);
}

const FIELDS: { id: number; key: keyof AgencyDates; title: string }[] = [
  { id: FIELD_FIRST, key: 'first', title: 'Дата первой оплаты' },
  { id: FIELD_PREV, key: 'prev', title: 'Дата предпоследней оплаты' },
  { id: FIELD_LAST, key: 'last', title: 'Дата последней оплаты' },
  { id: FIELD_REVIVED, key: 'revived', title: 'Дата возрождения' },
];

// Стереть все четыре даты у перечисленных контактов. Пишем только те поля,
// что есть в шаблоне контакта - иначе 400 на весь запрос.
async function clearContacts(contactIds: number[], stats: Stats): Promise<void> {
  for (const contactId of contactIds) {
    let contactName = '(unknown)';
    try {
      const response = await contactApi.getContactById({
        id: String(contactId),
        fields: `id,name,${FIELDS.map(f => f.id).join(',')}`,
      });
      const contact = response.contact;
      if (!contact?.id) {
        stats.errors++;
        console.warn(`Contact not found: ${contactId}`);
        continue;
      }
      contactName = contact.name ?? contactName;

      const available = new Set(
        ((contact as { customFieldData?: { field?: { id?: number } }[] }).customFieldData ?? [])
          .map(cf => cf.field?.id)
          .filter((id): id is number => typeof id === 'number'),
      );

      const changes = FIELDS.filter(
        field => available.has(field.id) && getCurrentFieldValue(contact, field.id),
      ).map(field => ({ fieldId: field.id, value: '' }));

      if (!changes.length) {
        console.log(`${contactName} (${contactId}): даты уже пусты`);
        continue;
      }

      for (const change of changes) {
        const field = FIELDS.find(f => f.id === change.fieldId);
        addLogRow({
          level: 'warn',
          contact_id: String(contactId),
          contact_name: contactName,
          field: field?.title ?? String(change.fieldId),
          current_value: getCurrentFieldValue(contact, change.fieldId),
          expected_value: '',
          action: opts.dryRun ? 'would_clear' : 'clear',
          note: 'Контакт больше не агентство в отчёте',
        });
      }

      if (opts.dryRun) {
        console.log(`[dry] clear ${contactName} (${contactId}): ${changes.length} полей`);
        continue;
      }

      await updateContactFields(contactId, changes);
      stats.updated++;
      console.log(`Cleared ${contactName} (${contactId}): ${changes.length} полей`);
    } catch (error) {
      stats.errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error on ${contactName} (${contactId}): ${message}`);
    }
  }
}

export async function contactsUpdateAgencyPaymentDates() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  contactApi = new ContactApi(config);
  reportApi = new ReportApi(config);

  const stats: Stats = {
    reportRows: 0,
    agencies: 0,
    skippedInvalidId: 0,
    skippedNoDates: 0,
    matched: 0,
    needUpdate: 0,
    updated: 0,
    errors: 0,
    revived: 0,
  };

  if (opts.dryRun) {
    console.log('DRY RUN MODE: no data will be modified');
  }

  // Когда оплаты передают другому агентству, у прежнего контакта даты остаются висеть
  // и он продолжает считаться агентством в фильтрах "новые" и "возрождённые".
  // Отчёт про такие контакты уже ничего не знает, поэтому чистим их по списку.
  if (opts.clearContacts.length) {
    await clearContacts(opts.clearContacts, stats);
    writeLogCsv(opts.logCsv, logRows);
    console.log(`Log: ${opts.logCsv}`);
    return;
  }

  console.log(`Fetching report ${opts.reportId}...`);
  const rows = await fetchReportRows(opts.reportId);
  stats.reportRows = rows.length;
  console.log(`Report rows: ${rows.length}`);

  const agencies = groupByAgency(rows, stats);
  stats.agencies = agencies.length;
  console.log(`Agencies: ${agencies.length}`);
  if (opts.limit > 0) {
    console.log(`Limit: ${opts.limit}`);
  }

  const toProcess = opts.limit > 0 ? agencies.slice(0, opts.limit) : agencies;

  for (const agency of toProcess) {
    const derived = deriveAgencyDates(agency.dates);
    if (!derived.first) {
      stats.skippedNoDates++;
      addLogRow({
        level: 'warn',
        contact_id: String(agency.contactId),
        contact_name: agency.name,
        field: '',
        current_value: '',
        expected_value: '',
        action: 'skip_no_dates',
        note: 'Нет ни одной разобранной даты оплаты',
      });
      continue;
    }
    if (derived.revived) stats.revived++;

    let contactName = agency.name || '(unknown)';
    try {
      const response = await contactApi.getContactById({
        id: String(agency.contactId),
        fields: `id,name,${FIELDS.map(f => f.id).join(',')}`,
      });
      const contact = response.contact;
      if (!contact?.id) {
        stats.errors++;
        console.warn(`Contact not found: ${agency.contactId} (${contactName})`);
        addLogRow({
          level: 'error',
          contact_id: String(agency.contactId),
          contact_name: contactName,
          field: '',
          current_value: '',
          expected_value: '',
          action: 'contact_not_found',
          note: 'Планфикс не отдал контакт по номеру из отчёта',
        });
        continue;
      }
      contactName = contact.name ?? contactName;

      // Планфикс отдаёт в customFieldData только те поля, что есть в шаблоне контакта.
      // Писать в отсутствующее поле - 400 на весь запрос, поэтому такие поля отсеиваем,
      // иначе из-за одной "Даты возрождения" не запишутся и первая с последней.
      const available = new Set(
        ((contact as { customFieldData?: { field?: { id?: number } }[] }).customFieldData ?? [])
          .map(cf => cf.field?.id)
          .filter((id): id is number => typeof id === 'number'),
      );

      const changes: { fieldId: number; value: string }[] = [];
      for (const field of FIELDS) {
        if (!available.has(field.id)) {
          addLogRow({
            level: 'warn',
            contact_id: String(agency.contactId),
            contact_name: contactName,
            field: field.title,
            current_value: '',
            expected_value: derived[field.key] ?? '',
            action: 'skip_field_not_in_template',
            note: 'Поля нет в шаблоне контакта, писать некуда',
          });
          continue;
        }
        const expected = derived[field.key] ?? '';
        const current = getCurrentFieldValue(contact, field.id);
        if (current === expected) {
          stats.matched++;
          continue;
        }
        // Пустое ожидаемое значение не затираем: у агентства с одной оплатой нет
        // предпоследней даты, но если её кто-то проставил руками - это не повод стирать.
        if (!expected) {
          addLogRow({
            level: 'info',
            contact_id: String(agency.contactId),
            contact_name: contactName,
            field: field.title,
            current_value: current,
            expected_value: '',
            action: 'skip_empty_expected',
            note: 'Выводить нечего, текущее значение оставлено как есть',
          });
          continue;
        }
        stats.needUpdate++;
        changes.push({ fieldId: field.id, value: expected });
        addLogRow({
          level: current ? 'warn' : 'info',
          contact_id: String(agency.contactId),
          contact_name: contactName,
          field: field.title,
          current_value: current,
          expected_value: expected,
          action: opts.dryRun ? 'would_update' : 'update',
          note: current ? 'Значение перезаписано' : '',
        });
      }

      if (!changes.length) continue;

      if (opts.dryRun) {
        console.log(
          `[dry] ${contactName} (${agency.contactId}): ` +
            changes.map(c => `${c.fieldId}=${c.value}`).join(', '),
        );
        continue;
      }

      await updateContactFields(agency.contactId, changes);
      stats.updated++;
      console.log(
        `Updated ${contactName} (${agency.contactId}): ` +
          changes.map(c => `${c.fieldId}=${c.value}`).join(', '),
      );
    } catch (error) {
      stats.errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error on ${contactName} (${agency.contactId}): ${message}`);
      addLogRow({
        level: 'error',
        contact_id: String(agency.contactId),
        contact_name: contactName,
        field: '',
        current_value: '',
        expected_value: '',
        action: 'error',
        note: message,
      });
    }
  }

  writeLogCsv(opts.logCsv, logRows);

  console.log('---');
  console.log(`Report rows:          ${stats.reportRows}`);
  console.log(`Rows without agency:  ${stats.skippedInvalidId}`);
  console.log(`Agencies:             ${stats.agencies}`);
  console.log(`Agencies w/o dates:   ${stats.skippedNoDates}`);
  console.log(`Agencies revived:     ${stats.revived}`);
  console.log(`Fields already ok:    ${stats.matched}`);
  console.log(`Fields to update:     ${stats.needUpdate}`);
  console.log(`Contacts updated:     ${stats.updated}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log(`Log: ${opts.logCsv}`);
}

if (process.argv[1] && process.argv[1].includes('contacts-update-agency-payment-dates')) {
  contactsUpdateAgencyPaymentDates().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
