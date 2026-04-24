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
4. `set-service-field.ts` – установка служебного булевого поля для списка задач из CSV.
5. `contacts-migrate-telegram.ts` – перенос значения из пользовательского поля (старый Telegram) в системное поле telegram у контактов; аргументы: `--dryRun`, `--telegramOldId`; лог в `data/contacts-migrate-telegram-log.csv`.
6. `contacts-update-supplier-gdrive.ts` – синхронизация пользовательского поля `gdrive_emails` у контактов по CSV (`Номер`, `Email`); обновляет только при расхождении списков email; аргументы: `--csv`, `--fieldId`, `--dryRun`.

Запуск любого примера:
```bash
npm run example -- ./examples/<file>.ts

## Сборка и тесты
```bash
npm install
npm run build
npm test
```
Скомпилированные файлы будут находиться в каталоге `dist`.
