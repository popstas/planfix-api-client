import { ObjectApi } from '../src/generated';
import { loadConfig } from '../src/config';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  getObjectDetails().catch(err => console.error(err));
}
