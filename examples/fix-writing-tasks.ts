import {
  TaskApi,
  ComplexTaskFilterOperatorEnum,
  ComplexTaskFilterTypeEnum,
  GetTaskListRequest,
  CustomFieldValueRequest,
} from '../src/generated';
import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';

interface Options {
  payTaskTemplateId: number;
  fieldIdAmount: number;
  fieldIdWorkType: number;
  csv: string;
}

interface CsvRow {
  [key: string]: string;
}

interface ResultRow {
  task_name: string;
  task_id: string;
  payment_task_id: string;
  amount: string;
  work_type_updated: string;
  message: string;
}

const WORK_TYPE_NAME = 'Написание статьи с последующей публикацией';

function parseArgs(args: string[]): Options {
  const opts: Options = {
    payTaskTemplateId: 0,
    fieldIdAmount: 0,
    fieldIdWorkType: 0,
    csv: 'data/writing-tasks.csv',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--payTaskTemplateId') {
      opts.payTaskTemplateId = Number(args[++i]);
    } else if (arg === '--fieldIdAmount') {
      opts.fieldIdAmount = Number(args[++i]);
    } else if (arg === '--fieldIdWorkType') {
      opts.fieldIdWorkType = Number(args[++i]);
    } else if (arg === '--csv') {
      opts.csv = args[++i];
    }
  }

  if (!opts.payTaskTemplateId) throw new Error('payTaskTemplateId is required');
  if (!opts.fieldIdAmount) throw new Error('fieldIdAmount is required');
  if (!opts.fieldIdWorkType) throw new Error('fieldIdWorkType is required');
  if (!opts.csv) throw new Error('csv is required');

  return opts;
}

function parseCsv(filePath: string): CsvRow[] {
  const text = fs.readFileSync(filePath, 'utf-8').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });
    return row;
  });
}

function ensureDirectory(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeCsv(filePath: string, rows: ResultRow[]) {
  const headers: (keyof ResultRow)[] = [
    'task_name',
    'task_id',
    'payment_task_id',
    'amount',
    'work_type_updated',
    'message',
  ];
  const lines = [headers.join(',')];

  const escape = (value: string) => {
    if (value == null) return '';
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  rows.forEach(row => {
    lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
  });

  ensureDirectory(filePath);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/\s+/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === 'object') {
    if ('value' in value) return toNumber((value as { value: unknown }).value);
    if ('amount' in value) return toNumber((value as { amount: unknown }).amount);
  }
  return undefined;
}

export async function fixWritingTasks() {
  const opts = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const taskApi = new TaskApi(config);
  const rows = parseCsv(opts.csv);
  const results: ResultRow[] = [];
  const outputCsv = opts.csv.replace(/\.csv$/i, '-result.csv');

  let index = 1;
  for (const row of rows) {
    const taskName = row.task_name ?? '';
    const taskIdStr = row.task_id ?? '';
    console.log(`\n${index}. ${taskName || '(no name)'} [${taskIdStr}]`);
    index++;

    const result: ResultRow = {
      task_name: taskName,
      task_id: taskIdStr,
      payment_task_id: '',
      amount: '',
      work_type_updated: 'no',
      message: '',
    };

    const taskId = Number(taskIdStr);
    if (!taskIdStr || !Number.isFinite(taskId)) {
      result.message = 'Invalid task_id';
      console.warn(`  Skipped: ${result.message}`);
      results.push(result);
      continue;
    }

    const request: GetTaskListRequest = {
      pageSize: 10,
      offset: 0,
      filters: [
        {
          type: ComplexTaskFilterTypeEnum.NUMBER_73,
          operator: ComplexTaskFilterOperatorEnum.Equal,
          value: taskId,
        },
        {
          type: ComplexTaskFilterTypeEnum.NUMBER_51,
          operator: ComplexTaskFilterOperatorEnum.Equal,
          value: opts.payTaskTemplateId,
        },
      ],
      fields: `id,name,${opts.fieldIdAmount}`,
    };

    let paymentTaskId: number | undefined;
    try {
      const list = await taskApi.getTaskList({ getTaskListRequest: request });
      const tasks = list.tasks ?? [];
      if (tasks.length !== 1) {
        result.message = tasks.length === 0
          ? 'Payment subtask not found'
          : `Expected 1 payment subtask, got ${tasks.length}`;
        console.warn(`  ${result.message}`);
        results.push(result);
        continue;
      }
      const paymentTask = tasks[0];
      paymentTaskId = paymentTask.id ?? undefined;
      result.payment_task_id = paymentTaskId ? String(paymentTaskId) : '';

      const amountField = paymentTask.customFieldData?.find(
        cf => cf.field?.id === opts.fieldIdAmount,
      );
      const amount = toNumber(amountField?.value);
      if (amount == null) {
        result.message = 'Amount not found in payment subtask';
        console.warn(`  ${result.message}`);
        results.push(result);
        continue;
      }
      result.amount = amount.toString();

      if (amount !== 150) {
        result.message = `Unexpected amount: ${amount}`;
        console.warn(`  ${result.message}`);
        results.push(result);
        continue;
      }

      const update: CustomFieldValueRequest = {
        field: { id: opts.fieldIdWorkType },
        value: WORK_TYPE_NAME,
      };

      await taskApi.postTaskById({
        id: taskId,
        taskUpdateRequest: {
          id: taskId,
          customFieldData: [update],
        },
      });

      result.work_type_updated = 'yes';
      result.message = 'Work type updated';
      console.log('  Work type updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.message = `Error: ${message}`;
      console.error(`  ${result.message}`);
    }

    results.push(result);
  }

  writeCsv(outputCsv, results);
  console.log(`\nSaved results to ${outputCsv}`);
}

if (require.main === module) {
  fixWritingTasks().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
