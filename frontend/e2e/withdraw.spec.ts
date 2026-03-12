import { test, expect } from '@playwright/test';

test.describe('Withdraw Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/withdraw');
  });

  test('should display withdraw page with navigation', async ({ page }) => {
    await expect(page.getByTestId('navigation')).toBeVisible();
  });

  test('should show connect wallet message when not connected', async ({ page }) => {
    await expect(page.getByText(/connect your wallet to withdraw/i)).toBeVisible();
  });
});
