# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug.spec.ts >> Debug Tests >> debug dashboard page structure
- Location: debug.spec.ts:41:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - generic [ref=e8]:
    - generic [ref=e9]:
      - heading "Login" [level=4] [ref=e10]
      - paragraph [ref=e11]: Sign in to access the UniLocate admin dashboard.
    - generic [ref=e12]:
      - generic: Admin Email
      - generic [ref=e13]:
        - textbox "Admin Email" [ref=e14]:
          - /placeholder: firstname.lastname@unilocateadmin.com
        - group:
          - generic: Admin Email
    - generic [ref=e15]:
      - generic: Password
      - generic [ref=e16]:
        - textbox "Password" [ref=e17]
        - button [ref=e19] [cursor=pointer]:
          - img [ref=e20]
        - group:
          - generic: Password
    - button "Sign In" [disabled]:
      - generic:
        - img
      - text: Sign In
    - paragraph [ref=e22]: Contact a system administrator if you need access.
  - generic [ref=e23]:
    - generic [ref=e24]:
      - paragraph [ref=e25]: UniLocate
      - paragraph [ref=e26]: Admin Dashboard
      - paragraph [ref=e27]: Secure access for operational campus management.
      - paragraph [ref=e28]: Monitor complaints, manage campus buildings, review lost & found activity, and control admin-level access with role-based permissions.
    - generic [ref=e29]:
      - paragraph [ref=e30]: Quick access
      - generic [ref=e31]:
        - paragraph [ref=e32]: • Complaint operations
        - paragraph [ref=e33]: • Building occupancy control
        - paragraph [ref=e34]: • Lost & found administration
        - paragraph [ref=e35]: • User and role management
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Debug Tests', () => {
  4  |   test('debug login page structure', async ({ page }) => {
  5  |     await page.goto('/login');
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
> 45 |     await page.waitForTimeout(2000);
     |                ^ Error: page.waitForTimeout: Test timeout of 30000ms exceeded.
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