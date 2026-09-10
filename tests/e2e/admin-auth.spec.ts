import { expect, test } from '@playwright/test';

test('login and recovery entry points are accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
});
