# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> should display dashboard subtitle
- Location: dashboard.spec.ts:28:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Real-time UniLocate operational overview for campus admins.')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Real-time UniLocate operational overview for campus admins.')

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
  3  | test.describe('Dashboard', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login first before accessing dashboard
  6  |     await page.goto('/login');
  7  |     await page.getByLabel('Admin Email').fill('admin@example.com');
  8  |     await page.getByLabel('Password').fill('password123');
  9  |     await page.getByRole('button', { name: 'Sign In' }).click();
  10 |     
  11 |     // Wait for navigation to dashboard or login to complete
  12 |     await page.waitForTimeout(1000);
  13 |     
  14 |     // Now go to dashboard
  15 |     await page.goto('/dashboard');
  16 |   });
  17 | 
  18 |   test('should display dashboard with key metrics', async ({ page }) => {
  19 |     await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  20 |     
  21 |     // Check for key metric cards
  22 |     await expect(page.getByText('Total Buildings')).toBeVisible();
  23 |     await expect(page.getByText('Active Complaints')).toBeVisible();
  24 |     await expect(page.getByText('Lost Item Reports Today')).toBeVisible();
  25 |     await expect(page.getByText('Total Users')).toBeVisible();
  26 |   });
  27 | 
  28 |   test('should display dashboard subtitle', async ({ page }) => {
> 29 |     await expect(page.getByText('Real-time UniLocate operational overview for campus admins.')).toBeVisible();
     |                                                                                                 ^ Error: expect(locator).toBeVisible() failed
  30 |   });
  31 | 
  32 |   test('should display operational snapshot section', async ({ page }) => {
  33 |     await expect(page.getByText('Operational Snapshot')).toBeVisible();
  34 |     await expect(page.getByText('This section is now using live data from shared mobile-app database.')).toBeVisible();
  35 |     await expect(page.getByText('Overcrowded Buildings')).toBeVisible();
  36 |     await expect(page.getByText('Lost & Found Posts')).toBeVisible();
  37 |   });
  38 | 
  39 |   test('should display live alerts section', async ({ page }) => {
  40 |     await expect(page.getByText('Live Alerts')).toBeVisible();
  41 |     // Should show either alerts or no alerts message - use more specific selector
  42 |     const alertsSection = page.locator('[data-testid="live-alerts-section"], text=Live Alerts').first();
  43 |     await expect(alertsSection.locator('text=No live occupancy alerts right now., text=Live Alerts').first()).toBeVisible();
  44 |   });
  45 | 
  46 |   test('should show loading state initially', async ({ page }) => {
  47 |     // Reload to see loading state
  48 |     await page.reload();
  49 |     await expect(page.locator('.MuiCircularProgress-root')).toBeVisible({ timeout: 3000 });
  50 |   });
  51 | 
  52 |   test('should display stat cards with icons', async ({ page }) => {
  53 |     // Wait for content to load using specific selectors instead of timeout
  54 |     await expect(page.locator('text=Total Buildings')).toBeVisible({ timeout: 5000 });
  55 |     
  56 |     // Check that stat cards are present
  57 |     await expect(page.locator('text=Total Buildings')).toBeVisible();
  58 |     await expect(page.locator('text=Active Complaints')).toBeVisible();
  59 |     await expect(page.locator('text=Lost Item Reports Today')).toBeVisible();
  60 |     await expect(page.locator('text=Total Users')).toBeVisible();
  61 |   });
  62 | 
  63 |   test('should show helper text for metrics', async ({ page }) => {
  64 |     // Wait for dashboard content to load
  65 |     await expect(page.locator('text=Total Buildings')).toBeVisible({ timeout: 5000 });
  66 |     
  67 |     // Check for helper text using more specific selectors
  68 |     await expect(page.locator('text=near threshold')).toBeVisible();
  69 |     await expect(page.locator('text=total complaint cases')).toBeVisible();
  70 |     await expect(page.locator('text=lost /')).toBeVisible();
  71 |     await expect(page.locator('text=overcrowded buildings')).toBeVisible();
  72 |   });
  73 | });
  74 | 
```