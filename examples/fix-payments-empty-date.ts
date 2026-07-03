import { TaskApi, DataTagsApi } from '../src/generated';
import type { Configuration } from '../src/generated';
import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  csv: string;
  logCsv: string;
  dateFieldName: string;
  datatagId: number; // 0 = auto-detect the single analytics on the comment
  limit: number;
  dryRun: boolean;
}

interface CsvRow {
  taskId: number; // NaN if not parseable from the link
  commentId: number; // NaN if not parseable from the link
  linkRaw: string;
  commentDateRaw: string;
}

interface Stats {
  totalRows: number;
  skippedInvalidLink: number;
  skippedEmptyDate: number;
  skippedInvalidDate: number;
  commentNotFound: number;
  skippedNoDatatag: number;
  skippedAmbiguous: number;
  skippedNoDateField: number;
  matched: number; // already had a date
  needUpdate: number;
  updated: number;
  errors: number;
}

interface LogRow {
  date: string;
  level: string;
  task_id: string;
  comment_id: string;
  key: string;
  current_value: string;
  expected_value: string;
  action: string;
  note: string;
}

const defaultCsv = 'data/payments-empty-date.csv';
const defaultLogCsv = 'data/payments-empty-date-log.csv';
const defaultDateFieldName = 'Дата';

let opts: Options;
let config: Configuration;
let taskApi: TaskApi;
let dataTagsApi: DataTagsApi;
const logRows: LogRow[] = [];
// datatag id -> "Дата" field id, resolved once from the data tag definition
const dateFieldIdCache = new Map<number, number>();

function parseArgs(args: string[]): Options {
  const options: Options = {
    csv: defaultCsv,
    logCsv: defaultLogCsv,
    dateFieldName: defaultDateFieldName,
    datatagId: 0,
    limit: 0,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv') {
      options.csv = args[++i];
    } else if (arg === '--logCsv') {
      options.logCsv = args[++i];
    } else if (arg === '--dateFieldName') {
      options.dateFieldName = args[++i];
    } else if (arg === '--datatagId') {
      options.datatagId = Number(args[++i]);
    } else if (arg === '--limit') {
      options.limit = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }

  if (!options.csv) {
    throw new Error('csv is required');
  }
  if (!options.logCsv) {
    throw new Error('logCsv is required');
  }
  if (!options.dateFieldName) {
    throw new Error('dateFieldName is required');
  }
  if (!Number.isFinite(options.datatagId) || options.datatagId < 0) {
    throw new Error('datatagId must be a non-negative number');
  }
  if (!Number.isFinite(options.limit) || options.limit < 0) {
    throw new Error('limit must be a non-negative number');
  }

  return options;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result.map(v => v.trim());
}

// Accepts "DD-MM-YYYY" or "DD-MM-YYYY HH:mm"; returns the leading date part or ''.
function extractDatePart(value: string): string {
  const match = /^(\d{2}-\d{2}-\d{4})(?: \d{2}:\d{2}(?::\d{2})?)?$/.exec(value.trim());
  return match ? match[1] : '';
}

function parseCommentLink(link: string): { taskId: number; commentId: number } {
  const taskMatch = /\/task\/(\d+)/.exec(link);
  const commentMatch = /[?&]comment=(\d+)/.exec(link);
  return {
    taskId: taskMatch ? Number(taskMatch[1]) : NaN,
    commentId: commentMatch ? Number(commentMatch[1]) : NaN,
  };
}

function parseCsv(filePath: string): CsvRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8').replace(/^﻿/, '').trim();
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseDelimitedLine(lines[0], ';');
  const linkIndex = headers.indexOf('Ссылка на комментарий');
  const commentDateIndex = headers.indexOf('Дата комментария');

  if (linkIndex === -1) {
    throw new Error('CSV header "Ссылка на комментарий" not found');
  }
  if (commentDateIndex === -1) {
    throw new Error('CSV header "Дата комментария" not found');
  }

  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) {
      continue;
    }

    const values = parseDelimitedLine(line, ';');
    const linkRaw = (values[linkIndex] ?? '').trim();
    const commentDateRaw = (values[commentDateIndex] ?? '').trim();

    if (!linkRaw) {
      // Fully empty trailing rows: skip silently.
      if (!commentDateRaw) {
        continue;
      }
      rows.push({ taskId: NaN, commentId: NaN, linkRaw, commentDateRaw });
      continue;
    }

    const { taskId, commentId } = parseCommentLink(linkRaw);
    rows.push({ taskId, commentId, linkRaw, commentDateRaw });
  }

  return rows;
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
  if (!rows.length) {
    return;
  }

  ensureDirectory(filePath);
  const headers: (keyof LogRow)[] = [
    'date',
    'level',
    'task_id',
    'comment_id',
    'key',
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
  logRows.push({
    date: new Date().toISOString(),
    ...row,
  });
}

// Normalize a custom-field value to a trimmed string for emptiness checks.
function normalizeFieldValue(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Planfix date fields may come back as { date, datetime }.
    if (typeof obj.date === 'string') {
      return obj.date.trim();
    }
    if (typeof obj.datetime === 'string') {
      return obj.datetime.trim();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value).trim();
}

// Resolve (and cache) the "Дата" field id for a data tag from its definition.
async function resolveDateFieldId(datatagId: number): Promise<number | undefined> {
  const cached = dateFieldIdCache.get(datatagId);
  if (cached != null) {
    return cached;
  }

  const response = await dataTagsApi.getDatatagId({ id: datatagId, fields: 'id,name,fields' });
  const fields = response.dataTag?.fields ?? [];
  const target = opts.dateFieldName.trim().toLowerCase();
  const field = fields.find(f => (f.name ?? '').trim().toLowerCase() === target);

  if (field?.id != null) {
    dateFieldIdCache.set(datatagId, field.id);
    return field.id;
  }

  return undefined;
}

async function updateEntryDate(key: number, dateFieldId: number, value: string): Promise<void> {
  await dataTagsApi.postUpdateDataTagEntry({
    key,
    silent: true,
    dataTagEntryUpdateRequest: {
      customFieldData: [
        {
          field: { id: dateFieldId },
          // Planfix date fields accept an object with a DD-MM-YYYY "date" part.
          value: { date: value } as unknown as object,
        },
      ],
    },
  });
}

async function formatApiError(error: unknown): Promise<string> {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const errAny = error as any;
  const status = errAny?.response?.status;
  const statusText = errAny?.response?.statusText;
  const responseData = errAny?.response?.data;
  let responseText = '';

  if (errAny?.response?.text && !errAny?.response?.bodyUsed) {
    try {
      responseText = await errAny.response.text();
    } catch {
      responseText = '';
    }
  }

  if (status != null || responseData != null) {
    const statusPart = status != null ? `status ${status}${statusText ? ` ${statusText}` : ''}` : '';
    let dataPart = '';

    if (typeof responseData === 'string') {
      dataPart = responseData;
    } else if (responseData != null) {
      try {
        dataPart = JSON.stringify(responseData);
      } catch {
        dataPart = String(responseData);
      }
    }

    return [error.message, statusPart, dataPart, responseText].filter(Boolean).join(' | ');
  }

  return [error.message, responseText].filter(Boolean).join(' | ');
}

export async function fixPaymentsEmptyDate() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  taskApi = new TaskApi(config);
  dataTagsApi = new DataTagsApi(config);

  const stats: Stats = {
    totalRows: 0,
    skippedInvalidLink: 0,
    skippedEmptyDate: 0,
    skippedInvalidDate: 0,
    commentNotFound: 0,
    skippedNoDatatag: 0,
    skippedAmbiguous: 0,
    skippedNoDateField: 0,
    matched: 0,
    needUpdate: 0,
    updated: 0,
    errors: 0,
  };

  if (opts.dryRun) {
    console.log('DRY RUN MODE: no data will be modified');
  }

  console.log(`Reading CSV: ${opts.csv}`);
  const rows = parseCsv(opts.csv);
  stats.totalRows = rows.length;
  console.log(`Rows loaded: ${rows.length}`);
  if (opts.datatagId > 0) {
    console.log(`Datatag filter: ${opts.datatagId}`);
  }
  if (opts.limit > 0) {
    console.log(`Limit: ${opts.limit}`);
  }

  const rowsToProcess = opts.limit > 0 ? rows.slice(0, opts.limit) : rows;
  for (const row of rowsToProcess) {
    const taskIdStr = Number.isFinite(row.taskId) ? String(row.taskId) : '';
    const commentIdStr = Number.isFinite(row.commentId) ? String(row.commentId) : '';

    if (!Number.isFinite(row.taskId) || !Number.isFinite(row.commentId)) {
      stats.skippedInvalidLink++;
      const note = `Cannot parse task/comment id from link "${row.linkRaw}"`;
      console.warn(`Skip row: ${note}`);
      addLogRow({
        level: 'warn',
        task_id: taskIdStr,
        comment_id: commentIdStr,
        key: '',
        current_value: '',
        expected_value: row.commentDateRaw,
        action: 'skip_invalid_link',
        note,
      });
      continue;
    }

    if (!row.commentDateRaw) {
      stats.skippedEmptyDate++;
      addLogRow({
        level: 'warn',
        task_id: taskIdStr,
        comment_id: commentIdStr,
        key: '',
        current_value: '',
        expected_value: '',
        action: 'skip_empty_date',
        note: 'Empty comment date in CSV',
      });
      continue;
    }

    const expectedDate = extractDatePart(row.commentDateRaw);
    if (!expectedDate) {
      stats.skippedInvalidDate++;
      const note = `Invalid comment date "${row.commentDateRaw}" (expected DD-MM-YYYY[ HH:mm])`;
      console.warn(`Skip comment ${row.commentId}: ${note}`);
      addLogRow({
        level: 'warn',
        task_id: taskIdStr,
        comment_id: commentIdStr,
        key: '',
        current_value: '',
        expected_value: row.commentDateRaw,
        action: 'skip_invalid_date',
        note,
      });
      continue;
    }

    try {
      const commentsResponse = await taskApi.getTaskComments({
        id: row.taskId,
        getContactCommentsRequest: { fields: 'id,dataTags', pageSize: 100 },
      });
      const comments = commentsResponse.comments ?? [];
      const comment = comments.find(c => c.id === row.commentId);

      if (!comment) {
        stats.commentNotFound++;
        const note = `Comment ${row.commentId} not found on task ${row.taskId}`;
        console.warn(note);
        addLogRow({
          level: 'error',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: '',
          current_value: '',
          expected_value: expectedDate,
          action: 'comment_not_found',
          note,
        });
        continue;
      }

      const allTags = comment.dataTags ?? [];
      const candidates = opts.datatagId > 0
        ? allTags.filter(t => t.dataTag?.id === opts.datatagId)
        : allTags;

      if (candidates.length === 0) {
        stats.skippedNoDatatag++;
        const note = opts.datatagId > 0
          ? `No analytics with datatag ${opts.datatagId} on comment ${row.commentId}`
          : `No analytics on comment ${row.commentId}`;
        console.warn(note);
        addLogRow({
          level: 'warn',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: '',
          current_value: '',
          expected_value: expectedDate,
          action: 'skip_no_datatag',
          note,
        });
        continue;
      }

      if (candidates.length > 1) {
        stats.skippedAmbiguous++;
        const tagIds = candidates.map(t => t.dataTag?.id).join(',');
        const note = `Multiple analytics on comment ${row.commentId} (datatags: ${tagIds}); pass --datatagId to disambiguate`;
        console.warn(note);
        addLogRow({
          level: 'warn',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: '',
          current_value: '',
          expected_value: expectedDate,
          action: 'skip_ambiguous_datatag',
          note,
        });
        continue;
      }

      const tag = candidates[0];
      const key = tag.key;
      const datatagId = tag.dataTag?.id;

      if (key == null || datatagId == null) {
        stats.skippedNoDatatag++;
        const note = `Analytics entry on comment ${row.commentId} has no key/datatag id`;
        console.warn(note);
        addLogRow({
          level: 'warn',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: key != null ? String(key) : '',
          current_value: '',
          expected_value: expectedDate,
          action: 'skip_no_datatag',
          note,
        });
        continue;
      }

      const dateFieldId = await resolveDateFieldId(datatagId);
      if (dateFieldId == null) {
        stats.skippedNoDateField++;
        const note = `Date field "${opts.dateFieldName}" not found in datatag ${datatagId}`;
        console.warn(note);
        addLogRow({
          level: 'error',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: String(key),
          current_value: '',
          expected_value: expectedDate,
          action: 'skip_no_date_field',
          note,
        });
        continue;
      }

      const entryResponse = await dataTagsApi.getDatatagEntryKey({
        key,
        fields: `key,${dateFieldId}`,
      });
      const entry = entryResponse.entry;
      const currentRaw = entry?.customFieldData?.find(cf => cf.field?.id === dateFieldId)?.value;
      const currentValue = normalizeFieldValue(currentRaw);

      if (currentValue) {
        stats.matched++;
        addLogRow({
          level: 'info',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: String(key),
          current_value: currentValue,
          expected_value: expectedDate,
          action: 'already_matched',
          note: 'Date already set, no changes needed',
        });
        continue;
      }

      stats.needUpdate++;
      if (opts.dryRun) {
        console.log(
          `[DRY RUN] task ${row.taskId} comment ${row.commentId} key ${key}: "" -> "${expectedDate}"`,
        );
        addLogRow({
          level: 'info',
          task_id: taskIdStr,
          comment_id: commentIdStr,
          key: String(key),
          current_value: '',
          expected_value: expectedDate,
          action: 'dry_run_update',
          note: 'Would set date',
        });
        continue;
      }

      await updateEntryDate(key, dateFieldId, expectedDate);
      stats.updated++;
      console.log(`Updated task ${row.taskId} comment ${row.commentId} key ${key} -> ${expectedDate}`);
      addLogRow({
        level: 'info',
        task_id: taskIdStr,
        comment_id: commentIdStr,
        key: String(key),
        current_value: '',
        expected_value: expectedDate,
        action: 'updated',
        note: 'Date set',
      });
    } catch (error) {
      stats.errors++;
      const details = await formatApiError(error);
      console.error(`Failed task ${row.taskId} comment ${row.commentId}: ${details}`);
      addLogRow({
        level: 'error',
        task_id: taskIdStr,
        comment_id: commentIdStr,
        key: '',
        current_value: '',
        expected_value: expectedDate,
        action: 'failed',
        note: details,
      });
    }
  }

  writeLogCsv(opts.logCsv, logRows);

  console.log('\nDone.');
  console.log(`Total rows: ${stats.totalRows}`);
  console.log(`Skipped (invalid link): ${stats.skippedInvalidLink}`);
  console.log(`Skipped (empty date): ${stats.skippedEmptyDate}`);
  console.log(`Skipped (invalid date): ${stats.skippedInvalidDate}`);
  console.log(`Comment not found: ${stats.commentNotFound}`);
  console.log(`Skipped (no analytics): ${stats.skippedNoDatatag}`);
  console.log(`Skipped (ambiguous analytics): ${stats.skippedAmbiguous}`);
  console.log(`Skipped (no date field): ${stats.skippedNoDateField}`);
  console.log(`Already had date: ${stats.matched}`);
  console.log(`Need update: ${stats.needUpdate}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Errors: ${stats.errors}`);
  console.log(`Log saved: ${opts.logCsv}`);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  fixPaymentsEmptyDate().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
