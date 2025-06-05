import { Configuration, TaskApi, DataTagsApi } from '../src/generated';

// Создание комментария с аналитикой в задаче
export async function createCommentWithAnalytics() {
  const config = new Configuration({
    basePath: 'https://your-account.planfix.com/rest',
    accessToken: 'YOUR_TOKEN',
  });

  const taskApi = new TaskApi(config);
  const dataTagApi = new DataTagsApi(config);

  // 1. Получить id аналитики "Оплата факт"
  const dataTags = await dataTagApi.getDatatagList();
  const analytic = dataTags.objects?.find(d => d.name === 'Оплата факт');
  if (!analytic) throw new Error('datatag not found');

  // 2. Получить id полей аналитики
  const fields = await dataTagApi.getDatatagFields({ id: analytic.id });

  // 3. Создать комментарий с аналитикой в задаче 123456
  await taskApi.postTaskAddDataTagEntryNewComment({
    id: 123456,
    dataTagEntryCreateRequest: {
      datatagId: analytic.id!,
      fields: fields.objects?.map(f => ({ id: f.id!, value: Math.random().toString() }))
    }
  });
}
