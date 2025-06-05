import { Configuration, ObjectApi } from '../src/generated';

// Получение деталей объекта "Продажа"
export async function getObjectDetails() {
  const config = new Configuration({
    basePath: 'https://your-account.planfix.com/rest',
    accessToken: 'YOUR_TOKEN',
  });

  const api = new ObjectApi(config);
  // 1. Основные поля объекта "Продажа"
  const object = await api.getObjectById({ id: 'Продажа' });
  console.log(object);

  // 2. Дополнительные поля объекта "Продажа"
  const extras = await api.getObjectList({ getObjectListRequest: { fields: 'extra' } });
  console.log(extras);
}
