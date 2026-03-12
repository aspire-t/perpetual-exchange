'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono text-[var(--text-secondary)]">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1 text-sm bg-[var(--danger-red)] text-white rounded hover:bg-[var(--danger-red-bg)]"
        >
          Disconnect
        </button>
      </div>
    );
  }

  const connector = connectors[0];

  const handleConnect = async () => {
    if (!connector) return;
    try {
      await connect({ connector });
    } catch (err: any) {
      // Error is already captured by the error state
      console.error('Wallet connection error:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleConnect}
        disabled={!connector || isPending}
        className="px-4 py-2 text-sm bg-[var(--accent-blue)] text-white rounded hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && (
        <span className="text-sm text-[var(--danger-red)]">
          {error.name === 'UserRejectedRequestError' || error.message?.includes('User rejected')
            ? 'Connection cancelled. Please try again and approve the wallet connection.'
            : error.message?.includes('Provider not found')
            ? 'No wallet detected. Please install MetaMask or another crypto wallet extension.'
            : error.message}
        </span>
      )}
      {!error && !connector && (
        <span className="text-sm text-[var(--text-muted)]">
          No wallet connector available
        </span>
      )}
    </div>
  );
}
