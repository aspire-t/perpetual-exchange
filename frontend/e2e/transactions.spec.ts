import { test, expect } from '@playwright/test';

test.describe('Transaction History Page', () => {
  test('should display page title', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('heading', { name: 'Transaction History', level: 1 })).toBeVisible();
  });

  test('should display three tabs', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByRole('button', { name: 'Deposits' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdrawals' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Orders' })).toBeVisible();
  });

  test('should switch to withdrawals tab', async ({ page }) => {
    await page.goto('/transactions');

    // Click Withdrawals tab
    await page.getByRole('button', { name: 'Withdrawals' }).click();

    // Should display withdrawals content
    await expect(page.getByText(/no withdrawals yet/i)).toBeVisible();
  });

  test('should switch to orders tab', async ({ page }) => {
    await page.goto('/transactions');

    // Click Orders tab
    await page.getByRole('button', { name: 'Orders' }).click();

    // Should display orders content
    await expect(page.getByText(/no orders yet/i)).toBeVisible();
  });

  test('should navigate to transactions page from home', async ({ page }) => {
    await page.goto('/');

    // Click History link in navigation
    await page.getByTestId('navigation').getByRole('link', { name: 'History' }).click();

    // Should navigate to transactions page
    await expect(page).toHaveURL('/transactions');
    await expect(page.getByRole('heading', { name: 'Transaction History', level: 1 })).toBeVisible();
  });
});
