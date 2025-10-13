import {
  TaskApi,
  ComplexTaskFilterOperatorEnum,
  ComplexTaskFilterTypeEnum,
  GetTaskListRequest,
  CustomFieldValueRequest,
  TaskResponse,
  Configuration,
} from '../src/generated';
import { loadConfig } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';

interface Options {
  payTaskTemplateId: number;
  writingTaskTemplateId: number;
  fieldIdAmount: number;
  fieldWorktypeWithPublishValue: number;
  fieldWorktypeWithoutPublishValue: number;
  fieldIdWorkType: number;
  fieldIdSmi: number;
  csv: string;
  dryRun: boolean;
}

interface CsvRow {
  [key: string]: string;
}

interface ResultRow {
  date: string;
  task_name: string;
  task_id: string;
  status: string;
  payment_task_id: string;
  amount: string;
  work_type_updated: string;
  smi: string;
  message: string;
}

const pageSize = 5;

let opts: Options;
let config: Configuration;
let taskApi: TaskApi;

function parseArgs(args: string[]): Options {
  const opts: Options = {
    payTaskTemplateId: 0,
    writingTaskTemplateId: 0,
    fieldIdAmount: 0,
    fieldWorktypeWithPublishValue: 0,
    fieldWorktypeWithoutPublishValue: 0,
    fieldIdWorkType: 0,
    fieldIdSmi: 0,
    csv: 'data/writing-tasks.csv',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--payTaskTemplateId') {
      opts.payTaskTemplateId = Number(args[++i]);
    } else if (arg === '--writingTaskTemplateId') {
      opts.writingTaskTemplateId = Number(args[++i]);
    } else if (arg === '--fieldIdAmount') {
      opts.fieldIdAmount = Number(args[++i]);
    } else if (arg === '--fieldWorktypeWithPublishValue') {
      opts.fieldWorktypeWithPublishValue = Number(args[++i]);
    } else if (arg === '--fieldWorktypeWithoutPublishValue') {
      opts.fieldWorktypeWithoutPublishValue = Number(args[++i]);
    } else if (arg === '--fieldIdWorkType') {
      opts.fieldIdWorkType = Number(args[++i]);
    } else if (arg === '--fieldIdSmi') {
      opts.fieldIdSmi = Number(args[++i]);
    } else if (arg === '--csv') {
      opts.csv = args[++i];
    } else if (arg === '--dryRun') {
      opts.dryRun = true;
    }
  }

  if (!opts.payTaskTemplateId) throw new Error('payTaskTemplateId is required');
  if (!opts.writingTaskTemplateId) throw new Error('writingTaskTemplateId is required');
  if (!opts.fieldIdAmount) throw new Error('fieldIdAmount is required');
  if (!opts.fieldWorktypeWithPublishValue) throw new Error('fieldWorktypeWithPublishValue is required');
  if (!opts.fieldWorktypeWithoutPublishValue) throw new Error('fieldWorktypeWithoutPublishValue is required');
  if (!opts.fieldIdWorkType) throw new Error('fieldIdWorkType is required');
  if (!opts.fieldIdSmi) throw new Error('fieldIdSmi is required');
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
    'date',
    'task_name',
    'task_id',
    'status',
    'payment_task_id',
    'amount',
    'work_type_updated',
    'smi',
    'message',
  ];
  const lines: string[] = [];

  const escape = (value: string) => {
    if (value == null) return '';
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Check if file exists
  if (fs.existsSync(filePath)) {
    // Read existing file
    const existingContent = fs.readFileSync(filePath, 'utf-8').trim();
    if (existingContent) {
      const existingLines = existingContent.split(/\r?\n/);
      // If file has content, check if first line contains headers
      const firstLine = existingLines[0];
      if (firstLine && firstLine.includes('task_name')) {
        // File already has headers, just append the new rows
        rows.forEach(row => {
          lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
        });
      } else {
        // File exists but no headers, add headers first, then rows
        lines.push(headers.join(','));
        rows.forEach(row => {
          lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
        });
      }
    } else {
      // File exists but is empty, create with headers and rows
      // lines.push(headers.join(','));
      rows.forEach(row => {
        lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
      });
    }
  } else {
    // File doesn't exist, create with headers and rows
    lines.push(headers.join(','));
    rows.forEach(row => {
      lines.push(headers.map(header => escape(row[header] ?? '')).join(','));
    });
  }

  if (lines.length > 0) {
    ensureDirectory(filePath);
    fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
  }
}

async function getTasksList(taskApi: TaskApi, opts: Options): Promise<TaskResponse[]> {
  const request: GetTaskListRequest = {
    pageSize,
    offset: 0,
    filters: [
      // template
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_51,
        operator: ComplexTaskFilterOperatorEnum.Equal,
        value: opts.writingTaskTemplateId,
      },
      // without work type
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_107,
        operator: ComplexTaskFilterOperatorEnum.Equal,
        value: '',
        field: opts.fieldIdWorkType,
      },
      // not closed
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_10,
        operator: ComplexTaskFilterOperatorEnum.Notequal,
        value: [
          3,   // closed
          7,   // cancelled
          220, // published
        ],
      },
    ],
    fields: `id,name,status,${opts.fieldIdWorkType},${opts.fieldIdSmi}`,
  };
  const list = await taskApi.getTaskList({ getTaskListRequest: request });
  return list.tasks as TaskResponse[] ?? [];
}

export async function fixWritingTasks() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  taskApi = new TaskApi(config);

  // const rows = parseCsv(opts.csv);
  const results: ResultRow[] = [];

  if (opts.dryRun) {
    console.log('DRY RUN MODE: No tasks will be modified');
  }

  await processRows(results);

}

async function processRows(allResults: ResultRow[]) {
  const results: ResultRow[] = [];
  const tasks = await getTasksList(taskApi, opts);
  if (tasks.length === 0) {
    console.log('No tasks found');
    return;
  }

  let index = 1;
  for (const task of tasks) {
    const taskId = task.id || 0;
    const taskName = task.name ?? '';
    console.log(`\n${index}. ${taskName || '(no name)'} - https://${process.env.PLANFIX_ACCOUNT}.planfix.com/task/${taskId}
${task.status?.name}`);
    index++;

    const result: ResultRow = {
      date: new Date().toISOString(),
      task_name: taskName,
      task_id: `${taskId}`,
      status: task?.status?.name || '',
      payment_task_id: '',
      amount: '',
      work_type_updated: 'no',
      message: '',
      smi: '',
    };

    const smiValue = task.customFieldData?.find(
      cf => cf.field?.id === opts.fieldIdSmi,
    )?.value as { id: number; value: string };
    const smiId = smiValue?.id || 0;
    if (smiId === 0) {
      result.message = 'Smi not found in task';
      console.warn(`  ${result.message}`);
      results.push(result);
      continue;
    }
    if (smiId === 280) { // not selected
      await updateTaskWorktype(result, taskId, opts, opts.fieldWorktypeWithoutPublishValue);
      result.message = 'Smi not selected';
      console.warn(`  ${result.message}`);
      results.push(result);
      continue;
    }
    result.smi = smiValue?.value ?? '';

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
      fields: `id,name,status,${opts.fieldIdAmount},${opts.fieldIdSmi}`,
    };

    let paymentTaskId: number | undefined;
    try {
      const list = await taskApi.getTaskList({ getTaskListRequest: request });
      const tasks = list.tasks ?? [];
      if (tasks.length > 1) {
        result.message = `Expected 1 payment subtask, got ${tasks.length}`;
        console.warn(`  ${result.message}`);
        results.push(result);
        continue;
      }
      if (tasks.length === 0) {
        await updateTaskWorktype(result, taskId, opts, opts.fieldWorktypeWithPublishValue);
        results.push(result);
        continue;
      }
        
      const paymentTask = tasks[0];
      paymentTaskId = paymentTask.id ?? undefined;
      result.payment_task_id = paymentTaskId ? String(paymentTaskId) : '';

      const amountStr = paymentTask.customFieldData?.find(
        cf => cf.field?.id === opts.fieldIdAmount,
      )?.value as unknown as string;
      const amount = Number(amountStr);
      result.amount = amount.toString();
      if (!amount) {
        result.message = 'Amount not found in payment subtask';
        if (paymentTask.status?.name === 'Оплачено полностью') {
          result.message = 'Payment task is already paid';
          console.warn(`  ${result.message}`);
        }
        else if (paymentTask.status?.name === 'Отмененная') {
          result.message = 'Payment task is canceled';
          console.warn(`  ${result.message}`);
        }
        else {
          console.warn(`  ${result.message}`);
          results.push(result);
          continue;
        }
      }
      else if (amount !== 150) {
        result.message = `Unexpected amount: ${amount}`;
        console.warn(`  ${result.message}`);
        results.push(result);
        continue;
      }

      await updateTaskWorktype(result, taskId, opts, opts.fieldWorktypeWithPublishValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.message = `Error: ${message}`;
      console.error(`  ${result.message}`);
    }

    results.push(result);
  }

  const outputCsv = opts.csv.replace(/\.csv$/i, '-result.csv');
  writeCsv(outputCsv, results);
  // console.log(`\nSaved results to ${outputCsv}`);

  allResults.push(...results);
  console.log('processed rows: ', allResults.length);
  setTimeout(() => processRows(allResults), 1000);
}

async function updateTaskWorktype(result: ResultRow, taskId: number, opts: Options, valueId: number) {
  const updateWorkType: CustomFieldValueRequest = {
    field: { id: opts.fieldIdWorkType },
    value: { id: valueId },
  };

  if (opts.dryRun) {
    result.work_type_updated = 'would update';
    result.message = 'Work type would be updated (dry run)';
    console.log('  Work type would be updated (dry run)');
  } else {
    await taskApi.postTaskById({
      id: taskId,
      taskUpdateRequest: {
        id: taskId,
        customFieldData: [updateWorkType],
      },
    });

    result.work_type_updated = 'yes';
    if (!result.message) result.message = 'Work type updated';
    console.log('  Work type updated');
  }
}

if (require.main === module) {
  fixWritingTasks().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
