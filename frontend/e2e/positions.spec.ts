import { test, expect } from '@playwright/test';

test.describe('Positions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/positions');
  });

  test('should display positions page with navigation', async ({ page }) => {
    await expect(page.getByTestId('navigation')).toBeVisible();
  });

  test('should show connect wallet message when not connected', async ({ page }) => {
    await expect(page.getByText(/connect your wallet to view positions/i)).toBeVisible();
  });
});
