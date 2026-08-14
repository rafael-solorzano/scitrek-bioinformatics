import { expect, test } from '@playwright/test';
import { loginWithStoredTokens, mockApi } from './helpers';

test('student opens an unread inbox message and sees the unread count update', async ({ page }) => {
  await loginWithStoredTokens(page);
  await mockApi(page);

  await page.goto('/inbox');

  await expect(page.getByRole('heading', { name: /SciTrek Inbox \(1 Unread\)/i })).toBeVisible();
  await page.getByRole('button', { name: /Welcome to SciTrek unread/i }).click();
  await expect(page.getByRole('heading', { name: /SciTrek Inbox \(0 Unread\)/i })).toBeVisible();
  await expect(page.getByText('Your SciTrek inbox is ready.', { exact: true })).toBeVisible();
});
