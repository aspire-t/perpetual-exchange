import { test, expect } from '@playwright/test';

test.describe('Wallet Connection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display Connect Wallet button on homepage', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
  });

  test('should show wallet detection error when no extension installed', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await connectButton.click();

    // Should show an error message about no wallet detected
    await expect(page.getByText(/no wallet detected|provider not found|install metamask/i))
      .toBeVisible({ timeout: 5000 });
  });

  test('should show connect wallet on trade page', async ({ page }) => {
    await page.goto('/trade');

    // Should show connect wallet message
    await expect(page.getByText(/connect your wallet to start trading/i)).toBeVisible();
  });

  test('should show connect wallet on deposit page', async ({ page }) => {
    await page.goto('/deposit');

    // Should show connect wallet message
    await expect(page.getByText(/connect your wallet to deposit/i)).toBeVisible();
  });

  test('should show connect wallet on withdraw page', async ({ page }) => {
    await page.goto('/withdraw');

    // Should show connect wallet message
    await expect(page.getByText(/connect your wallet to withdraw/i)).toBeVisible();
  });

  test('should show connect wallet on positions page', async ({ page }) => {
    await page.goto('/positions');

    // Should show connect wallet message
    await expect(page.getByText(/connect your wallet to view positions/i)).toBeVisible();
  });
});
