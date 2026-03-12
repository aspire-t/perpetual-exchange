import { test, expect } from '@playwright/test';

test.describe('Trade Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trade');
  });

  test('should display trade page with navigation', async ({ page }) => {
    await expect(page.getByTestId('navigation')).toBeVisible();
    await expect(page.getByText(/connect your wallet to start trading/i)).toBeVisible();
  });

  test('should show connect wallet message when not connected', async ({ page }) => {
    // The page should show connect wallet message
    await expect(page.getByText(/connect your wallet to start trading/i)).toBeVisible();
  });
});
