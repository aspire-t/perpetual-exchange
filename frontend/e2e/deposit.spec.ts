import { test, expect } from '@playwright/test';

test.describe('Deposit Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deposit');
  });

  test('should display deposit page with navigation', async ({ page }) => {
    await expect(page.getByTestId('navigation')).toBeVisible();
  });

  test('should show connect wallet message when not connected', async ({ page }) => {
    await expect(page.getByText(/connect your wallet to deposit/i)).toBeVisible();
  });
});
