# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple-buildings.spec.ts >> Buildings Page >> should redirect to login when not authenticated
- Location: simple-buildings.spec.ts:8:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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