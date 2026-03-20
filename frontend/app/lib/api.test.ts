import { describe, expect, it } from '@jest/globals';
import { toApiUrl } from './api';

describe('api url helper', () => {
  it('should always build urls under /api', () => {
    expect(toApiUrl('/price/ETH')).toBe('/api/price/ETH');
    expect(toApiUrl('balance/0xabc')).toBe('/api/balance/0xabc');
  });
});
