import { test, expect } from '@playwright/test';

test.describe('Simple Working Tests', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show login heading', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should show UniLocate text', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('UniLocate', { exact: true })).toBeVisible();
  });

  test('should show password field', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show submit button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should redirect to login for protected routes', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should redirect to login for users page', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should redirect to login for complaints page', async ({ page }) => {
    await page.goto('/complaints');
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should redirect to login for lost-found page', async ({ page }) => {
    await page.goto('/lost-found');
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should redirect to login for buildings page', async ({ page }) => {
    await page.goto('/buildings');
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });
});
