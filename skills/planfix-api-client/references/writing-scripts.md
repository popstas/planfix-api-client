# Writing new example scripts (conventions)

The repo conventions (from `AGENTS.md`) for any new script under `examples/`. The helpers
shown here are exercised in
[`examples/skill-quickstart.ts`](../../../examples/skill-quickstart.ts) (`parseArgs()`,
`appendCsvLog()`, `lookupFieldIds()`), so they are compile-checked against the real
generated API. Treat `skill-quickstart.ts` as the canonical template to copy from.

See also: [api-surface.md](api-surface.md) (class map) · [querying.md](querying.md)
(reading) · [mutations.md](mutations.md) (writing + safe-mutation rules).

## Script skeleton

Every example follows the same shape (config → args → work → run-guard):

```ts
import { TaskApi } from '../src/generated';
import { loadConfig } from '../src/config';
import type { Configuration } from '../src/generated';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface Options {
  dryRun: boolean;
  // ...script-specific args...
}

function parseArgs(args: string[]): Options { /* see below */ }

export async function myScript(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const config: Configuration = loadConfig();
  const taskApi = new TaskApi(config);
  // ...work, gated behind opts.dryRun for any write...
}

// Run-guard: only auto-run when invoked directly (never on import).
function isMainModule(): boolean {
  if (typeof process === 'undefined' || !process.argv[1]) return false;
  const __filename = fileURLToPath(import.meta.url);
  return path.resolve(process.argv[1]) === path.resolve(__filename);
}
if (isMainModule()) {
  myScript().catch(err => { console.error(err); process.exitCode = 1; });
}
```

`loadConfig()` (in `src/config.ts`) reads `.env` (`PLANFIX_ACCOUNT`, `PLANFIX_TOKEN`) and
returns a `Configuration`. Build each `*Api` from that one config (see
[api-surface.md](api-surface.md)).

## `--dryRun` arg parsing (required for writes)

Parse flags by walking `process.argv.slice(2)`; values follow their flag. **Every script
that mutates data must accept `--dryRun`** (AGENTS.md). Pattern from
[`examples/contacts-migrate-telegram.ts`](../../../examples/contacts-migrate-telegram.ts):

```ts
function parseArgs(args: string[]): Options {
  const opts: Options = { dryRun: false, templateId: 0 };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dryRun') opts.dryRun = true;
    else if (arg === '--templateId') opts.templateId = Number(args[++i]);
  }
  if (!opts.templateId) throw new Error('templateId is required');
  return opts;
}
```

Under dry-run, build the request and log what *would* change — but never call any `postX`.
See the safe-mutation rules in [mutations.md](mutations.md).

## CSV logging to `data/*.csv`

Log every change to a `data/*.csv` audit trail so a run is reviewable and resumable
(AGENTS.md: "Add log to CSV, reference: change-manager-in-subtasks.ts"). The convention is
**header-if-empty + `fs.appendFileSync` + value escaping**, from
[`examples/change-manager-in-subtasks.ts`](../../../examples/change-manager-in-subtasks.ts):

```ts
import * as fs from 'fs';
import * as path from 'path';

function appendCsvLog(filePath: string, headers: string[], rows: string[][]): void {
  if (!rows.length) return;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const escape = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

  // Write the header only when the file is new/empty.
  const addHeader = !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
  const lines = addHeader ? [headers.join(',')] : [];
  for (const row of rows) lines.push(row.map(escape).join(','));
  fs.appendFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}
```

Batch rows in memory and flush once in a `finally` block so a partial run still leaves a
log (see `change-manager-in-subtasks.ts`).

## `fieldName → fieldId` lookup by template

Custom fields are addressed by numeric id, but scripts take human field **names** as args.
Resolve names to ids once, up front, from the template/object's `customFieldData`
(AGENTS.md: "When args contains fieldName, get fieldId by templateId and fieldName,
reference: change-manager-by-client.ts"):

```ts
import { ObjectApi } from '../src/generated';

async function lookupFieldIds(
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
```

Use the returned ids in `fields: 'id,name,<fieldId>'` (reading,
[querying.md](querying.md)) and in `customFieldData: [{ field: { id }, value }]` (writing,
[mutations.md](mutations.md)).

## Running a script

```bash
# Via the README convention:
npm run example -- ./examples/<file>.ts -- --dryRun

# Or directly with tsx (what the package.json scripts use):
npx tsx examples/<file>.ts --dryRun
```

Scripts that need fixed args get a named `package.json` script (e.g.
`npm run contacts-migrate-telegram`). After adding a new example, **add its description to
`README.md`** (AGENTS.md: "Add new example scripts description to README.md").

## Typecheck gate

Examples are outside `npm run build`. Typecheck the quickstart (and the symbols it cites):

```bash
npx tsc --noEmit -p tsconfig.skill.json
```

## Related references

- Class/method map: [api-surface.md](api-surface.md)
- Reading data: [querying.md](querying.md) · Writing data: [mutations.md](mutations.md)
- Endpoint catalog: [`docs/ENDPOINTS.md`](../../../docs/ENDPOINTS.md)
- RU↔EN terminology: [`docs/dictionary.md`](../../../docs/dictionary.md)
