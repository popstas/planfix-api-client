# Updating / writing data

How to create and update tasks and contacts with the generated `*Api` classes. Every
class/method/field shown here is exercised in
[`examples/skill-quickstart.ts`](../../../examples/skill-quickstart.ts) (`updateExamples()`),
so it is compile-checked against the real generated API. Under `--dryRun` the quickstart
**constructs but never sends** these requests.

See also: [api-surface.md](api-surface.md) (class map) · [querying.md](querying.md) (reading).

## Update methods

| Method | Wrapper arg | id type | Body field | Body type |
|--------|-------------|---------|------------|-----------|
| `taskApi.postTaskById(...)` | `{ id, taskUpdateRequest, silent? }` | `number` | `taskUpdateRequest` | `TaskUpdateRequest` |
| `contactApi.postContactById(...)` | `{ id, contactRequest, silent? }` | `string` | `contactRequest` | `ContactRequest` |
| `contactApi.postContact(...)` | `{ contactRequest }` | — | `contactRequest` | `ContactRequest` |

- `postXById` **updates** an existing record by id. Watch the id type — tasks use a
  `number`, contacts use a `string` (same split as `getXById`, see
  [querying.md](querying.md)).
- `postContact` (no id in the path) **creates** a contact; pass an `id` inside
  `contactRequest` and Planfix treats it as an upsert/update of that contact.
- `silent?: boolean` — when `true`, Planfix suppresses notifications/webhooks for the
  change. Use it for bulk migrations so you don't spam watchers.

```ts
import { TaskApi, ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';

const config = loadConfig();
const taskApi = new TaskApi(config);
const contactApi = new ContactApi(config);

// Update a task's name.
await taskApi.postTaskById({
  id: 123,                                  // number
  taskUpdateRequest: { name: 'Renamed task' },
  silent: true,
});

// Update a contact's telegram handle.
await contactApi.postContactById({
  id: '456',                                // string
  contactRequest: { telegram: '@newhandle' },
  silent: true,
});
```

## Custom-field updates

The generated, type-checked field is **`customFieldData`** — an array of
`CustomFieldValueRequest`, each `{ field: { id }, value }`. The id is nested in a
`BaseEntity`, and `value` is typed `object` in the generated model, so **wrap primitives**
(arrays count as objects — the same `value: [x]` shape `mass-update-contacts.ts` uses):

```ts
await taskApi.postTaskById({
  id: 123,
  taskUpdateRequest: {
    customFieldData: [
      { field: { id: 385 }, value: ['Industrial'] },  // field id 385 ← from template lookup
    ],
  },
});
```

> ⚠️ Some older example scripts (e.g. `examples/mass-update-contacts.ts`) use a raw
> `customFields: [{ id, value }]` shape. That matches the Planfix wire format but is **not**
> the generated TypeScript type — `tsc` only accepts `customFieldData: [{ field: { id }, value }]`.
> Prefer the typed shape in new scripts. Resolve `field.id` from a template via the
> `fieldName → fieldId` lookup in [writing-scripts.md](writing-scripts.md).

## Mass-update loop (list → filter → update)

The bulk pattern from [`examples/mass-update-contacts.ts`](../../../examples/mass-update-contacts.ts):
page through a filtered list, decide per-record, then write each change.

```ts
const page = await contactApi.getContactList({
  getContactListRequest: { offset: 0, pageSize: 100, fields: 'all' },
});
for (const c of page.contacts ?? []) {
  if (c.id == null) continue;
  // ...decide the new value from c...
  await contactApi.postContactById({
    id: String(c.id),
    contactRequest: { customFieldData: [{ field: { id: 385 }, value: ['x'] }] },
    silent: true,
  });
}
```

Combine with the pagination loop from [querying.md](querying.md) when the result set spans
many pages.

## Safe mutation practice (required)

Writes are irreversible. Every write script **must**:

1. **Gate behind `--dryRun`.** Parse the flag, and under dry-run build the request and log
   what *would* change — but do not call any `postX`. Pattern:
   [`examples/contacts-migrate-telegram.ts`](../../../examples/contacts-migrate-telegram.ts).

   ```ts
   if (opts.dryRun) {
     console.log(`[DRY RUN] Would update contact ${id}`);
   } else {
     await contactApi.postContactById({ id, contactRequest, silent: true });
   }
   ```

2. **Log each change** to a `data/*.csv` audit trail (header-if-empty + `appendFileSync`),
   so a run is reviewable and resumable. See [writing-scripts.md](writing-scripts.md).

3. **Default to `silent: true`** for bulk runs to avoid notifying every watcher.

4. **Never mutate from a run-guard / on import.** The quickstart's auto-run path performs
   only a harmless read; mutation helpers are exported for typecheck and explicit calls
   only.

## Related references

- Endpoint catalog: [`docs/ENDPOINTS.md`](../../../docs/ENDPOINTS.md)
- RU↔EN terminology: [`docs/dictionary.md`](../../../docs/dictionary.md)
- Class/method map: [api-surface.md](api-surface.md) · Reading data: [querying.md](querying.md)
- New-script conventions: [writing-scripts.md](writing-scripts.md)
