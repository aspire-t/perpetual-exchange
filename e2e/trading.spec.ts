import { test, expect } from '@playwright/test';

test.describe('Trading Page', () => {
  test('should display trading page with wallet connection prompt', async ({ page }) => {
    await page.goto('/trade');

    await expect(page).toHaveTitle(/Perpetual/);
    await expect(page.getByRole('button', { name: 'Connect Wallet' })).toBeVisible();
  });

  test('should display trade interface after wallet connection', async ({ page }) => {
    // Mock the wallet connection by injecting ethereum provider before page loads
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539'; // 1337 in hex
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

    // Wallet should be auto-connected, verify trade interface is visible
    await expect(page.getByRole('heading', { name: 'Trade Perpetual Futures' })).toBeVisible();
    await expect(page.getByText('ETH Price')).toBeVisible();
    await expect(page.getByLabel('Position Size (USDC)')).toBeVisible();
  });

  test('should allow entering position size', async ({ page }) => {
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

    const sizeInput = page.locator('input#size');
    await sizeInput.fill('100');
    await expect(sizeInput).toHaveValue('100');
  });

  test('should display Long and Short buttons', async ({ page }) => {
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

    await expect(page.locator('button:has-text("Long")')).toBeVisible();
    await expect(page.locator('button:has-text("Short")')).toBeVisible();
  });

  test('should show validation error for invalid size', async ({ page }) => {
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

    const sizeInput = page.locator('input#size');
    await sizeInput.fill('-1');

    const longButton = page.locator('button:has-text("Long")');
    await longButton.click();

    // Should show error message
    await expect(page.locator('text=Please enter a valid size')).toBeVisible();
  });

  test('should display leverage slider with default value of 1x', async ({ page }) => {
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
