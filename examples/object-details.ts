import { ObjectApi } from '../src/generated';
import { loadConfig } from '../src/config';

// Получение деталей объекта "Продажа"
export async function getObjectDetails() {
  const config = loadConfig();

  const api = new ObjectApi(config);
  // 1. Основные поля объекта "Продажа"
  const object = await api.getObjectById({ id: 617 });
  console.log(object);

  // 2. Дополнительные поля объекта "Продажа"
  const extras = await api.getObjectList({ getObjectListRequest: { pageSize: 5 } });
  console.log(extras);
}

// Запуск примера если файл вызван напрямую
if (require.main === module) {
  getObjectDetails().catch(err => console.error(err));
}
