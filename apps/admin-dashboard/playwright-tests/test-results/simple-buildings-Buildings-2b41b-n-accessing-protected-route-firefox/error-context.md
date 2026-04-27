# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple-buildings.spec.ts >> Buildings Page >> should show login form when accessing protected route
- Location: simple-buildings.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Buildings Page', () => {
> 4  |   test.beforeEach(async ({ page }) => {
     |        ^ Test timeout of 30000ms exceeded while running "beforeEach" hook.
  5  |     await page.goto('/buildings');
  6  |   });
  7  | 
  8  |   test('should redirect to login when not authenticated', async ({ page }) => {
  9  |     await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  10 |   });
  11 | 
  12 |   test('should show login form when accessing protected route', async ({ page }) => {
  13 |     await expect(page.getByLabel('Admin Email')).toBeVisible();
  14 |     await expect(page.getByLabel('Password')).toBeVisible();
  15 |     await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  16 |   });
  17 | });
  18 | 
```