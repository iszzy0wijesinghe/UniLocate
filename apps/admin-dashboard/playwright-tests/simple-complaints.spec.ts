import { test, expect } from '@playwright/test';

test.describe('Complaints Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/complaints');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('should show login form when accessing protected route', async ({ page }) => {
    await expect(page.getByLabel('Admin Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
