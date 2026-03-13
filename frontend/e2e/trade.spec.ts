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

  test('should display leverage slider with default value of 1x', async ({ page }) => {
    // Mock the wallet connection by injecting ethereum provider before page loads
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539';
          }
          if (method === 'eth_accounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/trade');
    await page.waitForTimeout(500);

    const leverageSlider = page.locator('input[type="range"][aria-label*="leverage" i]');
    await expect(leverageSlider).toBeVisible();
    await expect(leverageSlider).toHaveValue('1');

    // Verify leverage display shows 1x
    await expect(page.getByText('1x')).toBeVisible();
  });

  test('should allow changing leverage from 1x to 10x', async ({ page }) => {
    // Mock the wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539';
          }
          if (method === 'eth_accounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/trade');
    await page.waitForTimeout(500);

    const leverageSlider = page.locator('input[type="range"][aria-label*="leverage" i]');

    // Change leverage to 10x
    await leverageSlider.fill('10');
    await leverageSlider.dispatchEvent('input');

    await expect(leverageSlider).toHaveValue('10');

    // Verify leverage display shows 10x
    await expect(page.getByText('10x')).toBeVisible();
  });

  test('should update margin required when leverage changes', async ({ page }) => {
    // Mock the wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539';
          }
          if (method === 'eth_accounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/trade');
    await page.waitForTimeout(500);

    // Enter position size of 100 USDC
    const sizeInput = page.locator('input#size');
    await sizeInput.fill('100');

    // At 1x leverage, margin required should be 100 USDC
    await expect(page.getByText(/Margin required:.*100.*USDC/)).toBeVisible();

    const leverageSlider = page.locator('input[type="range"][aria-label*="leverage" i]');

    // Change leverage to 5x
    await leverageSlider.fill('5');
    await leverageSlider.dispatchEvent('input');

    // At 5x leverage, margin required should be 20 USDC (100 / 5)
    await expect(page.getByText(/Margin required:.*20.*USDC.*5x/)).toBeVisible();
  });
});
