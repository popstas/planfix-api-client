import {
  ObjectApi,
  TaskApi,
  ComplexTaskFilterOperatorEnum,
  ComplexTaskFilterTypeEnum,
  TaskResponse,
} from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';

interface Options {
  templateId: number;
  managerFieldName: string;
  userId: number;
  dryRun: boolean;
}

const pageSize = 100;

let opts: Options;
let config: Configuration;
let objectApi: ObjectApi;
let taskApi: TaskApi;
let managerFieldId: number;

function parseArgs(args: string[]): Options {
  const options: Options = {
    templateId: 0,
    managerFieldName: 'Менеджер',
    userId: 0,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--templateId') {
      options.templateId = Number(args[++i]);
    } else if (arg === '--managerFieldName') {
      options.managerFieldName = args[++i];
    } else if (arg === '--userId') {
      options.userId = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }

  if (!options.templateId) {
    throw new Error('templateId is required');
  }
  if (!options.managerFieldName) {
    throw new Error('managerFieldName is required');
  }
  if (!options.userId) {
    throw new Error('userId is required');
  }

  return options;
}

function getManagerId(task: TaskResponse): string | undefined {
  const fieldValue = task.customFieldData?.find(
    cf => cf.field?.id === managerFieldId,
  )?.value as unknown;

  if (!fieldValue) {
    return undefined;
  }

  if (typeof fieldValue === 'number' || typeof fieldValue === 'string') {
    return String(fieldValue);
  }

  if (typeof fieldValue === 'object' && 'id' in fieldValue) {
    const value = (fieldValue as { id?: number | string | null }).id;
    if (value == null) {
      return undefined;
    }
    return String(value);
  }

  return undefined;
}

async function fetchManagerFieldId(): Promise<number> {
  console.log(`Loading template ${opts.templateId}`);
  const response = await objectApi.getObjectById({ id: opts.templateId });
  const template = response.object;
  if (!template) {
    throw new Error(`Template ${opts.templateId} not found`);
  }

  const field = template.customFieldData?.find(
    cf => cf.field?.name === opts.managerFieldName,
  );
  const fieldId = field?.field?.id;

  if (!fieldId) {
    throw new Error(
      `Field "${opts.managerFieldName}" not found in template ${opts.templateId}`,
    );
  }

  console.log(`Manager field id: ${fieldId}`);
  return fieldId;
}

async function fetchTasks(): Promise<TaskResponse[]> {
  const tasks: TaskResponse[] = [];
  let offset = 0;

  while (true) {
    const requestFields = `id,name,${managerFieldId}`;
    const response = await taskApi.getTaskList({
      getTaskListRequest: {
        pageSize,
        offset,
        fields: requestFields,
        filters: [
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_51,
            operator: ComplexTaskFilterOperatorEnum.Equal,
            value: opts.templateId,
          },
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_71,
            operator: ComplexTaskFilterOperatorEnum.Equal,
            value: opts.userId,
          },
        ],
      },
    });

    const batch = (response.tasks ?? []) as TaskResponse[];
    tasks.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return tasks;
}

async function setManagerForSubtasks(taskId: number, depth = 1): Promise<void> {
  let offset = 0;
  const userIdStr = String(opts.userId);

  while (true) {
    const response = await taskApi.getTaskList({
      getTaskListRequest: {
        pageSize,
        offset,
        fields: `id,name,${managerFieldId}`,
        filters: [
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_73,
            operator: ComplexTaskFilterOperatorEnum.Equal,
            value: taskId,
          },
        ],
      },
    });

    const subtasks = (response.tasks ?? []) as TaskResponse[];

    if (subtasks.length === 0) {
      break;
    }

    for (const subtask of subtasks) {
      const subtaskId = subtask.id;
      if (!subtaskId) {
        continue;
      }

      const managerId = getManagerId(subtask);
      if (managerId !== userIdStr) {
        const indent = '  '.repeat(depth);
        console.log(
          `${indent}Subtask ${subtaskId}${
            subtask.name ? ` (${subtask.name})` : ''
          }: manager ${managerId ?? 'none'} -> ${userIdStr}${
            opts.dryRun ? ' (dry run)' : ''
          }`,
        );

        if (!opts.dryRun) {
          await taskApi.postTaskById({
            id: subtaskId,
            taskUpdateRequest: {
              customFieldData: [
                {
                  field: { id: managerFieldId },
                  value: { id: opts.userId },
                },
              ],
            },
          });
        }
      }

      await setManagerForSubtasks(subtaskId, depth + 1);
    }

    if (subtasks.length < pageSize) {
      break;
    }

    offset += pageSize;
  }
}

export async function changeManagerInSubtasks() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  objectApi = new ObjectApi(config);
  taskApi = new TaskApi(config);

  managerFieldId = await fetchManagerFieldId();

  const tasks = await fetchTasks();
  const userIdStr = String(opts.userId);
  console.log(`Found ${tasks.length} tasks`);

  for (const task of tasks) {
    const taskId = task.id;
    if (!taskId) {
      continue;
    }

    const managerId = getManagerId(task);
    if (managerId !== userIdStr) {
      console.log(
        `Task ${taskId}${task.name ? ` (${task.name})` : ''} manager ${
          managerId ?? 'none'
        } != ${userIdStr}`,
      );
    }

    await setManagerForSubtasks(taskId);
  }
}

if (require.main === module) {
  changeManagerInSubtasks().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
