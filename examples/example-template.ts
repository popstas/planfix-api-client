/**
 * Эталонный скрипт — копируй этот файл, чтобы создать новый example-скрипт.
 * Canonical template for new example scripts: copy it, rename the entry
 * function, adjust args/filters/mutation. Import shared helpers from
 * `examples/lib` — do not copy-paste helper code into the script.
 *
 * What it demonstrates (the full canonical cycle):
 *   loadConfig → parseArgs → fieldName→fieldId lookup → paginated read with
 *   ComplexTaskFilter → dryRun-gated postTaskById → CSV audit log flushed in
 *   `finally` → run-guard.
 *
 * What it does: for tasks of --templateId, sets custom field --fieldName to
 * --value where it differs. Harmless under --dryRun (only reads + logs).
 *
 * Run:
 *   npx tsx examples/example-template.ts --dryRun --templateId <id> --fieldName <имя поля> --limit 3
 * Typecheck (includes examples/lib):
 *   npx tsc --noEmit -p tsconfig.skill.json
 *
 * Rules for new scripts (AGENTS.md):
 *   - every mutating script accepts --dryRun and never calls postX under it;
 *   - log every change to data/*.csv (appendCsvLog/createCsvLogger);
 *   - resolve field names to ids via lookupFieldIds(templateId, names);
 *   - add the new script's description to README.md.
 */

import {
  ComplexTaskFilter,
  ComplexTaskFilterOperatorEnum,
  ComplexTaskFilterTypeEnum,
} from '../src/generated';
import { loadConfig } from '../src/config';
import {
  buildApis,
  createCsvLogger,
  formatApiError,
  getStringFieldValue,
  lookupFieldIds,
  paginate,
  parseArgs,
  runExample,
  sleep,
} from './lib';

const ARG_SPEC = {
  dryRun: { type: 'boolean', description: 'log what would change, send nothing' },
  templateId: { type: 'number', required: true, description: 'task template id' },
  fieldName: { type: 'string', required: true, description: 'custom field name in the template' },
  value: { type: 'string', default: 'example', description: 'value to write into the field' },
  csv: { type: 'string', default: 'data/example-template-log.csv', description: 'audit log path' },
  limit: { type: 'number', default: 10, description: 'max tasks to process' },
} as const;

export async function exampleTemplate(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2), ARG_SPEC);
  const { taskApi, objectApi } = buildApis(loadConfig());

  // Resolve human field names to numeric ids once, up front.
  const fieldIds = await lookupFieldIds(objectApi, opts.templateId, [opts.fieldName]);
  const fieldId = fieldIds.get(opts.fieldName)!;

  const filters: ComplexTaskFilter[] = [
    {
      type: ComplexTaskFilterTypeEnum.NUMBER_51, // template / object
      operator: ComplexTaskFilterOperatorEnum.Equal,
      value: opts.templateId,
    },
  ];

  const log = createCsvLogger(opts.csv, [
    'date', 'task_id', 'task_name', 'old_value', 'new_value', 'dry_run', 'status',
  ]);
  let updated = 0;
  let skipped = 0;

  try {
    const tasks = paginate(
      (offset, pageSize) =>
        taskApi
          .getTaskList({
            getTaskListRequest: {
              offset,
              pageSize,
              filters,
              fields: `id,name,${fieldId}`,
            },
          })
          .then(r => r.tasks ?? []),
      { limit: opts.limit },
    );

    for await (const task of tasks) {
      if (!task.id) continue;
      const oldValue = getStringFieldValue(task, fieldId) ?? '';
      const logRow = (status: string) =>
        log.add([
          new Date().toISOString(),
          String(task.id),
          task.name ?? '',
          oldValue,
          opts.value,
          String(opts.dryRun),
          status,
        ]);

      if (oldValue === opts.value) {
        skipped++;
        logRow('skip_same_value');
        continue;
      }

      if (opts.dryRun) {
        console.log(`[dryRun] task ${task.id} "${task.name}": "${oldValue}" -> "${opts.value}"`);
        logRow('would_update');
        continue;
      }

      try {
        await taskApi.postTaskById({
          id: task.id,
          silent: true,
          taskUpdateRequest: {
            customFieldData: [
              // The generated type declares `value: object`, but Planfix accepts
              // plain strings/numbers here — hence the cast.
              { field: { id: fieldId }, value: opts.value as unknown as object },
            ],
          },
        });
        updated++;
        logRow('updated');
        console.log(`task ${task.id} "${task.name}": "${oldValue}" -> "${opts.value}"`);
        await sleep(500); // rate-limit between writes
      } catch (error) {
        logRow('error');
        console.error(`task ${task.id}: ${await formatApiError(error)}`);
      }
    }
  } finally {
    // Flush even on a partial run so the audit trail stays reviewable.
    log.flush();
  }

  console.log(`Done: ${updated} updated, ${skipped} skipped, log: ${opts.csv}`);
}

runExample(import.meta.url, exampleTemplate);
