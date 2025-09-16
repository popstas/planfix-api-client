import { ContactApi } from '../src/generated';
import { loadConfig } from '../src/config';

// Пример копирования значения поля oldFieldId в мультиполе newFieldId
export async function contactsUpdateMultifield() {
  const config = loadConfig();
  const contactApi = new ContactApi(config);

  // Замените на реальные идентификаторы пользовательских полей
  const oldFieldId = 123; // поле-источник
  const newFieldId = 456; // мультиполе назначения

  console.time('fetch');
  const list = await contactApi.getContactList({
    getContactListRequest: {
      fields: 'all',
      filters: [{
        type: null,
        operator: 'notequal',
        value: '',
        field: oldFieldId,
      }],
    },
  });
  const contacts = list.objects ?? [];
  console.timeEnd('fetch');
  console.log(`Получено ${contacts.length} контактов`);

  const total = contacts.length;
  let processed = 0;
  const start = Date.now();
  for (const c of contacts) {
    const oldValueId = c.customFields?.find((cf: any) => cf.id === oldFieldId)?.valueId as number | undefined;
    if (!oldValueId) continue;

    const newField = c.customFields?.find((cf: any) => cf.id === newFieldId);
    const values: number[] = Array.isArray(newField?.valueId)
      ? [...newField.valueId]
      : newField?.valueId != null
        ? [newField.valueId]
        : [];

    if (!values.includes(oldValueId)) {
      values.push(oldValueId);
      await contactApi.postContact({
        contactRequest: { id: c.id, customFields: [{ id: newFieldId, valueId: values }] },
      });
    }

    processed++;
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Обработано ${processed}/${total}, скорость ${(processed / elapsed).toFixed(2)} контактов/сек`);
  }
}

// Запуск примера, если файл вызван напрямую
if (require.main === module) {
  contactsUpdateMultifield().catch(err => console.error(err));
}
