import { loadConfig } from '../src/config';
import { TaskApi, ContactApi } from '../src/generated';
import * as dotenv from 'dotenv';

dotenv.config();

const shouldRun = !!process.env.PLANFIX_ACCOUNT && !!process.env.PLANFIX_TOKEN;
const testOrSkip = shouldRun ? test : test.skip;

const cfg = shouldRun ? loadConfig() : null as any;

testOrSkip('get task list', async () => {
  const api = new TaskApi(cfg);
  const res = await api.getTaskList({ getTaskListRequest: { pageSize: 5, fields: 'id,name' } });
  expect(Array.isArray(res.tasks)).toBe(true);
});

testOrSkip('get contact list', async () => {
  const api = new ContactApi(cfg);
  const res = await api.getContactList({ getContactListRequest: { pageSize: 5, fields: 'id,name' } });
  expect(Array.isArray(res.contacts)).toBe(true);
});

testOrSkip('get task details', async () => {
  const api = new TaskApi(cfg);
  const list = await api.getTaskList({ getTaskListRequest: { pageSize: 1, fields: 'id,name' } });
  const first = list.tasks?.[0];
  if (!first) throw new Error('No tasks in account');
  const res = await api.getTaskById({ id: first.id!, fields: 'id,name' });
  expect(res.task?.id).toBe(first.id);
});

testOrSkip('get contact details', async () => {
  const api = new ContactApi(cfg);
  const list = await api.getContactList({ getContactListRequest: { pageSize: 1, fields: 'id,name' } });
  const first = list.contacts?.[0];
  if (!first) throw new Error('No contacts in account');
  const res = await api.getContactById({ id: String(first.id), fields: 'id,name' });
  expect(res.contact?.id).toBe(first.id);
});
