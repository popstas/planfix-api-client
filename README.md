# Planfix TypeScript Client

Библиотека автоматически сгенерирована из [swagger.json](https://help.planfix.com/restapidocs/swagger.json) при помощи `openapi-generator`. Файлы в каталоге `src/generated` не должны изменяться вручную.

## Документация
- [Список всех эндпоинтов](docs/ENDPOINTS.md)
- [Сложные фильтры](docs/complex-filters.md)
- [Словарь терминов](docs/dictionary.md)

## Примеры
В каталоге [examples](examples) показаны способы использования клиента:
1. `mass-update-contacts.ts` – массовое изменение поля у контактов.
2. `task-comment-analytics.ts` – добавление комментария с аналитикой в задачу.
3. `object-details.ts` – получение подробной информации об объекте.

Запуск любого примера:
```bash
npm run example -- ./examples/<file>.ts
```

## Сборка и тесты
```bash
npm install
npm run build
npm test
```
Скомпилированные файлы будут находиться в каталоге `dist`.
