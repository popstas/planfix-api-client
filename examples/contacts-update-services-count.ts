/**
 * Записывает в поле контакта количество услуг из отчёта clients-services.csv.
 *
 * Источник: data/clients-services.csv (разделитель `;`, выгрузка отчёта
 * «Услуг на клиента»). Колонка «Номер клиента» — это id контакта в Planfix,
 * «Услуг на клиента» — значение для записи в поле --fieldId (по умолчанию 913,
 * «Услуг на 16.07.2026», строковое поле).
 *
 * Run:
 *   npx tsx examples/contacts-update-services-count.ts --dryRun --limit 5
 *   npx tsx examples/contacts-update-services-count.ts
 * Typecheck:
 *   npx tsc --noEmit -p tsconfig.skill.json
 */

import { loadConfig } from '../src/config';
import type { PostContactByIdRequest } from '../src/generated';
import {
  buildApis,
  createCsvLogger,
  formatApiError,
  parseArgs,
  readCsvFile,
  runExample,
  sleep,
} from './lib';

const ARG_SPEC = {
  dryRun: { type: 'boolean', description: 'log what would change, send nothing' },
  csv: { type: 'string', default: 'data/clients-services.csv', description: 'report export path' },
  fieldId: { type: 'number', default: 913, description: 'contact custom field id' },
  logCsv: {
    type: 'string',
    default: 'data/clients-services-log.csv',
    description: 'audit log path',
  },
  limit: { type: 'number', default: 0, description: 'max contacts to process, 0 = all' },
} as const;

const CLIENT_ID_COLUMN = 'Номер клиента';
const SERVICES_COLUMN = 'Услуг на клиента';

interface InputRow {
  contactId: number;
  contactIdRaw: string;
  clientName: string;
  services: string;
}

function readInput(csvPath: string): InputRow[] {
  const { headers, rows } = readCsvFile(csvPath, { delimiter: ';' });
  for (const column of [CLIENT_ID_COLUMN, SERVICES_COLUMN]) {
    if (!headers.includes(column)) {
      throw new Error(`CSV column "${column}" not found in ${csvPath} (headers: ${headers.join(', ')})`);
    }
  }

  return rows.map(row => {
    const contactIdRaw = (row[CLIENT_ID_COLUMN] ?? '').trim();
    return {
      contactId: Number(contactIdRaw),
      contactIdRaw,
      clientName: (row[headers[0]] ?? '').trim(),
      services: (row[SERVICES_COLUMN] ?? '').trim(),
    };
  });
}

/** Поле 913 строковое, поэтому сравниваем и пишем значения как строки. */
function getFieldValue(contact: unknown, fieldId: number): string {
  const data = (contact as { customFieldData?: { field?: { id?: number }; value?: unknown }[] })
    .customFieldData;
  const value = data?.find(cf => cf.field?.id === fieldId)?.value;
  if (value == null) return '';
  return String(value).trim();
}

export async function contactsUpdateServicesCount(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2), ARG_SPEC);
  const { contactApi } = buildApis(loadConfig());

  if (opts.dryRun) console.log('DRY RUN MODE: no data will be modified');

  const allRows = readInput(opts.csv);
  const rows = opts.limit > 0 ? allRows.slice(0, opts.limit) : allRows;
  console.log(`Loaded ${allRows.length} rows from ${opts.csv}, processing ${rows.length}`);

  const log = createCsvLogger(opts.logCsv, [
    'date', 'contact_id', 'contact_name', 'old_value', 'new_value', 'dry_run', 'status', 'note',
  ]);
  const stats = { updated: 0, skipped: 0, errors: 0 };

  try {
    for (const row of rows) {
      const logRow = (status: string, oldValue = '', name = row.clientName, note = '') =>
        log.add([
          new Date().toISOString(),
          row.contactIdRaw,
          name,
          oldValue,
          row.services,
          String(opts.dryRun),
          status,
          note,
        ]);

      if (!Number.isInteger(row.contactId) || row.contactId <= 0) {
        stats.skipped++;
        logRow('skip_invalid_id', '', row.clientName, `Invalid contact id "${row.contactIdRaw}"`);
        continue;
      }
      if (!row.services) {
        stats.skipped++;
        logRow('skip_empty_value', '', row.clientName, 'Empty services value in CSV');
        continue;
      }

      try {
        const response = await contactApi.getContactById({
          id: String(row.contactId),
          fields: `id,name,${opts.fieldId}`,
        });
        const contact = response.contact;
        if (!contact?.id) {
          stats.errors++;
          logRow('contact_not_found', '', row.clientName, 'Contact not found');
          console.warn(`Contact not found: ${row.contactId}`);
          continue;
        }

        const contactName = contact.name ?? row.clientName;
        const oldValue = getFieldValue(contact, opts.fieldId);
        if (oldValue === row.services) {
          stats.skipped++;
          logRow('skip_same_value', oldValue, contactName);
          continue;
        }

        if (opts.dryRun) {
          console.log(
            `[dryRun] contact ${contact.id} "${contactName}": "${oldValue}" -> "${row.services}"`,
          );
          logRow('would_update', oldValue, contactName);
          continue;
        }

        const params: PostContactByIdRequest = {
          id: String(row.contactId),
          contactRequest: {
            id: row.contactId,
            customFieldData: [
              // Generated type declares `value: object`, but Planfix accepts plain strings.
              { field: { id: opts.fieldId }, value: row.services as unknown as object },
            ],
          },
        };
        await contactApi.postContactById(params);

        stats.updated++;
        logRow('updated', oldValue, contactName);
        console.log(`contact ${contact.id} "${contactName}": "${oldValue}" -> "${row.services}"`);
        await sleep(300); // rate-limit between writes
      } catch (error) {
        stats.errors++;
        const note = await formatApiError(error);
        logRow('error', '', row.clientName, note);
        console.error(`contact ${row.contactId}: ${note}`);
      }
    }
  } finally {
    log.flush();
  }

  console.log(
    `Done: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors, log: ${opts.logCsv}`,
  );
}

runExample(import.meta.url, contactsUpdateServicesCount);
