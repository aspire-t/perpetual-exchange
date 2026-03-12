import { test, expect } from '@playwright/test';

test.describe('Backend API', () => {
  const API_BASE_URL = 'http://localhost:3001';

  test('should return health check', async ({ request }) => {
    // Use root endpoint as health check since there's no dedicated /health endpoint
    const response = await request.get(`${API_BASE_URL}/`);
    expect(response.ok()).toBeTruthy();
  });

  test('should return price data', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/price`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data).toHaveProperty('coin');
    expect(data.data).toHaveProperty('price');
  });

  test('should return price for specific coin', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/price/ETH`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data.coin).toBe('ETH');
  });

  test('should create order for new user (auto-create)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/order`, {
      data: {
        address: '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3',
        type: 'market',
        side: 'long',
        size: '1000000000000000000',
      },
    });

    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('userId');
  });

  test('should return orders for user', async ({ request }) => {
    const testAddress = '0xe2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2';

    // First create an order
    await request.post(`${API_BASE_URL}/order`, {
      data: {
        address: testAddress,
        type: 'market',
        side: 'short',
        size: '500000000000000000',
      },
    });

    // Then get user orders
    const response = await request.get(`${API_BASE_URL}/order/user/${testAddress}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('should return balance for user', async ({ request }) => {
    const testAddress = '0x3333333333333333333333333333333333333333';

    const response = await request.get(`${API_BASE_URL}/balance/${testAddress}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data).toHaveProperty('totalDeposits');
    expect(data.data).toHaveProperty('availableBalance');
  });

  test('should handle address case insensitivity', async ({ request }) => {
    const mixedCaseAddress = '0xABCD1234ABCD1234ABCD1234ABCD1234ABCD1234';
    const lowerCaseAddress = mixedCaseAddress.toLowerCase();

    // Create order with mixed case
    const response1 = await request.post(`${API_BASE_URL}/order`, {
      data: {
        address: mixedCaseAddress,
        type: 'market',
        side: 'long',
        size: '1000000000000000000',
      },
    });
    expect(response1.ok()).toBeTruthy();

    // Create another order with lowercase - should use same user
    const response2 = await request.post(`${API_BASE_URL}/order`, {
      data: {
        address: lowerCaseAddress,
        type: 'market',
        side: 'short',
        size: '500000000000000000',
      },
    });
    expect(response2.ok()).toBeTruthy();

    const data1 = await response1.json();
    const data2 = await response2.json();

    // Both orders should belong to the same user
    expect(data1.data.userId).toBe(data2.data.userId);
  });
});
