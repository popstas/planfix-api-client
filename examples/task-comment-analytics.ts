import { TaskApi, DataTagsApi } from '../src/generated';
import { loadConfig } from '../src/config';

// Создание комментария с аналитикой в задаче
export async function createCommentWithAnalytics() {
  const config = loadConfig();

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

// Запуск примера если файл вызван напрямую
if (require.main === module) {
  createCommentWithAnalytics().catch(err => console.error(err));
}
