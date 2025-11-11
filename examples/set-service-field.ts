import { TaskApi, TaskResponse } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as fs from 'fs';
import * as path from 'path';

interface Options {
  csv: string;
  fieldId: number;
  dryRun: boolean;
  logCsv?: string;
}

interface InputRow {
  taskId: number;
}

interface LogRow {
  date: string;
  level: string;
  task_id: string;
  task_name: string;
  action: string;
  note: string;
}

let opts: Options;
let config: Configuration;
let taskApi: TaskApi;
let fieldId: number;
let logRows: LogRow[] = [];

function parseArgs(args: string[]): Options {
  const options: Options = {
    csv: 'data/service-field-ids.csv',
    fieldId: 0,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--csv') {
      options.csv = args[++i];
    } else if (arg === '--fieldId') {
      options.fieldId = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    } else if (arg === '--logCsv') {
      options.logCsv = args[++i];
    }
  }

  if (!options.csv) {
    throw new Error('csv is required');
  }
  if (!options.fieldId) {
    throw new Error('fieldId is required');
  }

  if (!options.logCsv) {
    options.logCsv = deriveLogPath(options.csv);
  }

  return options;
}

function deriveLogPath(csvPath: string): string {
  const extIndex = csvPath.lastIndexOf('.csv');
  if (extIndex === -1) {
    return `${csvPath}.log.csv`;
  }
  return `${csvPath.slice(0, extIndex)}-log.csv`;
}

function parseCsv(filePath: string): InputRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  const taskIdIndex = headers.findIndex(h => /^(task_id|taskId|id)$/i.test(h));
  if (taskIdIndex === -1) {
    throw new Error('CSV file must contain a task_id column');
  }

  return lines
    .slice(1)
    .filter(line => line.trim().length > 0)
    .map(line => {
      const values = line.split(',');
      const raw = values[taskIdIndex];
      const taskId = Number(raw?.trim());
      if (!Number.isFinite(taskId)) {
        throw new Error(`Invalid task id value: ${raw}`);
      }
      return { taskId };
    });
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function escapeCsv(value: string): string {
  if (value == null) {
    return '';
  }

  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  const needsQuotes = /[",\n]/.test(stringValue);
  const QUOTE = '"';
  return needsQuotes ? QUOTE + escaped + QUOTE : escaped;
}

function writeCsv(filePath: string, rows: LogRow[]) {
  if (!rows.length) {
    return;
  }

  ensureDirectory(filePath);

  const headers: (keyof LogRow)[] = [
    'date',
    'level',
    'task_id',
    'task_name',
    'action',
    'note',
  ];

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

  for (const row of rows) {
    lines.push(headers.map(header => escapeCsv(row[header] ?? '')).join(','));
  }

  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

function recordLogRow(row: Omit<LogRow, 'date'> & { date?: string }) {
  logRows.push({
    date: row.date ?? new Date().toISOString(),
    level: row.level,
    task_id: row.task_id,
    task_name: row.task_name,
    action: row.action,
    note: row.note,
  });
}

function isFieldTrue(task: TaskResponse, targetFieldId: number): boolean {
  const customValue = task.customFieldData?.find(
    cf => cf.field?.id === targetFieldId,
  )?.value as unknown;

  if (typeof customValue === 'boolean') {
    return customValue;
  }
  if (typeof customValue === 'number') {
    return customValue === 1;
  }
  if (typeof customValue === 'string') {
    return customValue === '1' || customValue.toLowerCase() === 'true';
  }
  if (customValue && typeof customValue === 'object' && 'id' in customValue) {
    const id = (customValue as { id?: number | string }).id;
    return id === 1 || id === '1';
  }

  return false;
}

async function updateTask(taskId: number) {
  try {
    const response = await taskApi.getTaskById({
      id: taskId,
      fields: `id,name,${fieldId}`,
    });
    const task = response.task;
    if (!task) {
      recordLogRow({
        level: 'error',
        task_id: String(taskId),
        task_name: '',
        action: 'skip',
        note: 'Task not found',
      });
      return;
    }

    const alreadyTrue = isFieldTrue(task, fieldId);
    const taskName = task.name ?? '';
    if (alreadyTrue) {
      recordLogRow({
        level: 'info',
        task_id: String(taskId),
        task_name: taskName,
        action: 'skip',
        note: 'Field already set to true',
      });
      return;
    }

    if (opts.dryRun) {
      console.log(`Would set field ${fieldId} to true for task ${taskId}`);
      recordLogRow({
        level: 'info',
        task_id: String(taskId),
        task_name: taskName,
        action: 'dry-run',
        note: 'Field would be set to true',
      });
      return;
    }

    await taskApi.postTaskById({
      id: taskId,
      taskUpdateRequest: {
        customFieldData: [
          {
            field: { id: fieldId },
            value: true,
          },
        ],
      },
    });

    recordLogRow({
      level: 'info',
      task_id: String(taskId),
      task_name: taskName,
      action: 'update',
      note: 'Field set to true',
    });
  } catch (error) {
    const err = error as Error;
    recordLogRow({
      level: 'error',
      task_id: String(taskId),
      task_name: '',
      action: 'error',
      note: err.message ?? String(error),
    });
  }
}

export async function setServiceField() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  taskApi = new TaskApi(config);
  logRows = [];

  const inputRows = parseCsv(opts.csv);
  console.log(`Loaded ${inputRows.length} task ids from ${opts.csv}`);

  try {
    fieldId = opts.fieldId;
    console.log(`Using field id ${fieldId}`);

    for (const row of inputRows) {
      await updateTask(row.taskId);
    }
  } finally {
    if (opts.logCsv) {
      writeCsv(opts.logCsv, logRows);
      logRows = [];
      console.log(`Log written to ${opts.logCsv}`);
    }
  }
}

if (require.main === module) {
  setServiceField().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
