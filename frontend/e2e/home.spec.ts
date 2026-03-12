import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display home page with navigation', async ({ page }) => {
    await page.goto('/');

    // Check for navigation element
    await expect(page.getByTestId('navigation')).toBeVisible();

    // Check for main heading
    await expect(page.getByRole('heading', { name: /perpetual futures exchange/i, level: 1 })).toBeVisible();
  });

  test('should navigate to trade page from home', async ({ page }) => {
    await page.goto('/');

    // Click on Trade link in navigation (scope to nav element to avoid matching the CTA button)
    await page.getByTestId('navigation').getByRole('link', { name: 'Trade' }).click();

    // Should navigate to trade page
    await expect(page).toHaveURL('/trade');
    await expect(page.getByText(/connect your wallet to start trading/i)).toBeVisible();
  });

  test('should navigate to deposit page from home', async ({ page }) => {
    await page.goto('/');

    // Click on Deposit link in navigation (scope to nav element to avoid matching the CTA button)
    await page.getByTestId('navigation').getByRole('link', { name: 'Deposit' }).click();

    // Should navigate to deposit page
    await expect(page).toHaveURL('/deposit');
    await expect(page.getByText(/connect your wallet to deposit/i)).toBeVisible();
  });

  test('should navigate to withdraw page from home', async ({ page }) => {
    await page.goto('/');

    // Click on Withdraw link in navigation
    await page.getByTestId('navigation').getByRole('link', { name: 'Withdraw' }).click();

    // Should navigate to withdraw page
    await expect(page).toHaveURL('/withdraw');
    await expect(page.getByText(/connect your wallet to withdraw/i)).toBeVisible();
  });

  test('should navigate to positions page from home', async ({ page }) => {
    await page.goto('/');

    // Click on Positions link in navigation
    await page.getByTestId('navigation').getByRole('link', { name: 'Positions' }).click();

    // Should navigate to positions page
    await expect(page).toHaveURL('/positions');
    await expect(page.getByText(/connect your wallet to view positions/i)).toBeVisible();
  });
});
