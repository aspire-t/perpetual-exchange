'use client';

import { useCallback } from 'react';
import { useAccount, useChainId, useSignTypedData } from 'wagmi';
import {
  buildLoginTypedData,
  readStoredJwt,
  writeStoredJwt,
} from '../lib/auth';
import { apiFetchJson } from '../lib/api';
const AUTH_DOMAIN_NAME = process.env.NEXT_PUBLIC_AUTH_DOMAIN_NAME || 'PerpetualExchange';
const AUTH_DOMAIN_VERSION = process.env.NEXT_PUBLIC_AUTH_DOMAIN_VERSION || '1';
const AUTH_STATEMENT = process.env.NEXT_PUBLIC_AUTH_STATEMENT || 'Login to Exchange';

export function useAuthToken() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();

  const ensureToken = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    const cached = readStoredJwt(address);
    if (cached) {
      return cached;
    }

    const nonceData = await apiFetchJson<any>(
      `/auth/nonce?address=${encodeURIComponent(address)}`,
    );
    if (!nonceData.success || !nonceData.nonce) {
      throw new Error(nonceData.error || 'Failed to get login nonce');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const typedData = buildLoginTypedData({
      address,
      nonce: nonceData.nonce,
      issuedAt,
      statement: AUTH_STATEMENT,
      chainId: Number(chainId || 31337),
      domainName: AUTH_DOMAIN_NAME,
      domainVersion: AUTH_DOMAIN_VERSION,
    });

    const signature = await signTypedDataAsync(typedData);

    const loginData = await apiFetchJson<any>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address,
        signature,
        nonce: nonceData.nonce,
        issuedAt,
        statement: AUTH_STATEMENT,
      }),
    });
    if (!loginData.token) {
      throw new Error(loginData.error || 'Failed to login');
    }

    writeStoredJwt(address, loginData.token);
    return loginData.token as string;
  }, [address, chainId, isConnected, signTypedDataAsync]);

  return { ensureToken };
}
