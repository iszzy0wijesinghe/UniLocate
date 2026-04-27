import { test, expect } from '@playwright/test';

test.describe('Debug Tests', () => {
  test('debug login page structure', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Get page content for debugging
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for heading
    const heading = page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: 'Login' });
    console.log('Login heading count:', await heading.count());
    
    // Check for UniLocate text
    const unilocate = page.getByText('UniLocate');
    console.log('UniLocate text count:', await unilocate.count());
    
    // Check for email field
    const emailField = page.locator('input[type="email"], input[label*="Email"], input[placeholder*="email"]');
    console.log('Email field count:', await emailField.count());
    
    // Check for password field
    const passwordField = page.locator('input[type="password"]');
    console.log('Password field count:', await passwordField.count());
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")');
    console.log('Submit button count:', await submitButton.count());
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-login.png' });
    
    // Basic checks
    await expect(page.locator('body')).toBeVisible();
  });

  test('debug dashboard page structure', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for redirect
    await page.waitForTimeout(2000);
    
    // Check if redirected to login
    const loginHeading = page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: 'Login' });
    console.log('Login heading on dashboard route:', await loginHeading.count());
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-dashboard.png' });
  });
});
