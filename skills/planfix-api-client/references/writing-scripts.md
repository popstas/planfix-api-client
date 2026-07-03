# Writing new example scripts (conventions)

The repo conventions (from `AGENTS.md`) for any new script under `examples/`.

**Copy [`examples/example-template.ts`](../../../examples/example-template.ts)** — it is
the canonical template: config → typed args → fieldId lookup → paginated read →
dryRun-gated mutation → CSV audit log → run-guard. All helpers are **imported from
[`examples/lib`](../../../examples/lib/)** — never copy-paste helper code between scripts.
(`examples/skill-quickstart.ts` is only the compile-check harness for these docs, not the
file to copy.)

See also: [api-surface.md](api-surface.md) (class map) · [querying.md](querying.md)
(reading) · [mutations.md](mutations.md) (writing + safe-mutation rules).

## Script skeleton

Every script follows the same shape (config → args → work → run-guard):

```ts
import { ComplexTaskFilter, ComplexTaskFilterOperatorEnum, ComplexTaskFilterTypeEnum } from '../src/generated';
import { loadConfig } from '../src/config';
import {
  buildApis, createCsvLogger, formatApiError, getStringFieldValue,
  lookupFieldIds, paginate, parseArgs, runExample, sleep,
} from './lib';

const ARG_SPEC = {
  dryRun: { type: 'boolean' },
  templateId: { type: 'number', required: true },
  fieldName: { type: 'string', required: true },
  csv: { type: 'string', default: 'data/my-script-log.csv' },
  limit: { type: 'number', default: 10 },
} as const;

export async function myScript(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2), ARG_SPEC); // typed: opts.templateId is number
  const { taskApi, objectApi } = buildApis(loadConfig());
  // ...work, gated behind opts.dryRun for any write...
}

runExample(import.meta.url, myScript); // run-guard: only auto-runs when invoked directly
```

`loadConfig()` (in `src/config.ts`) reads `.env` (`PLANFIX_ACCOUNT`, `PLANFIX_TOKEN`) and
returns a `Configuration`; `buildApis()` builds the common `*Api` instances from it (see
[api-surface.md](api-surface.md)).

## Shared helper library `examples/lib`

| Module | Exports | Use for |
| --- | --- | --- |
| `args.ts` | `parseArgs(argv, spec)` | Typed `--flag` parsing; throws on unknown/missing/NaN; `required` + `default` per flag. **Every mutating script must accept `--dryRun`** (AGENTS.md). |
| `csv.ts` | `appendCsvLog`, `createCsvLogger`, `writeCsvFile`, `parseCsv`, `readCsvFile`, `escapeCsvValue`, `ensureDirectory` | Audit logs to `data/*.csv` (header-if-empty + append) and RFC-4180 CSV reading (quotes, `""`, embedded newlines, BOM, `,`/`;`). |
| `fields.ts` | `lookupFieldIds`, `lookupStatusIdByName`, `getCustomFieldValue`, `getStringFieldValue`, `isFieldTrue`, `getDictionaryValue`, `getIdSetFieldValue`, `getDateFieldValue` | fieldName→fieldId by template; extracting every custom-field value shape Planfix returns. |
| `paginate.ts` | `paginate(fetchPage, {pageSize, limit, fixedOffset})`, `collectAll` | The canonical offset loop for `getTaskList`/`getContactList`/directory entries. |
| `api.ts` | `buildApis(config)`, `formatApiError(error)` | One `Configuration` → `{taskApi, contactApi, objectApi, cfTaskApi}`; error messages incl. HTTP status/body. |
| `run.ts` | `runExample(import.meta.url, main)`, `isMainModule`, `sleep` | Run-guard + `process.exitCode = 1` on failure; rate-limit between writes. |

Key patterns:

```ts
// fieldName → fieldId, once, up front (throws when a name is missing):
const fieldIds = await lookupFieldIds(objectApi, opts.templateId, [opts.fieldName]);
const fieldId = fieldIds.get(opts.fieldName)!;

// Pagination — adapter closure works for any list endpoint:
for await (const task of paginate(
  (offset, pageSize) =>
    taskApi.getTaskList({ getTaskListRequest: { offset, pageSize, filters, fields: `id,name,${fieldId}` } })
      .then(r => r.tasks ?? []),
  { limit: opts.limit },
)) { /* ... */ }

// CSV audit log — batch in memory, flush in `finally` so partial runs keep the log:
const log = createCsvLogger(opts.csv, ['date', 'task_id', 'old_value', 'new_value', 'dry_run', 'status']);
try { /* log.add([...]) per item */ } finally { log.flush(); }
```

Under dry-run, build the request and log what *would* change — but never call any `postX`.
See the safe-mutation rules in [mutations.md](mutations.md).

Use looked-up ids in `fields: 'id,name,<fieldId>'` (reading, [querying.md](querying.md))
and in `customFieldData: [{ field: { id }, value }]` (writing, [mutations.md](mutations.md)).
Note: the generated type declares `value: object` — cast plain strings/numbers
(`value as unknown as object`), as `example-template.ts` does.

## Running a script

```bash
# Run with tsx (what the package.json scripts use):
npx tsx examples/<file>.ts --dryRun
```

Scripts that need fixed args get a named `package.json` script (e.g.
`npm run contacts-migrate-telegram`). After adding a new example, **add its description to
`README.md`** (AGENTS.md: "Add new example scripts description to README.md").

## Typecheck gate

Examples are outside `npm run build`. `tsconfig.skill.json` typechecks the quickstart,
the shared lib and the template — every helper and API symbol these docs cite:

```bash
npx tsc --noEmit -p tsconfig.skill.json
```

## Related references

- Class/method map: [api-surface.md](api-surface.md)
- Reading data: [querying.md](querying.md) · Writing data: [mutations.md](mutations.md)
- Endpoint catalog: [`docs/ENDPOINTS.md`](../../../docs/ENDPOINTS.md)
- RU↔EN terminology: [`docs/dictionary.md`](../../../docs/dictionary.md)
