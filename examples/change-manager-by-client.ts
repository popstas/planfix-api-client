import { ObjectApi, TaskApi, ComplexTaskFilterOperatorEnum, ComplexTaskFilterTypeEnum, TaskResponse } from '../src/generated';
import { loadConfig } from '../src/config';
import * as fs from 'fs';

interface Options {
  csv: string;
  taskCol: string;
  managerCol: string;
  managerFieldName: string;
  clientFieldName: string;
  templateId: number;
}

function parseArgs(args: string[]): Options {
  const opts: Options = {
    csv: '',
    taskCol: 'task',
    managerCol: 'manager',
    managerFieldName: '',
    clientFieldName: '',
    templateId: 0,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--csv') {
      opts.csv = args[++i];
    } else if (a === '--taskCol') {
      opts.taskCol = args[++i];
    } else if (a === '--managerCol') {
      opts.managerCol = args[++i];
    } else if (a === '--managerFieldName') {
      opts.managerFieldName = args[++i];
    } else if (a === '--clientFieldName') {
      opts.clientFieldName = args[++i];
    } else if (a === '--templateId') {
      opts.templateId = Number(args[++i]);
    }
  }
  if (!opts.csv) throw new Error('csv is required');
  if (!opts.managerFieldName) throw new Error('managerFieldName is required');
  if (!opts.clientFieldName) throw new Error('clientFieldName is required');
  if (!opts.templateId) throw new Error('templateId is required');
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

export async function changeManagerByClient() {
  const opts = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const objectApi = new ObjectApi(config);
  const taskApi = new TaskApi(config);

  console.log(`Load object ${opts.templateId}`);
  const objResp = await objectApi.getObjectById({ id: opts.templateId });
  const object = objResp.object;
  if (!object) throw new Error('object not found');

  const fieldMap = new Map<string, number>();
  object.customFieldData?.forEach(cf => {
    const id = cf.field?.id;
    const name = cf.field?.name;
    if (id && name) fieldMap.set(name, id);
  });

  const managerFieldId = fieldMap.get(opts.managerFieldName);
  const clientFieldId = fieldMap.get(opts.clientFieldName);
  if (!managerFieldId || !clientFieldId) {
    throw new Error('field ids not found');
  }
  console.log(`Manager field id: ${managerFieldId}, client field id: ${clientFieldId}`);

  const rows = parseCsv(opts.csv);
  for (const row of rows) {
    await changeManager(row);
  }

  async function changeManager(row: Record<string, string>) {
    const taskName = row[opts.taskCol];
    const managerName = row[opts.managerCol];
    console.log(`Processing task "${taskName}" manager "${managerName}"`);

    const list = await taskApi.getTaskList({
      getTaskListRequest: {
        fields: `id,name,${managerFieldId},${clientFieldId}`,
        filters: [
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_8,
            operator: ComplexTaskFilterOperatorEnum.Equal,
            value: taskName,
          },
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_19,
            operator: ComplexTaskFilterOperatorEnum.Equal,
            value: opts.templateId,
          },
        ],
      },
    });

    const tasks = list.objects ?? [];
    if (tasks.length !== 1) {
      console.warn(`Expected exactly one task, got ${tasks.length} for ${taskName}`);
      return;
    }

    const task = tasks[0];
    const managerId = task.customFieldData?.find(cf => cf.field?.id === managerFieldId)?.value as number | undefined;
    const clientId = task.customFieldData?.find(cf => cf.field?.id === clientFieldId)?.value as number | undefined;
    if (!clientId) {
      console.warn(`Client not found in task ${task.id}`);
      return;
    }
    console.log(`Task id ${task.id} manager ${managerId} client ${clientId}`);

    const clientTasks = await taskApi.getTaskList({
      getTaskListRequest: {
        fields: `id,name,${managerFieldId},${clientFieldId}`,
        filters: [
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_109,
            operator: ComplexTaskFilterOperatorEnum.Equal,
            value: clientId,
            field: clientFieldId,
          },
          {
            type: ComplexTaskFilterTypeEnum.NUMBER_109,
            operator: ComplexTaskFilterOperatorEnum.Notequal,
            value: managerId ?? 0,
            field: managerFieldId,
          },
        ],
      },
    });

    for (const ct of clientTasks.objects ?? []) {
      await setManager(ct, managerId);
    }
  }

  async function setManager(task: TaskResponse, managerId: number | undefined) {
    if (!task.id || managerId == null) return;
    const existing = task.customFieldData?.find(cf => cf.field?.id === managerFieldId)?.value as number | undefined;
    if (existing === managerId) {
      console.log(`Task ${task.id} already has manager ${managerId}`);
      return;
    }
    console.log(`Updating task ${task.id}: manager ${existing} -> ${managerId}`);
    await taskApi.postTaskById({
      id: task.id,
      taskUpdateRequest: {
        customFieldData: [{ field: { id: managerFieldId }, value: managerId }],
      },
    });
  }
}

if (require.main === module) {
  changeManagerByClient().catch(err => console.error(err));
}
