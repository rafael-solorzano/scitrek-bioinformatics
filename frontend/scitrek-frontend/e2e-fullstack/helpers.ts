import { APIRequestContext, expect, Page } from '@playwright/test';

export const backendURL = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8011';

export async function loginThroughUI(
  page: Page,
  username = 'student1001',
  password = 'student1001',
) {
  await page.goto('/login');
  await page.getByLabel(/^username$/i).fill(username);
  await page.getByLabel(/^password$/i).fill(password);
  await page.locator('form').getByRole('button', { name: /^sign in$/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/Hello,\s*Demo/i)).toBeVisible();
}

export async function apiToken(
  request: APIRequestContext,
  username: string,
  password: string,
) {
  const response = await request.post(`${backendURL}/api/token/`, {
    data: { username, password },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.access as string;
}

export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
