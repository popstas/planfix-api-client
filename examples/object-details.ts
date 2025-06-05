import { Configuration, ObjectApi } from '../src/generated';

// Получение деталей объекта "Продажа"
export async function getObjectDetails() {
  const config = new Configuration({
    basePath: `https://${process.env.PLANFIX_ACCOUNT}.planfix.com/rest`,
    accessToken: process.env.PLANFIX_TOKEN,
  });

  const api = new ObjectApi(config);
  // 1. Основные поля объекта "Продажа"
  const object = await api.getObjectById({ id: 617 });
  console.log(object);

  // 2. Дополнительные поля объекта "Продажа"
  const extras = await api.getObjectList({ getObjectListRequest: { fields: 'extra' } });
  console.log(extras);
}
