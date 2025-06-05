import { loadConfig } from '../src/config';
import { TaskApi, ContactApi } from '../src/generated';
import * as dotenv from 'dotenv';

dotenv.config();

const shouldRun = !!process.env.PLANFIX_ACCOUNT && !!process.env.PLANFIX_TOKEN;
const testOrSkip = shouldRun ? test : test.skip;

const cfg = shouldRun ? loadConfig() : null as any;

testOrSkip('get task list', async () => {
  const api = new TaskApi(cfg);
  const tasks = await api.getTaskList();
  expect(Array.isArray(tasks.objects)).toBe(true);
});

testOrSkip('get contact list', async () => {
  const api = new ContactApi(cfg);
  const contacts = await api.getContactList();
  expect(Array.isArray(contacts.objects)).toBe(true);
});

testOrSkip('get task details', async () => {
  const api = new TaskApi(cfg);
  const list = await api.getTaskList();
  const first = list.objects?.[0];
  if (!first) throw new Error('No tasks in account');
  const task = await api.getTaskById({ id: first.id! });
  expect(task.id).toBe(first.id);
});

testOrSkip('get contact details', async () => {
  const api = new ContactApi(cfg);
  const list = await api.getContactList();
  const first = list.objects?.[0];
  if (!first) throw new Error('No contacts in account');
  const contact = await api.getContactById({ id: first.id! });
  expect(contact.id).toBe(first.id);
});
