# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug.spec.ts >> Debug Tests >> debug login page structure
- Location: debug.spec.ts:4:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: Test timeout of 30000ms exceeded.
Call log:
  - navigating to "http://localhost:5173/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Debug Tests', () => {
  4  |   test('debug login page structure', async ({ page }) => {
> 5  |     await page.goto('/login');
     |                ^ Error: page.goto: Test timeout of 30000ms exceeded.
  6  |     
  7  |     // Wait for page to load
  8  |     await page.waitForTimeout(2000);
  9  |     
  10 |     // Get page content for debugging
  11 |     const title = await page.title();
  12 |     console.log('Page title:', title);
  13 |     
  14 |     // Check for heading
  15 |     const heading = page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: 'Login' });
  16 |     console.log('Login heading count:', await heading.count());
  17 |     
  18 |     // Check for UniLocate text
  19 |     const unilocate = page.getByText('UniLocate');
  20 |     console.log('UniLocate text count:', await unilocate.count());
  21 |     
  22 |     // Check for email field
  23 |     const emailField = page.locator('input[type="email"], input[label*="Email"], input[placeholder*="email"]');
  24 |     console.log('Email field count:', await emailField.count());
  25 |     
  26 |     // Check for password field
  27 |     const passwordField = page.locator('input[type="password"]');
  28 |     console.log('Password field count:', await passwordField.count());
  29 |     
  30 |     // Check for submit button
  31 |     const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
  32 |     console.log('Submit button count:', await submitButton.count());
  33 |     
  34 |     // Take screenshot for debugging
  35 |     await page.screenshot({ path: 'debug-login.png' });
  36 |     
  37 |     // Basic checks
  38 |     await expect(page.locator('body')).toBeVisible();
  39 |   });
  40 | 
  41 |   test('debug dashboard page structure', async ({ page }) => {
  42 |     await page.goto('/dashboard');
  43 |     
  44 |     // Wait for redirect
  45 |     await page.waitForTimeout(2000);
  46 |     
  47 |     // Check if redirected to login
  48 |     const loginHeading = page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: 'Login' });
  49 |     console.log('Login heading on dashboard route:', await loginHeading.count());
  50 |     
  51 |     // Take screenshot for debugging
  52 |     await page.screenshot({ path: 'debug-dashboard.png' });
  53 |   });
  54 | });
  55 | 
```