import { test, expect } from '@playwright/test';

test.describe('Working Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h4').filter({ hasText: 'Login' })).toBeVisible();
  });

  test('should show UniLocate branding', async ({ page }) => {
    await expect(page.getByText('UniLocate', { exact: true })).toBeVisible();
    await expect(page.getByText('Admin Dashboard', { exact: true })).toBeVisible();
  });

  test('should show email field', async ({ page }) => {
    // Use getByLabel instead of complex locator chain
    const emailField = page.getByLabel('Admin Email');
    await expect(emailField).toBeVisible();
  });

  test('should show password field', async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show submit button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('should disable submit button when form is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await expect(submitButton).toBeDisabled();
  });

  test('should enable submit button when form is filled', async ({ page }) => {
    // Fill email field using getByLabel
    const emailField = page.getByLabel('Admin Email');
    await emailField.fill('test@example.com');
    
    // Fill password field
    const passwordField = page.getByLabel('Password');
    await passwordField.fill('password123');
    
    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await expect(submitButton).toBeEnabled();
  });

  test('should show password visibility toggle', async ({ page }) => {
    const passwordField = page.getByLabel('Password');
    await expect(passwordField).toHaveAttribute('type', 'password');
    
    // Click visibility toggle using getByLabel for better reliability
    const toggleButton = page.getByLabel('toggle password visibility').or(
      page.locator('button').filter({ has: page.locator('svg') }).first()
    );
    await toggleButton.click();
    await expect(passwordField).toHaveAttribute('type', 'text');
  });

  test('should have correct placeholder text', async ({ page }) => {
    const emailField = page.getByLabel('Admin Email');
    await expect(emailField).toHaveAttribute('placeholder', 'firstname.lastname@unilocateadmin.com');
  });

  test('should show contact information', async ({ page }) => {
    await expect(page.getByText('Contact a system administrator if you need access.')).toBeVisible();
  });

  test('should show quick access features', async ({ page }) => {
    await expect(page.getByText('Quick access')).toBeVisible();
    await expect(page.getByText('Complaint operations')).toBeVisible();
    await expect(page.getByText('Building occupancy control')).toBeVisible();
    await expect(page.getByText('Lost & found administration')).toBeVisible();
    await expect(page.getByText('User and role management')).toBeVisible();
  });
});
