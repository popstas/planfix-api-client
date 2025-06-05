import { Configuration, ContactApi } from '../src/generated';

test('configuration base path', () => {
  const cfg = new Configuration({ basePath: 'https://example.com' });
  const api = new ContactApi(cfg);
  // @ts-ignore access private field for test
  expect((api as any).configuration.basePath).toBe('https://example.com');
});
