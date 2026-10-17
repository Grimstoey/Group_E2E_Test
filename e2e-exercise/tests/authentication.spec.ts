import { expect, test } from '@playwright/test';

test('requesting candidates without a token is rejected', async ({ request }) => {
  const res = await request.get('/me/candidates');

  expect(res.status(), await res.text()).toBe(401);
  expect(await res.json()).toEqual({ error: 'authentication required' });
});
