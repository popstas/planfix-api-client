/**
 * skill-quickstart.ts — canonical reference example for the `planfix-api-client` skill.
 *
 * Purpose: this file is the compile-checked companion of the skill docs under
 * `skills/planfix-api-client/`. Every `*Api` class, method name, and request/response
 * field cited in those docs is exercised here so `tsc` proves the docs match the real
 * generated API surface.
 *
 * Verification gate (examples are NOT part of `npm run build`, which only compiles
 * `src/**`): typecheck with the dedicated config that includes this file —
 *
 *     npx tsc --noEmit -p tsconfig.skill.json
 *
 * Safety: the run-guard performs ONLY a harmless read (`getTaskList` with `pageSize: 1`).
 * No mutation is ever sent from this file — write request shapes are constructed for
 * typechecking only (added in later tasks), never dispatched.
 */
import { TaskApi, ContactApi, ObjectApi, CustomFieldsTaskApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  dryRun: boolean;
}

function parseArgs(args: string[]): Options {
  const options: Options = { dryRun: false };
  for (const arg of args) {
    if (arg === '--dryRun') options.dryRun = true;
  }
  return options;
}

/**
 * Harmless read: fetch a single task to confirm config + connectivity.
 * Never mutates anything, so running this file accidentally is safe.
 */
async function harmlessRead(taskApi: TaskApi): Promise<void> {
  const response = await taskApi.getTaskList({
    getTaskListRequest: {
      offset: 0,
      pageSize: 1,
      fields: 'id,name',
    },
  });
  const tasks = response.tasks ?? [];
  console.log(`Fetched ${tasks.length} task(s).`);
}

/**
 * Instantiate the primary `*Api` classes the skill docs reference. This proves the class
 * names in `references/api-surface.md` are accurate (one `Configuration`, reused). The
 * instances are returned so other (typecheck-only) example functions can use them.
 */
function buildApis(config: Configuration) {
  return {
    taskApi: new TaskApi(config),
    contactApi: new ContactApi(config),
    objectApi: new ObjectApi(config),
    cfTaskApi: new CustomFieldsTaskApi(config),
  };
}

export async function skillQuickstart(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const config: Configuration = loadConfig();
  const { taskApi } = buildApis(config);

  console.log(`dryRun=${opts.dryRun}`);
  await harmlessRead(taskApi);
}

function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}

if (isMainModule()) {
  skillQuickstart().catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
}
