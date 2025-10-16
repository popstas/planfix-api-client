import {
  TaskApi,
  CommentsApi,
  ComplexTaskFilterOperatorEnum,
  ComplexTaskFilterTypeEnum,
  GetTaskListRequest,
  TaskResponse,
  Configuration,
} from '../src/generated';
import { loadConfig } from '../src/config';

interface Options {
  publishingTaskTemplateId: number;
  paymentTaskTemplateId: number;
  fieldIdService: number;
  datatagId: number;
  dryRun: boolean;
}

interface FalsePaidEntry {
  id: number;
  name: string;
}

const pageSize = 50;

let opts: Options;
let config: Configuration;
let taskApi: TaskApi;
let commentsApi: CommentsApi;

function parseArgs(args: string[]): Options {
  const options: Options = {
    publishingTaskTemplateId: 0,
    paymentTaskTemplateId: 0,
    fieldIdService: 0,
    datatagId: 0,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--publishingTaskTemplateId') {
      options.publishingTaskTemplateId = Number(args[++i]);
    } else if (arg === '--paymentTaskTemplateId') {
      options.paymentTaskTemplateId = Number(args[++i]);
    } else if (arg === '--fieldIdService') {
      options.fieldIdService = Number(args[++i]);
    } else if (arg === '--datatagId') {
      options.datatagId = Number(args[++i]);
    } else if (arg === '--dryRun') {
      options.dryRun = true;
    }
  }

  if (!options.publishingTaskTemplateId) {
    throw new Error('publishingTaskTemplateId is required');
  }
  if (!options.paymentTaskTemplateId) {
    throw new Error('paymentTaskTemplateId is required');
  }
  if (!options.fieldIdService) {
    throw new Error('fieldIdService is required');
  }
  if (!options.datatagId) {
    throw new Error('datatagId is required');
  }

  return options;
}

function isServiceEnabled(task: TaskResponse): boolean {
  const customValue = task.customFieldData?.find(
    cf => cf.field?.id === opts.fieldIdService,
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
    // Some boolean fields are represented as dictionary values
    const id = (customValue as { id?: number | string }).id;
    return id === 1 || id === '1';
  }
  return false;
}

async function fetchPublishingTasks(): Promise<TaskResponse[]> {
  const tasks: TaskResponse[] = [];
  let offset = 0;

  while (true) {
    const request: GetTaskListRequest = {
      pageSize,
      offset,
      fields: `id,name,${opts.fieldIdService}`,
      filters: [
        {
          type: ComplexTaskFilterTypeEnum.NUMBER_51,
          operator: ComplexTaskFilterOperatorEnum.Equal,
          value: opts.publishingTaskTemplateId,
        },
        {
          type: ComplexTaskFilterTypeEnum.NUMBER_109,
          operator: ComplexTaskFilterOperatorEnum.Equal,
          value: 1,
          field: opts.fieldIdService,
        },
      ],
    };

    const response = await taskApi.getTaskList({ getTaskListRequest: request });
    const batch = (response.tasks ?? []) as TaskResponse[];
    tasks.push(...batch.filter(isServiceEnabled));

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return tasks;
}

async function findPaymentSubtask(parentTaskId: number): Promise<TaskResponse | undefined> {
  const request: GetTaskListRequest = {
    pageSize: 10,
    offset: 0,
    filters: [
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_73,
        operator: ComplexTaskFilterOperatorEnum.Equal,
        value: parentTaskId,
      },
      {
        type: ComplexTaskFilterTypeEnum.NUMBER_51,
        operator: ComplexTaskFilterOperatorEnum.Equal,
        value: opts.paymentTaskTemplateId,
      },
    ],
    fields: 'id,name,status',
  };

  const response = await taskApi.getTaskList({ getTaskListRequest: request });
  const subtasks = response.tasks ?? [];
  if (subtasks.length > 1) {
    console.warn(
      `  Warning: expected at most 1 payment subtask, got ${subtasks.length}. Using the first one.`,
    );
  }
  return subtasks[0];
}

async function deleteCommentWithDatatag(taskId: number): Promise<number | undefined> {
  const commentsResponse = await taskApi.getTaskComments({ id: taskId });
  const comments = commentsResponse.comments ?? [];

  const comment = comments.find(c =>
    c.dataTags?.some(tag => tag.dataTag?.id === opts.datatagId),
  );

  if (!comment || !comment.id) {
    console.log('  No comment with specified datatag found');
    return undefined;
  }

  if (opts.dryRun) {
    console.log(`  Would delete comment ${comment.id} with datatag ${opts.datatagId} (dry run)`);
    return comment.id;
  }

  await commentsApi.deleteCommentId({ id: comment.id });
  console.log(`  Deleted comment ${comment.id} with datatag ${opts.datatagId}`);
  return comment.id;
}

async function disableServiceField(task: TaskResponse): Promise<boolean> {
  const taskId = task.id;
  if (!taskId) {
    return false;
  }

  if (!isServiceEnabled(task)) {
    console.log('  Service field already disabled');
    return false;
  }

  if (opts.dryRun) {
    console.log('  Would set service field to false (dry run)');
    return true;
  }

  await taskApi.postTaskById({
    id: taskId,
    taskUpdateRequest: {
      id: taskId,
      customFieldData: [
        {
          field: { id: opts.fieldIdService },
          value: false,
        },
      ],
    },
  });

  console.log('  Service field set to false');
  return true;
}

export async function fixPublicationsWithFalsePaid() {
  opts = parseArgs(process.argv.slice(2));
  config = loadConfig();
  taskApi = new TaskApi(config);
  commentsApi = new CommentsApi(config);

  if (opts.dryRun) {
    console.log('DRY RUN MODE: No data will be modified');
  }

  const tasks = await fetchPublishingTasks();
  if (tasks.length === 0) {
    console.log('No publishing tasks with service enabled found.');
    return;
  }

  console.log(`Found ${tasks.length} publishing tasks to process.`);

  const falsePaidList: FalsePaidEntry[] = [];

  for (const task of tasks) {
    const taskId = task.id ?? 0;
    const taskName = task.name ?? '(no name)';
    console.log(`\nProcessing task ${taskName} (${taskId})`);

    const paymentSubtask = await findPaymentSubtask(taskId);
    if (paymentSubtask) {
      console.log(`  Payment subtask found: ${paymentSubtask.id}`);
      await disableServiceField(task);
      continue;
    }

    console.log('  No payment subtask found. Adding to false paid list.');
    falsePaidList.push({ id: taskId, name: taskName });

    await deleteCommentWithDatatag(taskId);

    await disableServiceField(task);
  }

  if (falsePaidList.length > 0) {
    console.log('\nTasks without payment subtasks (false paid list):');
    for (const entry of falsePaidList) {
      console.log(`  - ${entry.name} (${entry.id})`);
    }
  } else {
    console.log('\nAll publishing tasks had payment subtasks.');
  }
}

if (require.main === module) {
  fixPublicationsWithFalsePaid().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
