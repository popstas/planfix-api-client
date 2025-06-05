import { Configuration, ContactApi, CustomFieldsContactApi } from '../src/generated';

// Пример массового изменения пользовательского поля у контактов
export async function massUpdate() {
  const config = new Configuration({
    basePath: 'https://your-account.planfix.com/rest',
    accessToken: 'YOUR_TOKEN',
  });

  const contactApi = new ContactApi(config);
  const customApi = new CustomFieldsContactApi(config);

  // 1. Получить id шаблона контактов "Шаблон контакта"
  const templates = await contactApi.getContactListTemplates();
  const template = templates.objects?.find(t => t.name === 'Шаблон контакта');
  if (!template) throw new Error('template not found');

  // 2. Получить id полей контактов "Отрасль" и "Отрасли"
  const fieldsResp = await customApi.getCustomfieldContact();
  const fieldIndustry = fieldsResp.objects?.find(f => f.name === 'Отрасль');
  const fieldIndustries = fieldsResp.objects?.find(f => f.name === 'Отрасли');
  if (!(fieldIndustry && fieldIndustries)) throw new Error('fields not found');

  // 3. Получить список контактов с заполненным полем "Отрасль"
  const contacts = await contactApi.getContactList({
    getContactListRequest: {
      templateId: template.id!,
      fields: 'all',
      filters: [{
        type: null,
        operator: 'notequal',
        value: '',
        field: fieldIndustry.id,
      }],
    },
  });

  // 4. В каждом контакте обновить поле "Отрасли"
  for (const c of contacts.objects ?? []) {
    const value = c.customFields?.find(cf => cf.id === fieldIndustry.id)?.value;
    if (!value) continue;
    await contactApi.postContact({
      contactRequest: {
        id: c.id,
        customFields: [{ id: fieldIndustries.id!, value: [value] }],
      },
    });
  }
}
