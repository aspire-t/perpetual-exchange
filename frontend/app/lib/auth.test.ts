import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  buildLoginTypedData,
  getTokenStorageKey,
  readStoredJwt,
  writeStoredJwt,
} from './auth';

describe('auth helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('should build eip712 login typed data', () => {
    const typedData = buildLoginTypedData({
      address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
      nonce: 'nonce-1',
      issuedAt: 1711111111,
      statement: 'Login to Exchange',
      chainId: 31337,
      domainName: 'PerpetualExchange',
      domainVersion: '1',
    });

    expect(typedData.domain.name).toBe('PerpetualExchange');
    expect(typedData.domain.chainId).toBe(31337);
    expect(typedData.primaryType).toBe('Login');
    expect(typedData.message.nonce).toBe('nonce-1');
  });

  it('should persist jwt by wallet address', () => {
    const address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
    const key = getTokenStorageKey(address);
    writeStoredJwt(address, 'token-1');

    expect(key).toBe('pe.jwt.0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
    expect(readStoredJwt(address)).toBe('token-1');
  });
});
