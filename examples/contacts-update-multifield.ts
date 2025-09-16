import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';

interface Options {
  templateId: number;
  oldFieldId: number;
  newFieldId: number;
}

function parseArgs(args: string[]): Options {
  const opts: Options = {
    templateId: 0,
    oldFieldId: 0,
    newFieldId: 0,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--templateId') {
      opts.templateId = Number(args[++i]);
    } else if (a === '--oldFieldId') {
      opts.oldFieldId = Number(args[++i]);
    } else if (a === '--newFieldId') {
      opts.newFieldId = Number(args[++i]);
    }
  }
  if (!opts.templateId) throw new Error('templateId is required');
  if (!opts.oldFieldId) throw new Error('oldFieldId is required');
  if (!opts.newFieldId) throw new Error('newFieldId is required');
  return opts;
}

// Example: copy value from a single-value field to a multi-value field
export async function updateMultiField() {
  const opts = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const api = new ContactApi(config);

  console.log('Loading contacts...');
  const t0 = Date.now();
  const list = await api.getContactList({
    getContactListRequest: {
      templateId: opts.templateId,
      fields: 'all',
      filters: [
        {
          type: null,
          operator: 'notequal',
          value: '' as any,
          field: opts.oldFieldId,
        },
      ],
    } as any,
  });
  const contacts = (list as any).objects ?? [];
  const loadTime = (Date.now() - t0) / 1000;
  console.log(`Loaded ${contacts.length} contacts in ${loadTime.toFixed(2)}s (${(contacts.length / loadTime).toFixed(2)} per sec)`);

  console.log('Updating contacts...');
  const total = contacts.length;
  const t1 = Date.now();
  let processed = 0;
  for (const c of contacts) {
    const value = c.customFields?.find(cf => cf.id === opts.oldFieldId)?.value;
    if (!value) continue;
    await api.postContact({
      contactRequest: {
        id: c.id,
        customFields: [{ id: opts.newFieldId, value: [value] }],
      } as any,
    });
    processed++;
    const elapsed = (Date.now() - t1) / 1000;
    const speed = processed / (elapsed || 1);
    console.log(`Updated ${processed}/${total} contacts (${speed.toFixed(2)} per sec)`);
  }
  const totalTime = (Date.now() - t1) / 1000;
  console.log(`Done in ${totalTime.toFixed(2)}s (${(processed / totalTime).toFixed(2)} per sec)`);
}

if (require.main === module) {
  updateMultiField().catch(err => console.error(err));
}
