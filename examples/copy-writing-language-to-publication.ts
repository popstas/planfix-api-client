/**
 * Copy the "Язык написания" (writing language) field from published writing tasks
 * (СМИ writings and scientific writings) into their child "Публикация" task.
 *
 * For each writing object (template) we take the latest N tasks in status
 * "Опубликовано", look for a child task of the "Публикация" template, and — if found —
 * copy the writing-language value into the publication's same-named field.
 *
 * Field / status ids are resolved by name at runtime, so only template ids are required:
 *
 *   npx tsx examples/copy-writing-language-to-publication.ts \
 *     --smiWritingTemplateId <id> \
 *     --sciWritingTemplateId 1375571 \
 *     --publicationTemplateId <id> \
 *     [--languageFieldName "Язык написания"] \
 *     [--statusName "Опубликовано"] \
 *     [--limit 100] [--overwrite] [--csv data/copy-writing-language.csv] [--dryRun]
 *
 * At least one writing template id and --publicationTemplateId are required.
 * Every write is gated behind --dryRun and logged to a CSV audit trail.
 */
import {
  ObjectApi,
  TaskApi,
  ComplexTaskFilterOperatorEnum,
  ComplexTaskFilterTypeEnum,
  GetTaskListRequest,
  TaskResponse,
  Configuration,
} from '../src/generated';
import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  smiWritingTemplateId: number;
  sciWritingTemplateId: number;
  publicationTemplateId: number;
  languageFieldName: string;
  statusName: string;
  limit: number;
  maxCopies: number; // stop after this many real copies (0 = unlimited)
  overwrite: boolean;
  csv: string;
  dryRun: boolean;
}

interface WritingTemplate {
  kind: string; // 'smi' | 'science'
  templateId: number;
}

interface LangCell {
  id?: number; // dictionary/enum value id, when the field is a directory
  display: string; // human-readable value, for logs/compare
  writeValue: object; // shape accepted by customFieldData[].value
}

interface LogRow {
  date: string;
  writing_kind: string;
  writing_id: string;
  writing_name: string;
  writing_lang: string;
  publication_id: string;
  publication_lang_before: string;
  action: string;
  message: string;
}

const pageSize = 100;

let opts: Options;
let config: Configuration;
let objectApi: ObjectApi;
let taskApi: TaskApi;
let logRows: LogRow[] = [];
let copiesDone = 0;

function copyLimitReached(): boolean {
  return opts.maxCopies > 0 && copiesDone >= opts.maxCopies;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    smiWritingTemplateId: 0,
    sciWritingTemplateId: 0,
    publicationTemplateId: 0,
    languageFieldName: 'Язык написания',
    statusName: 'Опубликовано',
    limit: 100,
    maxCopies: 0,
    overwrite: false,
    csv: 'data/copy-writing-language.csv',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--smiWritingTemplateId') {
      options.smiWritingTemplateId = Number(args[++i]);
    } else if (arg === '--sciWritingTemplateId') {
      options.sciWritingTemplateId = Number(args[++i]);
    } else if (arg === '--publicationTemplateId') {
      options.publicationTemplateId = Number(args[++i]);
    } else if (arg === '--languageFieldName') {
      options.languageFieldName = args[++i];
    } else if (arg === '--statusName') {
      options.statusName = args[++i];
    } else if (arg === '--limit') {
      options.limit = Number(args[++i]);
    } else if (arg === '--maxCopies') {
      options.maxCopies = Number(args[++i]);
    } else if (arg === '--overwrite') {
      options.overwrite = true;
    } else if (arg === '--csv') {
      options.csv = args[++i];
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }

  if (!options.publicationTemplateId) {
    throw new Error('publicationTemplateId is required');
  }
  if (!options.smiWritingTemplateId && !options.sciWritingTemplateId) {
    throw new Error('at least one of --smiWritingTemplateId / --sciWritingTemplateId is required');
  }
  if (!options.languageFieldName) throw new Error('languageFieldName is required');
  if (!options.statusName) throw new Error('statusName is required');
  if (!options.limit || options.limit < 1) throw new Error('limit must be a positive number');
  if (!options.csv) throw new Error('csv is required');

  return options;
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeCsv(filePath: string, rows: LogRow[]) {
  if (!rows.length) return;

  const headers: (keyof LogRow)[] = [
    'date',
    'writing_kind',
    'writing_id',
    'writing_name',
    'writing_lang',
    'publication_id',
    'publication_lang_before',
    'action',
    'message',
  ];

  const escape = (value: string) => {
    if (value == null) return '';
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  ensureDirectory(filePath);

  const addHeader = !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
  const lines: string[] = addHeader ? [headers.join(',')] : [];
  rows.forEach(row => {
    lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
  });

  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function recordLogRow(row: Omit<LogRow, 'date'>) {
  logRows.push({ date: new Date().toISOString(), ...row });
}

/** Resolve a custom field id by its human name within an object template. */
async function getFieldIdByName(templateId: number, name: string): Promise<number> {
  const response = await objectApi.getObjectById({ id: templateId });
  const template = response.object;
  if (!template) throw new Error(`template ${templateId} not found`);

  const field = template.customFieldData?.find(cf => cf.field?.name === name);
  const fieldId = field?.field?.id;
  if (!fieldId) {
    throw new Error(`field "${name}" not found in template ${templateId}`);
  }
  return fieldId;
}

/** Resolve a task-status id by name for an object template's status set. */
async function getStatusIdByName(templateId: number, name: string): Promise<number> {
  const response = await objectApi.getObjectTaskStatusList({ id: templateId, fields: 'id,name' });
  const status = (response.statuses ?? []).find(s => s.name === name);
  if (!status?.id) {
    throw new Error(`status "${name}" not found in template ${templateId}`);
  }
  return status.id;
}

/** Read the language cell from a task; null when empty/unset. */
function getLangCell(task: TaskResponse, fieldId: number): LangCell | null {
  const v = task.customFieldData?.find(cf => cf.field?.id === fieldId)?.value as unknown;
  if (v == null || v === '') return null;

  if (typeof v === 'object' && v !== null && 'id' in v) {
    const id = (v as { id?: number | string | null }).id;
    const value = (v as { value?: unknown }).value;
    if (id == null) return null;
    return {
      id: Number(id),
      display: value != null ? String(value) : String(id),
      writeValue: { id: Number(id) },
    };
  }

  // Plain text / number field.
  return { display: String(v), writeValue: v as unknown as object };
}

function sameLang(a: LangCell, b: LangCell): boolean {
  if (a.id != null && b.id != null) return a.id === b.id;
  return a.display === b.display;
}

/** Latest N published writing tasks for a template (sorted by id desc ~ newest first). */
async function fetchPublishedWritings(
  templateId: number,
  statusId: number,
  langFieldId: number,
  limit: number,
): Promise<TaskResponse[]> {
  const all: TaskResponse[] = [];
  let offset = 0;

  while (true) {
    const request: GetTaskListRequest = {
      pageSize,
      offset,
      fields: `id,name,status,${langFieldId}`,
      filters: [
        {
          type: ComplexTaskFilterTypeEnum.NUMBER_51, // template / object
          operator: ComplexTaskFilterOperatorEnum.Equal,
          value: templateId,
        },
        {
          type: ComplexTaskFilterTypeEnum.NUMBER_10, // status
          operator: ComplexTaskFilterOperatorEnum.Equal,
          value: statusId,
        },
      ],
    };
    const response = await taskApi.getTaskList({ getTaskListRequest: request });
    const batch = (response.tasks ?? []) as TaskResponse[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  // The list API exposes no sort param, so sort client-side by id desc and take the
  // latest `limit` (task id grows with creation order).
  all.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  return all.slice(0, limit);
}

/** Find the child Публикация task of a writing task, if any. */
async function findChildPublication(
  parentId: number,
  pubLangFieldId: number,
): Promise<TaskResponse | undefined> {
  const request: GetTaskListRequest = {
    pageSize: 10,
    offset: 0,
    fields: `id,name,status,${pubLangFieldId}`,
    filters: [
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_73, // parent task
        operator: ComplexTaskFilterOperatorEnum.Equal,
        value: parentId,
      },
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_51, // template / object
        operator: ComplexTaskFilterOperatorEnum.Equal,
        value: opts.publicationTemplateId,
      },
    ],
  };
  const response = await taskApi.getTaskList({ getTaskListRequest: request });
  const children = response.tasks ?? [];
  if (children.length > 1) {
    console.warn(`  Warning: expected 1 publication child, got ${children.length}. Using the first.`);
  }
  return children[0];
}

async function processWritingTemplate(
  tmpl: WritingTemplate,
  langFieldId: number,
  pubLangFieldId: number,
) {
  const statusId = await getStatusIdByName(tmpl.templateId, opts.statusName);
  console.log(
    `\n=== ${tmpl.kind} (template ${tmpl.templateId}): status "${opts.statusName}"=${statusId}, langField=${langFieldId} ===`,
  );

  const writings = await fetchPublishedWritings(tmpl.templateId, statusId, langFieldId, opts.limit);
  console.log(`Found ${writings.length} writing tasks (latest ${opts.limit}).`);

  for (const writing of writings) {
    if (copyLimitReached()) {
      console.log(`  Reached maxCopies=${opts.maxCopies}, stopping.`);
      break;
    }
    const writingId = writing.id ?? 0;
    const writingName = writing.name ?? '';
    if (!writingId) continue;

    const base = {
      writing_kind: tmpl.kind,
      writing_id: String(writingId),
      writing_name: writingName,
      writing_lang: '',
      publication_id: '',
      publication_lang_before: '',
    };

    const writingLang = getLangCell(writing, langFieldId);
    if (!writingLang) {
      recordLogRow({ ...base, action: 'skip', message: 'writing has no language' });
      continue;
    }
    base.writing_lang = writingLang.display;

    const publication = await findChildPublication(writingId, pubLangFieldId);
    if (!publication?.id) {
      recordLogRow({ ...base, action: 'skip', message: 'no publication child' });
      continue;
    }
    const publicationId = publication.id;
    base.publication_id = String(publicationId);

    const pubLang = getLangCell(publication, pubLangFieldId);
    base.publication_lang_before = pubLang?.display ?? '';

    if (pubLang && sameLang(pubLang, writingLang)) {
      recordLogRow({ ...base, action: 'skip', message: 'publication already has same language' });
      continue;
    }
    if (pubLang && !opts.overwrite) {
      recordLogRow({
        ...base,
        action: 'skip',
        message: 'publication has different language (use --overwrite)',
      });
      continue;
    }

    console.log(
      `  Writing ${writingId} "${writingName}" lang="${writingLang.display}" -> publication ${publicationId}` +
        (opts.dryRun ? ' (dry run)' : ''),
    );

    if (opts.dryRun) {
      recordLogRow({ ...base, action: 'dry-run', message: `would set language "${writingLang.display}"` });
      continue;
    }

    try {
      await taskApi.postTaskById({
        id: publicationId,
        taskUpdateRequest: {
          id: publicationId,
          customFieldData: [{ field: { id: pubLangFieldId }, value: writingLang.writeValue }],
        },
        silent: true,
      });
      copiesDone++;
      recordLogRow({ ...base, action: 'update', message: `set language "${writingLang.display}"` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      recordLogRow({ ...base, action: 'error', message });
      console.error(`  Error updating publication ${publicationId}: ${message}`);
    }
  }
}

export async function copyWritingLanguageToPublication() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  objectApi = new ObjectApi(config);
  taskApi = new TaskApi(config);
  logRows = [];

  if (opts.dryRun) console.log('DRY RUN MODE: no tasks will be modified');

  const templates: WritingTemplate[] = [];
  if (opts.smiWritingTemplateId) {
    templates.push({ kind: 'smi', templateId: opts.smiWritingTemplateId });
  }
  if (opts.sciWritingTemplateId) {
    templates.push({ kind: 'science', templateId: opts.sciWritingTemplateId });
  }

  try {
    // Resolve the language field id on the publication (child) template once.
    const pubLangFieldId = await getFieldIdByName(opts.publicationTemplateId, opts.languageFieldName);
    console.log(`Publication language field id: ${pubLangFieldId}`);

    for (const tmpl of templates) {
      if (copyLimitReached()) break;
      const langFieldId = await getFieldIdByName(tmpl.templateId, opts.languageFieldName);
      await processWritingTemplate(tmpl, langFieldId, pubLangFieldId);
    }
  } finally {
    writeCsv(opts.csv, logRows);
    console.log(`\nLogged ${logRows.length} rows to ${opts.csv}`);
    logRows = [];
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  copyWritingLanguageToPublication().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
