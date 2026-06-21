# Querying / reading data

How to read tasks, contacts, and objects with the generated `*Api` classes. Every
class/method/field shown here is exercised in
[`examples/skill-quickstart.ts`](../../../examples/skill-quickstart.ts) (`readExamples()`),
so it is compile-checked against the real generated API.

See also: [api-surface.md](api-surface.md) (class map) · [mutations.md](mutations.md) (writing).

## List endpoints (`getXList`)

List/search methods take a **single wrapper argument** named after the method:
`{ getXListRequest: { ... } }`. The inner request object accepts:

| Field | Type | Meaning |
|-------|------|---------|
| `offset` | `number` | start index for pagination |
| `pageSize` | `number` | page size (Planfix caps it ~100) |
| `fields` | `string` | comma-separated field list to return (ids of custom fields work too, e.g. `'id,name,385'`) |
| `filters` | `ComplexXFilter[]` | optional complex filter (see below) |
| `filterId` | `string` | optional id of a saved filter |

The response holds the array in a **typed, pluralized field** — `.tasks` for tasks,
`.contacts` for contacts — each optional, so coalesce with `?? []`.

```ts
import { TaskApi } from '../src/generated';
import { loadConfig } from '../src/config';

const taskApi = new TaskApi(loadConfig());
const res = await taskApi.getTaskList({
  getTaskListRequest: { offset: 0, pageSize: 100, fields: 'id,name' },
});
const tasks = res.tasks ?? [];            // res: GetTaskList200Response
```

Contacts are identical with `getContactList` → `res.contacts`.

## Get one record (`getXById`)

`getXById` takes the id directly in the request object (no wrapper), plus an optional
`fields`. **Watch the id type**: it differs by entity.

| Method | id type | Response field |
|--------|---------|----------------|
| `getTaskById({ id, fields })` | `number` | `res.task` (`TaskResponse`) |
| `getContactById({ id, fields })` | `string` | `res.contact` (`ContactResponse`) |
| `getObjectById({ id, fields })` | `number` | `res.object` |

```ts
const t = await taskApi.getTaskById({ id: 123, fields: 'id,name' });
console.log(t.task?.name);

const c = await contactApi.getContactById({ id: '456', fields: 'id,name' });
console.log(c.contact?.name);
```

`getObjectById` is the entry point for discovering a template's custom-field
definitions — see [writing-scripts.md](writing-scripts.md) for the
`fieldName → fieldId` lookup pattern built on it.

## Pagination

Planfix returns one page at a time. Loop on `offset`, increment by `pageSize`, and stop
when a page comes back **shorter than `pageSize`** (or empty). Pattern from
[`examples/contacts-export.ts`](../../../examples/contacts-export.ts):

```ts
const pageSize = 100;
let offset = 0;
const all: TaskResponse[] = [];
while (true) {
  const page = await taskApi.getTaskList({
    getTaskListRequest: { offset, pageSize, fields: 'id,name' },
  });
  const tasks = page.tasks ?? [];
  all.push(...tasks);
  if (tasks.length < pageSize) break;   // short/empty page → last page
  offset += pageSize;
}
```

Always request only the `fields` you need — it keeps responses small and fast.

## Complex filters

Pass `filters` (an array) in the list request to filter server-side. The models are
`ComplexTaskFilter` and `ComplexContactFilter`; each entry is
`{ type, operator, value, field?, subfilter? }`:

- `type` — a numeric filter type (`ComplexTaskFilterTypeEnum` / `ComplexContactFilterTypeEnum`,
  e.g. `2` = assignee/USER). `null` is allowed for custom-field filters paired with `field`.
- `operator` — `'equal' | 'notequal' | 'gt' | 'lt'`.
- `value` — `string | number | number[] | null` (contacts allow `null`).
- `field` — custom-field id (use with the custom-field filter `type`).
- `subfilter` — nested filter for related records.

```ts
import type { ComplexTaskFilter } from '../src/generated';

const filters: ComplexTaskFilter[] = [
  { type: 2, operator: 'equal', value: 5 }, // tasks assigned to user 5
];
const res = await taskApi.getTaskList({
  getTaskListRequest: { offset: 0, pageSize: 100, fields: 'id,name', filters },
});
```

Full filter-type tables and Planfix docs: [`docs/complex-filters.md`](../../../docs/complex-filters.md).

## Related references

- Endpoint catalog: [`docs/ENDPOINTS.md`](../../../docs/ENDPOINTS.md)
- RU↔EN terminology: [`docs/dictionary.md`](../../../docs/dictionary.md)
- Class/method map: [api-surface.md](api-surface.md) · Writing data: [mutations.md](mutations.md)
</content>
