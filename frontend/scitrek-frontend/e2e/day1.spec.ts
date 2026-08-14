import { expect, test } from '@playwright/test';
import { loginWithStoredTokens, mockApi } from './helpers';

test('student edits and manually saves Day 1 work', async ({ page }) => {
  await loginWithStoredTokens(page);
  await mockApi(page);
  page.on('dialog', async (dialog) => {
    expect(dialog.message()).toContain('saved');
    await dialog.accept();
  });

  await page.goto('/sections/day-1');

  await expect(page.getByRole('heading', { name: /Day 1: Unlocking the Code/i })).toBeVisible();
  const answer = page.getByPlaceholder(/Use terms like promoter/i);
  await answer.fill('Promoters help control transcription.');
  await answer.locator('xpath=ancestor::section[1]').getByRole('button', { name: /^Save Section$/ }).click();
});

test('student reloads Day 1 and sees previously saved work', async ({ page }) => {
  await loginWithStoredTokens(page);
  await mockApi(page, { savedDay1: 'Saved from API' });

  await page.goto('/sections/day-1');

  await expect(page.getByPlaceholder(/Use terms like promoter/i)).toHaveValue('Saved from API');
});
