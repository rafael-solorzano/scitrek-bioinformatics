import { expect, test } from '@playwright/test';

import { apiToken, backendURL, bearer, loginThroughUI } from './helpers';

test('student saves Day 1 work through Django and sees it after reload', async ({ page, request }) => {
  await loginThroughUI(page);
  await page.goto('/sections/day-1');

  const answer = `Persisted by Playwright ${Date.now()}`;
  const field = page.getByPlaceholder(/Use terms like promoter/i);
  await expect(field).toBeVisible();
  await field.fill(answer);

  page.once('dialog', async dialog => dialog.accept());
  await page.getByRole('button', { name: /^Save$/ }).click();

  await page.reload();
  await expect(page.getByPlaceholder(/Use terms like promoter/i)).toHaveValue(answer);

  const token = await apiToken(request, 'student1001', 'student1001');
  const persisted = await request.get(`${backendURL}/api/student/modules/1/response/detail/`, {
    headers: bearer(token),
  });
  expect(persisted.ok()).toBeTruthy();
  expect((await persisted.json()).answers.geneQ1).toBe(answer);
});

test('student inbox read state persists in the database', async ({ page, request }) => {
  const token = await apiToken(request, 'student1001', 'student1001');
  const before = await request.get(`${backendURL}/api/student/inbox/`, {
    headers: bearer(token),
  });
  expect(before.ok()).toBeTruthy();
  const payload = await before.json();
  const messages = payload.results || payload;
  const unread = messages.find((message: { is_read: boolean }) => !message.is_read);
  expect(unread).toBeTruthy();

  await loginThroughUI(page);
  await page.goto('/inbox');
  await page.getByRole('button', { name: new RegExp(`${unread.subject} unread`, 'i') }).click();

  const after = await request.get(`${backendURL}/api/student/inbox/`, {
    headers: bearer(token),
  });
  const afterPayload = await after.json();
  const persisted = (afterPayload.results || afterPayload).find(
    (message: { id: number }) => message.id === unread.id,
  );
  expect(persisted.is_read).toBe(true);

  await page.reload();
  await expect(page.getByRole('button', { name: new RegExp(`${unread.subject} unread`, 'i') })).toHaveCount(0);
});
