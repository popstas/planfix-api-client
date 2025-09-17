import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';

interface Options {
  templateId: number;
  oldFieldId: number;
  newFieldId: number;
  checkboxFieldId: number;
}

function parseArgs(args: string[]): Options {
  const opts: Options = {
    templateId: 0,
    oldFieldId: 0,
    newFieldId: 0,
    checkboxFieldId: 0,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--templateId') {
      opts.templateId = Number(args[++i]);
    } else if (a === '--oldFieldId') {
      opts.oldFieldId = Number(args[++i]);
    } else if (a === '--newFieldId') {
      opts.newFieldId = Number(args[++i]);
    } else if (a === '--checkboxFieldId') {
      opts.checkboxFieldId = Number(args[++i]);
    }
  }
  if (!opts.templateId) throw new Error('templateId is required');
  if (!opts.oldFieldId) throw new Error('oldFieldId is required');
  if (!opts.newFieldId) throw new Error('newFieldId is required');
  if (!opts.checkboxFieldId) throw new Error('checkboxFieldId is required');
  return opts;
}

// Example: copy value from a single-value field to a multi-value field
export async function updateMultiField() {
  const dryRun = false;
  const pageSize = 100;

  const opts = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const api = new ContactApi(config);

  console.log('Loading contacts...');
  const t0 = Date.now();
  const list = await api.getContactList({
    getContactListRequest: {
      // templateId: opts.templateId,
      fields: `id,name,${opts.oldFieldId},${opts.newFieldId}`,
      filters: [
        {
          type: 4105,
          operator: 'equal',
          value: false,
          field: opts.checkboxFieldId,
        },
        {
          type: 4107,
          operator: 'notequal',
          value: '' as any,
          field: opts.oldFieldId,
        },
      ],
      pageSize,
    } as any,
  });
  const contacts = (list as any).contacts ?? [];
  const loadTime = (Date.now() - t0) / 1000;
  console.log(`Loaded ${contacts.length} contacts in ${loadTime.toFixed(2)}s (${(contacts.length / loadTime).toFixed(2)} per sec)`);

  console.log('Updating contacts...');
  const total = contacts.length;
  const t1 = Date.now();
  let processed = 0;
  for (const c of contacts) {
    processed++;
    console.log(`\n${processed}/${total} https://tagilcity.planfix.com/contact/${c.id} - ${c.name}`)
    const value = c.customFieldData?.find(cf => cf.field.id === opts.oldFieldId)?.value;
    const newValueBefore = c.customFieldData?.find(cf => cf.field.id === opts.newFieldId)?.value;
    const newValue = [...newValueBefore];
    if (!value || !newValue) {
      console.log('No value or newValue:', newValue);
      continue;
    }

    if (newValue.length > 0) {
      console.log(`newValue: ${newValue.length}`)
    }
    const isNewValueHasOldValue = newValue.find(v => v.id === value.id);
    if (isNewValueHasOldValue) {
      console.log('Value already exists:', value);
      const res = await api.postContact({
        contactRequest: {
          id: c.id,
          customFieldData: [
            // { field: {id: opts.newFieldId}, value: newValue },
            { field: {id: opts.checkboxFieldId}, value: true }
          ],
        } as any,
      });
      if (res.result !== 'success') {
        console.log(res);
        continue;
      }
    }
    newValue.push(value);
    if (!dryRun) {
      const res = await api.postContact({
        contactRequest: {
          id: c.id,
          customFieldData: [
            { field: {id: opts.newFieldId}, value: newValue },
            { field: {id: opts.checkboxFieldId}, value: true }
          ],
        } as any,
      });
      if (res.result !== 'success') {
        console.log(res);
        continue;
      }
    }
    else {
      console.log(`Dry run: ${newValueBefore.length} -> ${newValue.length}`);
    }
    const elapsed = (Date.now() - t1) / 1000;
    const speed = processed / (elapsed || 1);
    console.log(`Updated ${processed}/${total} contacts (${speed.toFixed(2)} per sec)`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const totalTime = (Date.now() - t1) / 1000;
  console.log(`Done in ${totalTime.toFixed(2)}s (${(processed / totalTime).toFixed(2)} per sec)`);

  if (contacts.length === pageSize) {
    console.log(`Updating next ${pageSize} contacts...`);
    await updateMultiField();
  }
}

if (require.main === module) {
  updateMultiField().catch(err => console.error(err));
}
