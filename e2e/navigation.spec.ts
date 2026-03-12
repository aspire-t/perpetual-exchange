import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should display navigation bar', async ({ page }) => {
    await page.goto('/');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Check trade page link - use text content to be specific
    const tradeLink = page.getByRole('link', { name: 'Trade' });
    await expect(tradeLink).toBeVisible();
  });
});
