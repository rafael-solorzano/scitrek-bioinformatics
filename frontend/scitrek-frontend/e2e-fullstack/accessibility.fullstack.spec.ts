import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

import { loginThroughUI } from './helpers';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(violation =>
    ['serious', 'critical'].includes(violation.impact || ''),
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test('login has no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Welcome to SciTrek/i })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('core authenticated student pages have no serious automated accessibility violations', async ({ page }) => {
  await loginThroughUI(page);

  for (const path of ['/inbox', '/sections/day-1', '/workbooks']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText('Loading…');
    await expectNoSeriousViolations(page);
  }
});
