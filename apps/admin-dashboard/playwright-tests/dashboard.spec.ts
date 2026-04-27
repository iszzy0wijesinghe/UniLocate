import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first before accessing dashboard
    await page.goto('/login');
    await page.getByLabel('Admin Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    
    // Wait for navigation to dashboard or login to complete
    await page.waitForTimeout(1000);
    
    // Now go to dashboard
    await page.goto('/dashboard');
  });

  test('should display dashboard with key metrics', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Check for key metric cards
    await expect(page.getByText('Total Buildings')).toBeVisible();
    await expect(page.getByText('Active Complaints')).toBeVisible();
    await expect(page.getByText('Lost Item Reports Today')).toBeVisible();
    await expect(page.getByText('Total Users')).toBeVisible();
  });

  test('should display dashboard subtitle', async ({ page }) => {
    await expect(page.getByText('Real-time UniLocate operational overview for campus admins.')).toBeVisible();
  });

  test('should display operational snapshot section', async ({ page }) => {
    await expect(page.getByText('Operational Snapshot')).toBeVisible();
    await expect(page.getByText('This section is now using live data from shared mobile-app database.')).toBeVisible();
    await expect(page.getByText('Overcrowded Buildings')).toBeVisible();
    await expect(page.getByText('Lost & Found Posts')).toBeVisible();
  });

  test('should display live alerts section', async ({ page }) => {
    await expect(page.getByText('Live Alerts')).toBeVisible();
    // Should show either alerts or no alerts message - use more specific selector
    const alertsSection = page.locator('[data-testid="live-alerts-section"], text=Live Alerts').first();
    await expect(alertsSection.locator('text=No live occupancy alerts right now., text=Live Alerts').first()).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Reload to see loading state
    await page.reload();
    await expect(page.locator('.MuiCircularProgress-root')).toBeVisible({ timeout: 3000 });
  });

  test('should display stat cards with icons', async ({ page }) => {
    // Wait for content to load using specific selectors instead of timeout
    await expect(page.locator('text=Total Buildings')).toBeVisible({ timeout: 5000 });
    
    // Check that stat cards are present
    await expect(page.locator('text=Total Buildings')).toBeVisible();
    await expect(page.locator('text=Active Complaints')).toBeVisible();
    await expect(page.locator('text=Lost Item Reports Today')).toBeVisible();
    await expect(page.locator('text=Total Users')).toBeVisible();
  });

  test('should show helper text for metrics', async ({ page }) => {
    // Wait for dashboard content to load
    await expect(page.locator('text=Total Buildings')).toBeVisible({ timeout: 5000 });
    
    // Check for helper text using more specific selectors
    await expect(page.locator('text=near threshold')).toBeVisible();
    await expect(page.locator('text=total complaint cases')).toBeVisible();
    await expect(page.locator('text=lost /')).toBeVisible();
    await expect(page.locator('text=overcrowded buildings')).toBeVisible();
  });
});
