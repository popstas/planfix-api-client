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
import type { PostTaskByIdRequest } from '../src/generated/apis/TaskApi';
import type { PostContactByIdRequest, PostContactRequest } from '../src/generated/apis/ContactApi';
import { loadConfig } from '../src/config';
import type {
  Configuration,
  ComplexTaskFilter,
  TaskResponse,
  ContactResponse,
} from '../src/generated';
import * as fs from 'fs';
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
 * CSV audit-log helper documented in `references/writing-scripts.md`. Convention from
 * `examples/change-manager-in-subtasks.ts`: write a header only when the file is new/empty,
 * escape values, and append. New write scripts log each change so a run is reviewable.
 */
export function appendCsvLog(filePath: string, headers: string[], rows: string[][]): void {
  if (!rows.length) return;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

  const addHeader = !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
  const lines = addHeader ? [headers.join(',')] : [];
  for (const row of rows) lines.push(row.map(escape).join(','));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * `fieldName → fieldId` lookup documented in `references/writing-scripts.md`. Convention
 * from `examples/change-manager-by-client.ts`: resolve human field names to numeric ids
 * once from a template's `customFieldData` (via `getObjectById`). Proves the `ObjectApi`
 * read path the writing-scripts doc cites.
 */
export async function lookupFieldIds(
  objectApi: ObjectApi,
  templateId: number,
  names: string[],
): Promise<Map<string, number>> {
  const resp = await objectApi.getObjectById({ id: templateId });
  const object = resp.object;
  if (!object) throw new Error(`template ${templateId} not found`);

  const byName = new Map<string, number>();
  object.customFieldData?.forEach(cf => {
    const id = cf.field?.id;
    const name = cf.field?.name;
    if (id && name) byName.set(name, id);
  });

  for (const name of names) {
    if (!byName.has(name)) throw new Error(`field "${name}" not found in template ${templateId}`);
  }
  return byName;
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

/**
 * Reading patterns documented in `references/querying.md`. NOT called by the run-guard's
 * live path — it exists so `tsc` validates the read method names and request/response
 * shapes (`getXListRequest` wrapper, the response array field, get-by-id params).
 */
export async function readExamples(apis: ReturnType<typeof buildApis>): Promise<void> {
  const { taskApi, contactApi } = apis;

  // Pagination: offset/pageSize loop, break on a short or empty page
  // (pattern from `examples/contacts-export.ts`).
  const pageSize = 100;
  let offset = 0;
  const allTasks: TaskResponse[] = [];
  while (true) {
    const page = await taskApi.getTaskList({
      getTaskListRequest: { offset, pageSize, fields: 'id,name' },
    });
    const tasks = page.tasks ?? []; // response array lives in `.tasks`
    allTasks.push(...tasks);
    if (tasks.length < pageSize) break; // short/empty page → done
    offset += pageSize;
  }

  // Complex filters: pass `filters: ComplexTaskFilter[]` in the list request.
  const filters: ComplexTaskFilter[] = [
    { type: 2, operator: 'equal', value: 5 }, // type 2 = assignee (USER); value = user id
  ];
  await taskApi.getTaskList({
    getTaskListRequest: { offset: 0, pageSize: 1, fields: 'id,name', filters },
  });

  // Contact list (response array lives in `.contacts`).
  const contactPage = await contactApi.getContactList({
    getContactListRequest: { offset: 0, pageSize: 1, fields: 'id,name' },
  });
  const contacts: ContactResponse[] = contactPage.contacts ?? [];

  // Get-by-id: `getTaskById` takes a numeric id; `getContactById` takes a string id.
  if (allTasks[0]?.id != null) {
    const one = await taskApi.getTaskById({ id: allTasks[0].id, fields: 'id,name' });
    console.log(`Task: ${one.task?.name ?? ''}`);
  }
  if (contacts[0]?.id != null) {
    const c = await contactApi.getContactById({ id: String(contacts[0].id), fields: 'id,name' });
    console.log(`Contact: ${c.contact?.name ?? ''}`);
  }
}

/**
 * Writing patterns documented in `references/mutations.md`. This function NEVER dispatches a
 * mutation: the `postX` request objects are constructed so `tsc` validates the update method
 * names and request body shapes (`postTaskById`/`postContactById`/`postContact`, the
 * `taskUpdateRequest`/`contactRequest` bodies, the `silent` flag, and the typed
 * `customFieldData: [{ field: { id }, value }]` custom-field shape), and the calls live in a
 * closure that is referenced (so its signatures are typechecked) but never invoked. This keeps
 * the file's "No mutation is ever sent" contract intact even if this export is called directly.
 */
export async function updateExamples(
  apis: ReturnType<typeof buildApis>,
  opts: Options,
): Promise<void> {
  const { taskApi, contactApi } = apis;

  // Update a task (id is a number). Includes a typed custom-field update.
  const taskUpdate: PostTaskByIdRequest = {
    id: 123,
    silent: true,
    taskUpdateRequest: {
      name: 'Renamed task',
      // `value` is typed `object` in the generated model; wrap primitives (arrays count).
      customFieldData: [{ field: { id: 385 }, value: ['Industrial'] }],
    },
  };

  // Update a contact (id is a string).
  const contactUpdate: PostContactByIdRequest = {
    id: '456',
    silent: true,
    contactRequest: { telegram: '@newhandle' },
  };

  // Create/upsert a contact via postContact (no id in path; id inside body upserts).
  const contactCreate: PostContactRequest = {
    contactRequest: {
      name: 'New Contact',
      customFieldData: [{ field: { id: 385 }, value: ['x'] }],
    },
  };

  // Safe mutation practice (documented in references/mutations.md): real write scripts gate every
  // send behind `--dryRun`. This compile-checked quickstart goes further and sends nothing at all.
  console.log(`[constructed-only] dryRun=${opts.dryRun}; mutation requests typechecked, never sent.`);

  // The closure below is referenced (`void` it) but never invoked, so `tsc` still validates that
  // `postTaskById` / `postContactById` / `postContact` exist and accept these request shapes —
  // without ever dispatching a write.
  const typecheckMutations = async (): Promise<void> => {
    await taskApi.postTaskById(taskUpdate);
    await contactApi.postContactById(contactUpdate);
    await contactApi.postContact(contactCreate);
  };
  void typecheckMutations;
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
