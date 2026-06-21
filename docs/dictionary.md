# Термины

| Русский термин | Английский идентификатор |
|----------------|-----------------------|
| Аналитика | datatag |
| Задача | task |
| Контакт | contact |
| Комментарий | comment |
| Файл, документ | file |
| Проект | project |
| Сотрудник, пользователь | user |
| Сценарий, процесс | process |
| Отчёт | report |
| Объект | object |
| Кастомное поле, пользовательские поля, поля задачи, поля контакта | customfield |

## Обновление кастомных полей

В сгенерированных TS-типах при записи используется поле `customFieldData`, а не «сырое»
`customFields: [{ id, value }]` из некоторых старых примеров. Форма — `customFieldData: [{ field: { id }, value }]`,
причём `value` типизирован как `object`, поэтому примитивы оборачиваются (например `value: [x]`).
Подробнее: [`skills/planfix-api-client/references/mutations.md`](../skills/planfix-api-client/references/mutations.md).
