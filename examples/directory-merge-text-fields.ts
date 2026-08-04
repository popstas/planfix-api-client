/**
 * Склейка двух многострочных текстовых полей справочника в одно.
 *
 * Задача-повод: справочник «Конкурсы и ассоциации» (directoryId 235) — дописать
 * содержимое поля «Категории или кластеры» в конец поля «Номинации»:
 *
 *   <текущее значение целевого поля>
 *   <пустая строка>
 *   <текущее значение исходного поля>
 *
 * Заголовка у блока нет — донор начинается новым абзацем: описания в справочнике
 * англоязычные, русское слово «КАТЕГОРИИ» в них выглядело чужеродно.
 *
 * Правила:
 *   - исходное поле пустое  → запись не трогаем;
 *   - целевое поле пустое   → пишем только содержимое донора, без ведущих пустых строк;
 *   - донор уже есть в конце целевого поля → пропускаем (идемпотентность).
 *
 * Миграция: `--dropLine "КАТЕГОРИИ"` убирает строку прежнего заголовка из записей,
 * склеенных предыдущей версией скрипта.
 *
 * Исходное поле не очищается и не удаляется — это отдельный шаг.
 *
 * Запуск:
 *   npx tsx examples/directory-merge-text-fields.ts --dryRun
 *   npx tsx examples/directory-merge-text-fields.ts
 *
 * Бэкап всех вычитанных значений обоих полей всегда пишется в --backup (JSON),
 * даже в dryRun.
 */

import { DirectoryApi } from '../src/generated';
import { loadConfig } from '../src/config';
import { createCsvLogger, formatApiError, paginate, parseArgs, runExample, sleep } from './lib';
import * as fs from 'fs';
import * as path from 'path';

const ARG_SPEC = {
  dryRun: { type: 'boolean', description: 'только посчитать и показать примеры, ничего не писать' },
  directoryId: { type: 'number', default: 235, description: 'id справочника' },
  targetFieldName: { type: 'string', default: 'Номинации', description: 'поле-приёмник' },
  sourceFieldName: { type: 'string', default: 'Категории или кластеры', description: 'поле-донор' },
  titleFieldName: { type: 'string', default: 'Название', description: 'поле с названием записи (для логов)' },
  dropLine: { type: 'string', default: '', description: 'миграция: удалить эту строку из уже склеенных записей' },
  backup: { type: 'string', default: 'data/directory-235-backup.json', description: 'JSON-бэкап исходных значений' },
  csv: { type: 'string', default: 'data/directory-merge-text-fields-log.csv', description: 'CSV-лог изменений' },
  examples: { type: 'number', default: 5, description: 'сколько примеров "до/после" печатать' },
  limit: { type: 'number', default: 0, description: 'обработать не больше N записей (0 = все)' },
  skipKeys: { type: 'string', default: '', description: 'ключи записей через запятую, которые не трогать' },
  delay: { type: 'number', default: 300, description: 'пауза между записями, мс' },
} as const;

interface EntrySnapshot {
  key: number;
  title: string;
  target: string;
  source: string;
}

/**
 * Склейка уже сделана: донор целиком присутствует в хвосте целевого поля.
 * Заголовка-маркера у блока нет, поэтому идемпотентность проверяется по тексту.
 */
export function alreadyMerged(target: string, source: string): boolean {
  const needle = source.trim();
  if (!needle) return false;
  return target.replace(/\s+$/, '').endsWith(needle);
}

/**
 * Заглушка вместо значения: пусто или только прочерки/точки.
 * В справочнике 235 у ~20 записей в полях стоит "-" — это та же пустота.
 */
export function isPlaceholder(text: string): boolean {
  return !text.trim() || /^[-—–_.·•\s]+$/.test(text.trim());
}

/**
 * Новое значение целевого поля или null, если менять нечего.
 * Хвостовые пробелы/переводы строк целевого поля срезаются, чтобы между
 * блоками была ровно одна пустая строка.
 */
export function buildMergedValue(target: string, source: string): string | null {
  if (isPlaceholder(source)) return null;
  if (alreadyMerged(target, source)) return null;
  const block = source.trim();
  // Прочерк в целевом поле — тоже пустота: не тащим его перед блоком.
  const head = isPlaceholder(target) ? '' : target.replace(/\s+$/, '');
  return head ? `${head}\n\n${block}` : block;
}

/**
 * Удаление строки прежнего заголовка (миграция записей, склеенных с «КАТЕГОРИИ»).
 * null, если такой строки в тексте нет.
 */
export function dropHeaderLine(text: string, line: string): string | null {
  if (!line.trim()) return null;
  const lines = text.split(/\r?\n/);
  const kept = lines.filter(l => l.trim() !== line);
  return kept.length === lines.length ? null : kept.join('\n');
}

function preview(text: string, maxLines = 6): string {
  const lines = text.split(/\r?\n/);
  const shown = lines.slice(0, maxLines).join('\n');
  return lines.length > maxLines ? `${shown}\n… (+${lines.length - maxLines} строк)` : shown;
}

export async function directoryMergeTextFields(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2), ARG_SPEC);
  const api = new DirectoryApi(loadConfig());
  const id = String(opts.directoryId);

  // 1. Имя поля → id.
  const dir = await api.getDirectoryById({ id: opts.directoryId, fields: 'id,name,fields' });
  const fields = dir.directory?.fields ?? [];
  const fieldId = (name: string): number => {
    const found = fields.find(f => f.name === name);
    if (!found?.id) {
      throw new Error(`поле "${name}" не найдено в справочнике ${id}; есть: ${fields.map(f => f.name).join(', ')}`);
    }
    return found.id;
  };
  const targetId = fieldId(opts.targetFieldName);
  const sourceId = fieldId(opts.sourceFieldName);
  const titleId = fieldId(opts.titleFieldName);
  console.log(
    `Справочник ${opts.directoryId} "${dir.directory?.name}": ` +
      `"${opts.targetFieldName}"=${targetId}, "${opts.sourceFieldName}"=${sourceId}, "${opts.titleFieldName}"=${titleId}`,
  );

  // 2. Ключи всех записей (entriesOnly: без групп).
  const keys: number[] = [];
  for await (const entry of paginate(
    (offset, pageSize) =>
      api
        .postListDirectoryEntries({
          id,
          postListDirectoryEntriesRequest: { offset, pageSize, entriesOnly: true, fields: 'key' },
        })
        .then(r => r.directoryEntries ?? []),
    { limit: opts.limit || undefined },
  )) {
    if (entry.key) keys.push(entry.key);
  }
  console.log(`Записей в справочнике: ${keys.length}`);

  // 3. Значения полей — только поштучно: список их не отдаёт.
  const entryFields = `key,${titleId},${targetId},${sourceId}`;
  const snapshots: EntrySnapshot[] = [];
  for (const key of keys) {
    const resp = await api.getDirectoryIdEntryKey({ id, key, fields: entryFields });
    const cf = resp.entry?.customFieldData ?? [];
    const valueOf = (fid: number): string => {
      const raw = cf.find(f => f.field?.id === fid)?.value;
      return typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
    };
    snapshots.push({ key, title: valueOf(titleId), target: valueOf(targetId), source: valueOf(sourceId) });
    if (snapshots.length % 50 === 0) console.log(`  прочитано ${snapshots.length}/${keys.length}`);
  }

  // 4. Бэкап до любых изменений.
  const backupPath = path.resolve(opts.backup);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        directoryId: opts.directoryId,
        directoryName: dir.directory?.name ?? '',
        fields: { title: titleId, target: targetId, source: sourceId },
        fieldNames: { title: opts.titleFieldName, target: opts.targetFieldName, source: opts.sourceFieldName },
        savedAt: new Date().toISOString(),
        entries: snapshots,
      },
      null,
      2,
    ),
    'utf-8',
  );
  console.log(`Бэкап: ${opts.backup} (${snapshots.length} записей)`);

  // 5. План изменений.
  const skipKeys = new Set(
    opts.skipKeys
      .split(',')
      .map(k => Number(k.trim()))
      .filter(k => Number.isFinite(k) && k > 0),
  );
  const planned = snapshots
    .filter(s => !skipKeys.has(s.key))
    .map(s => {
      // Миграция имеет приоритет: такая запись уже склеена, повторно донора не дописываем.
      const dropped = dropHeaderLine(s.target, opts.dropLine);
      return { ...s, merged: dropped ?? buildMergedValue(s.target, s.source), migrated: dropped !== null };
    })
    .filter((s): s is EntrySnapshot & { merged: string; migrated: boolean } => s.merged !== null);
  if (skipKeys.size) console.log(`Исключены вручную: ${[...skipKeys].join(', ')}`);
  const migratedCount = planned.filter(s => s.migrated).length;
  if (migratedCount) console.log(`Удаление строки "${opts.dropLine}": ${migratedCount} записей`);

  const emptySource = snapshots.filter(s => isPlaceholder(s.source)).length;
  const alreadyDone = snapshots.filter(s => !isPlaceholder(s.source) && alreadyMerged(s.target, s.source)).length;
  const emptyTarget = planned.filter(s => isPlaceholder(s.target)).length;

  console.log(
    `\nИтого: ${snapshots.length} записей; изменится ${planned.length}` +
      ` (из них с пустыми "${opts.targetFieldName}": ${emptyTarget});` +
      ` пропуск: пустое "${opts.sourceFieldName}" — ${emptySource}, уже склеено — ${alreadyDone}`,
  );

  for (const s of planned.slice(0, opts.examples)) {
    console.log(`\n=== key ${s.key} — ${s.title || '(без названия)'}`);
    console.log(`--- ДО "${opts.targetFieldName}":\n${preview(s.target) || '(пусто)'}`);
    console.log(`--- "${opts.sourceFieldName}":\n${preview(s.source)}`);
    console.log(`--- ПОСЛЕ:\n${preview(s.merged, 12)}`);
  }

  if (opts.dryRun) {
    console.log(`\n[dryRun] ничего не записано. Изменилось бы ${planned.length} записей.`);
    return;
  }

  // 6. Запись.
  const log = createCsvLogger(opts.csv, ['date', 'key', 'title', 'old_value', 'source_value', 'new_value', 'status']);
  let updated = 0;
  let failed = 0;
  try {
    for (const s of planned) {
      const row = (status: string) =>
        log.add([new Date().toISOString(), String(s.key), s.title, s.target, s.source, s.merged, status]);
      try {
        await api.postUpdateDirectoryEntry({
          id,
          key: s.key,
          silent: true,
          directoryEntryRequest: {
            customFieldData: [{ field: { id: targetId }, value: s.merged as unknown as object }],
          },
        });
        updated++;
        row('updated');
        console.log(`key ${s.key} "${s.title}": обновлено (${updated}/${planned.length})`);
        await sleep(opts.delay);
      } catch (error) {
        failed++;
        row('error');
        console.error(`key ${s.key}: ${await formatApiError(error)}`);
      }
    }
  } finally {
    log.flush();
  }

  console.log(`\nГотово: обновлено ${updated}, ошибок ${failed}, лог: ${opts.csv}`);
}

runExample(import.meta.url, directoryMergeTextFields);
