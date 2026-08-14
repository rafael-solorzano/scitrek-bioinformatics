import { expect, test } from '@playwright/test';
import { mockApi } from './helpers';

test('anonymous user is redirected to login', async ({ page }) => {
  await mockApi(page);

  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /continue as guest/i })).toBeVisible();
});

test('bad student login shows invalid credentials', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');

  await page.getByLabel(/username/i).fill('student1001');
  await page.getByLabel(/password/i).fill('wrong');
  await page.locator('form').getByRole('button', { name: /^sign in$/i }).click();

  await expect(page.getByText(/invalid credentials/i)).toBeVisible();
});

test('guest login creates a session and lands on home', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');

  await page.getByRole('button', { name: /continue as guest/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/Hello,\s*Demo/i)).toBeVisible();
});
