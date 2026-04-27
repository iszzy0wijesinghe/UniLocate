# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication >> should show password visibility toggle
- Location: auth.spec.ts:34:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Authentication', () => {
> 4  |   test.beforeEach(async ({ page }) => {
     |        ^ Test timeout of 30000ms exceeded while running "beforeEach" hook.
  5  |     await page.goto('/login');
  6  |   });
  7  | 
  8  |   test('should display login page', async ({ page }) => {
  9  |     await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  10 |     await expect(page.getByLabel('Admin Email')).toBeVisible();
  11 |     await expect(page.getByLabel('Password')).toBeVisible();
  12 |     await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  13 |   });
  14 | 
  15 |   test('should show UniLocate branding', async ({ page }) => {
  16 |     await expect(page.getByText('UniLocate', { exact: true })).toBeVisible();
  17 |     await expect(page.getByText('Admin Dashboard', { exact: true })).toBeVisible();
  18 |     await expect(page.getByText('Secure access for operational campus management.')).toBeVisible();
  19 |   });
  20 | 
  21 |   test('should disable submit button when form is empty', async ({ page }) => {
  22 |     const submitButton = page.getByRole('button', { name: 'Sign In' });
  23 |     await expect(submitButton).toBeDisabled();
  24 |   });
  25 | 
  26 |   test('should enable submit button when form is filled', async ({ page }) => {
  27 |     await page.getByLabel('Admin Email').fill('test@example.com');
  28 |     await page.getByLabel('Password').fill('password123');
  29 |     
  30 |     const submitButton = page.getByRole('button', { name: 'Sign In' });
  31 |     await expect(submitButton).toBeEnabled();
  32 |   });
  33 | 
  34 |   test('should show password visibility toggle', async ({ page }) => {
  35 |     const passwordField = page.getByLabel('Password');
  36 |     await expect(passwordField).toHaveAttribute('type', 'password');
  37 |     
  38 |     // Click visibility toggle using a more specific selector
  39 |     const toggleButton = page.locator('button[aria-label*="password"], button[aria-label*="visibility"], button').filter({ has: page.locator('svg') }).first();
  40 |     await toggleButton.click();
  41 |     await expect(passwordField).toHaveAttribute('type', 'text');
  42 |   });
  43 | 
  44 |   test('should show loading state during login', async ({ page }) => {
  45 |     await page.getByLabel('Admin Email').fill('test@example.com');
  46 |     await page.getByLabel('Password').fill('password123');
  47 |     
  48 |     const submitButton = page.getByRole('button', { name: 'Sign In' });
  49 |     await submitButton.click();
  50 |     
  51 |     // Check that login attempt was made (button remains clickable or page changes)
  52 |     // This test verifies the login flow works without making assumptions about loading states
  53 |     await expect(submitButton).toBeVisible({ timeout: 3000 });
  54 |   });
  55 | 
  56 |   test('should show error message for invalid credentials', async ({ page }) => {
  57 |     await page.getByLabel('Admin Email').fill('invalid@test.com');
  58 |     await page.getByLabel('Password').fill('wrongpassword');
  59 |     await page.getByRole('button', { name: 'Sign In' }).click();
  60 |     
  61 |     // Wait for error message with reasonable timeout instead of fixed timeout
  62 |     await expect(page.locator('.MuiAlert-root, [role="alert"]').first()).toBeVisible({ timeout: 5000 });
  63 |   });
  64 | 
  65 |   test('should have correct placeholder text', async ({ page }) => {
  66 |     const emailField = page.getByLabel('Admin Email');
  67 |     await expect(emailField).toHaveAttribute('placeholder', 'firstname.lastname@unilocateadmin.com');
  68 |   });
  69 | 
  70 |   test('should show contact information', async ({ page }) => {
  71 |     await expect(page.getByText('Contact a system administrator if you need access.')).toBeVisible();
  72 |   });
  73 | 
  74 |   test('should show quick access features', async ({ page }) => {
  75 |     await expect(page.getByText('Quick access')).toBeVisible();
  76 |     await expect(page.getByText('Complaint operations')).toBeVisible();
  77 |     await expect(page.getByText('Building occupancy control')).toBeVisible();
  78 |     await expect(page.getByText('Lost & found administration')).toBeVisible();
  79 |     await expect(page.getByText('User and role management')).toBeVisible();
  80 |   });
  81 | });
  82 | 
```