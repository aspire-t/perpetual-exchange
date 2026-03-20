export const LOGIN_TYPES = {
  Login: [
    { name: 'address', type: 'address' },
    { name: 'nonce', type: 'string' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'statement', type: 'string' },
  ],
} as const;

export function buildLoginTypedData(params: {
  address: `0x${string}`;
  nonce: string;
  issuedAt: number;
  statement: string;
  chainId: number;
  domainName: string;
  domainVersion: string;
}) {
  return {
    domain: {
      name: params.domainName,
      version: params.domainVersion,
      chainId: params.chainId,
    },
    types: LOGIN_TYPES,
    primaryType: 'Login' as const,
    message: {
      address: params.address,
      nonce: params.nonce,
      issuedAt: params.issuedAt,
      statement: params.statement,
    },
  };
}

export function getTokenStorageKey(address: string) {
  return `pe.jwt.${address.toLowerCase()}`;
}

export function readStoredJwt(address: string) {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(getTokenStorageKey(address));
}

export function writeStoredJwt(address: string, token: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(getTokenStorageKey(address), token);
}
