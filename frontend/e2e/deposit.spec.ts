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

  test('should have correct page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Perpetual/);
  });
});

test.describe('Deposit Page - Connected Wallet', () => {
  // These tests would require actual wallet connection or a mock connector
  // For now, they serve as documentation for what should be tested manually
  // or with a more sophisticated wallet mocking setup

  test('should display balance and allowance cards when connected', async ({ page }) => {
    test.skip(); // Requires wallet connection mock
    // When wallet is connected:
    // - Should show "Available Balance" card
    // - Should show "Vault Allowance" card
  });

  test('should enable approve button when amount is entered', async ({ page }) => {
    test.skip(); // Requires wallet connection mock
    // When wallet is connected and amount is entered:
    // - Approve button should be enabled
    // - Deposit button should be disabled until approved
  });

  test('should complete approve + deposit flow', async ({ page }) => {
    test.skip(); // Requires wallet connection mock
    // Full flow:
    // 1. Enter amount
    // 2. Click Approve
    // 3. Wait for approval confirmation
    // 4. Click Deposit
    // 5. Verify deposit confirmation
  });
});
