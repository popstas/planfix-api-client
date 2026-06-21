# API surface map

The client wraps the Planfix REST API as **17 generated `*Api` classes** (in
`src/generated/apis/`, re-exported from `src/generated`). Every class extends a common
`runtime.BaseAPI` and takes a `Configuration` in its constructor, so the instantiation
pattern is identical for all of them:

```ts
import { TaskApi, ContactApi, ObjectApi, CustomFieldsTaskApi } from '../src/generated';
import { loadConfig } from '../src/config';

const config = loadConfig();           // reads PLANFIX_ACCOUNT / PLANFIX_TOKEN from .env
const taskApi = new TaskApi(config);
const contactApi = new ContactApi(config);
const objectApi = new ObjectApi(config);
const cfTaskApi = new CustomFieldsTaskApi(config);
```

`loadConfig()` lives in `src/config.ts` and returns a `Configuration`. Reuse one
`Configuration` across all the api instances you need.

> Do **not** edit `src/generated/**` — it is regenerated from `swagger.json` (see `AGENTS.md`).

## RU → identifier → class

Planfix terminology is Russian. Map a term to its English identifier (see
[`docs/dictionary.md`](../../../docs/dictionary.md)), then to the `*Api` class:

| Русский термин | identifier | Primary class(es) |
|----------------|------------|-------------------|
| Задача | `task` | `TaskApi`, `CustomFieldsTaskApi`, `ProcessApi` |
| Контакт | `contact` | `ContactApi`, `CustomFieldsContactApi` |
| Проект | `project` | `ProjectApi`, `CustomFieldsProjectApi` |
| Сотрудник, пользователь | `user` | `EmployeeApi`, `CustomFieldsEmployeeApi` |
| Объект (шаблон) | `object` | `ObjectApi` |
| Комментарий | `comment` | `CommentsApi` (+ `getTaskComments`/`getContactComments`) |
| Аналитика | `datatag` | `DataTagsApi` |
| Справочник | `directory` | `DirectoryApi` |
| Файл, документ | `file` | `FileApi` |
| Сценарий, процесс | `process` | `ProcessApi` |
| Отчёт | `report` | `ReportApi` |
| Кастомное поле | `customfield` | `CustomFieldsApi` + the `CustomFields*` family |
| (служебное) ping | — | `MonitoringApi` |

## The 17 classes

### Core entities

- **`TaskApi`** — tasks. Read: `getTaskList`, `getTaskById`, `getTaskListTemplates`,
  `getTaskListRecurring`, `getTaskFiles`, `getTaskChecklist`, `getTaskComments`.
  Write: `postTask` (create), `postTaskById` (update), `postTaskFilters`,
  `postTaskAddComment`, `postTaskUpdateComment`, `postTaskAddDataTagEntryNewComment`,
  `postTaskAddDataTagEntryExistingComment`.
- **`ContactApi`** — contacts. Read: `getContactList`, `getContactById`,
  `getContactListTemplates`, `getContactListGroups`, `getContactFiles`,
  `getContactComments`. Write: `postContact` (create), `postContactById` (update),
  `postContactFilters`, `postContactImport`, `postContactAddComment`,
  `postContactUpdateComment`, `postContactAddDataTagEntryNewComment`,
  `postContactAddDataTagEntryExistingComment`.
- **`ProjectApi`** — projects. Read: `getProjectList`, `getProjectById`,
  `getProjectListTemplates`, `getProjectGroups`, `getProjectFiles`.
  Write: `postProject` (create), `postProjectById` (update).
- **`EmployeeApi`** — users / employees (`/user`). Read: `getUserList`, `getUserId`,
  `getUserGroups`, `getUserPositions`. Write: `postUser` (create), `postUserId` (update).
- **`ObjectApi`** — objects/templates (used to discover custom-field definitions for a
  template). Read: `getObjectList`, `getObjectById`, `getObjectTaskStatusList`.

### Custom fields

- **`CustomFieldsApi`** — generic/global custom-field metadata: `getCustomfieldGeneric`,
  `getCustomfieldTypes`, `getCustomfieldsForDatatag`, `getCustomfieldsForDirectory`,
  `postCustomfieldMainAdd`, `postCustomfieldMainUpdate`.
- **`CustomFieldsTaskApi`** — task field sets/definitions: `getCustomfieldTask`,
  `getCustomfieldsForTask`, `getCustomfieldSetsTask`, `postCustomfieldTaskAdd`,
  `postCustomfieldSetTaskAdd`.
- **`CustomFieldsContactApi`** — contact fields: `getCustomfieldContact`,
  `getCustomfieldsForContact`, `getCustomfieldSetsContact`, `postCustomfieldAdd`,
  `postCustomfieldSetAdd`.
- **`CustomFieldsProjectApi`** — project fields: `getCustomfieldProject`,
  `getCustomfieldsForProject`, `getCustomfieldSetsProject`, `postCustomfieldProjectAdd`,
  `postCustomfieldSetProjectAdd`.
- **`CustomFieldsEmployeeApi`** — user fields: `getCustomfieldUser`,
  `getCustomfieldsForUser`, `getCustomfieldSetsUser`, `postCustomfieldUserAdd`,
  `postCustomfieldSetUserAdd`.

> To **set** a custom field on a record you usually pass `customFieldData` in the
> entity-update call (`postTaskById` / `postContactById`), not these endpoints — the
> `CustomFields*Api` classes manage the field **definitions/sets**. See
> [mutations.md](mutations.md).

### Supporting entities

- **`CommentsApi`** — single-comment ops: `getCommentId`, `deleteCommentId`. (Listing /
  adding comments lives on `TaskApi`/`ContactApi`.)
- **`DataTagsApi`** — analytics ("Аналитика"): `getDataTags`, `getDatatagId`,
  `getDatatagEntryKey`, `postListDataTagEntries`, `postUpdateDataTagEntry`,
  `deleteDatatagEntryKey`.
- **`DirectoryApi`** — directories ("Справочники"): `getListDirectories`,
  `getDirectoryById`, `getDirectoriesGroups`, `getDirectoryIdEntryKey`,
  `postListDirectoryEntries`, `postDirectoryEntriesFilters`, `postAddDirectoryEntry`,
  `postUpdateDirectoryEntry`, `deleteDirectoryEntryKey`.
- **`FileApi`** — files: `getFileId`, `getFileIdDownload`, `postFileUpload`,
  `postFileUploadByUrl`, `postFileUpdate`, `attachFileToTask`, `attachFileToContact`,
  `attachFileToProject`, `deleteFileId`.
- **`ProcessApi`** — processes/statuses: `getTaskProcessList`, `getContactProcessList`,
  `getTaskStatusList`.
- **`ReportApi`** — reports: `getReportList`, `getReportId`, `generateReport`,
  `getReportSaveList`, `getReportSaveData`, `checkGetReportSaveByRequestId`.
- **`MonitoringApi`** — health check: `ping`.

## Naming conventions

- `getXList` — list/search (POST `/x/list` under the hood); takes a
  `{ getXListRequest: { offset, pageSize, fields, filters? } }` wrapper.
- `getXById` — fetch one record by id.
- `postX` — **create**; `postXById` — **update** an existing record.
- `*Raw` variants (e.g. `getTaskListRaw`) return the full `ApiResponse` with headers; the
  non-`Raw` method returns just the parsed body. Prefer the non-`Raw` methods.

## Related references

- Full endpoint list: [`docs/ENDPOINTS.md`](../../../docs/ENDPOINTS.md)
- Complex filters (`ComplexTaskFilter`, `ComplexContactFilter`):
  [`docs/complex-filters.md`](../../../docs/complex-filters.md)
- RU↔EN terminology: [`docs/dictionary.md`](../../../docs/dictionary.md)
- Reading data: [querying.md](querying.md) · Writing data: [mutations.md](mutations.md)
