/**
 * Custom-field helpers shared by example scripts: fieldName → fieldId lookup
 * (reference: change-manager-by-client.ts) and value extractors for the shapes
 * Planfix returns in `customFieldData` (plain text, dictionary {id,value},
 * boolean-ish, id sets, date objects).
 */

import { ObjectApi } from '../../src/generated';

/** Structural type: TaskResponse, ContactResponse and directory entries all fit. */
export interface HasCustomFields {
  customFieldData?: Array<{ field?: { id?: number }; value?: unknown }>;
}

/**
 * Resolve human field names to numeric ids from a template's `customFieldData`
 * (via `getObjectById`). Throws when any requested name is missing.
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

/** Resolve a task-status id by name for an object template's status set. */
export async function lookupStatusIdByName(
  objectApi: ObjectApi,
  templateId: number,
  statusName: string,
): Promise<number> {
  const response = await objectApi.getObjectTaskStatusList({ id: templateId, fields: 'id,name' });
  const status = (response.statuses ?? []).find(s => s.name === statusName);
  if (!status?.id) {
    throw new Error(`status "${statusName}" not found in template ${templateId}`);
  }
  return status.id;
}

/** Raw custom-field value by field id (undefined when the field is absent). */
export function getCustomFieldValue(entity: HasCustomFields, fieldId: number): unknown {
  return entity.customFieldData?.find(cf => cf.field?.id === fieldId)?.value;
}

/**
 * Custom-field value as a trimmed string; undefined when empty/absent.
 * Dictionary values yield their display text, date objects their date part.
 */
export function getStringFieldValue(entity: HasCustomFields, fieldId: number): string | undefined {
  const value = getCustomFieldValue(entity, fieldId);
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.value === 'string') return obj.value;
    if (typeof obj.date === 'string') return obj.date;
    if (typeof obj.datetime === 'string') return obj.datetime;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Boolean custom field. Planfix returns boolean / number / string / dictionary
 * {id} depending on the field setup (merged from fix-publications-with-false-paid.ts
 * and set-service-field.ts).
 */
export function isFieldTrue(entity: HasCustomFields, fieldId: number): boolean {
  const value = getCustomFieldValue(entity, fieldId);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return value === '1' || value.toLowerCase() === 'true';
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id;
    return id === 1 || id === '1';
  }
  return false;
}

export interface DictionaryValue {
  id: number;
  value: string;
}

/** Dictionary (list) custom-field value as {id, value}; undefined when unset. */
export function getDictionaryValue(entity: HasCustomFields, fieldId: number): DictionaryValue | undefined {
  const value = getCustomFieldValue(entity, fieldId);
  if (value == null || typeof value !== 'object' || !('id' in value)) return undefined;
  const obj = value as { id?: number | string | null; value?: unknown };
  if (obj.id == null) return undefined;
  return {
    id: Number(obj.id),
    value: obj.value != null ? String(obj.value) : String(obj.id),
  };
}

/**
 * Set/multi custom field (e.g. set of directory entries) as a Set of ids.
 * Handles valueId arrays, arrays of {id}, single {id} and plain numbers
 * (from rubrics-merge.ts extractDirIds).
 */
export function getIdSetFieldValue(entity: HasCustomFields, fieldId: number): Set<number> {
  const ids = new Set<number>();
  const cf = entity.customFieldData?.find(c => c.field?.id === fieldId) as
    | { value?: unknown; valueId?: unknown }
    | undefined;
  if (!cf) return ids;

  if (cf.valueId != null) {
    const arr = Array.isArray(cf.valueId) ? cf.valueId : [cf.valueId];
    arr.forEach(v => {
      if (typeof v === 'number') ids.add(v);
    });
  } else if (cf.value) {
    if (Array.isArray(cf.value)) {
      cf.value.forEach(v => {
        if (v && typeof v === 'object' && 'id' in v && (v as { id?: unknown }).id != null) {
          ids.add(Number((v as { id: unknown }).id));
        } else if (typeof v === 'number') {
          ids.add(v);
        }
      });
    } else if (typeof cf.value === 'object' && 'id' in cf.value) {
      const id = (cf.value as { id?: number }).id;
      if (id != null) ids.add(Number(id));
    } else if (typeof cf.value === 'number') {
      ids.add(cf.value);
    }
  }
  return ids;
}

/**
 * Date custom field as its "DD-MM-YYYY" string. Planfix returns either a plain
 * string or an object { date, datetime } (from fix-payments-empty-date.ts).
 */
export function getDateFieldValue(entity: HasCustomFields, fieldId: number): string | undefined {
  const value = getCustomFieldValue(entity, fieldId);
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'object') {
    const obj = value as { date?: unknown; datetime?: unknown };
    if (typeof obj.date === 'string') return obj.date.trim() || undefined;
    if (typeof obj.datetime === 'string') return obj.datetime.trim() || undefined;
  }
  return undefined;
}
