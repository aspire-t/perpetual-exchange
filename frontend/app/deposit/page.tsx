'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Navigation } from '../components/Navigation';

export default function DepositPage() {
  const { isConnected, address } = useAccount();
  const [copied, setCopied] = useState(false);

  // Vault address for deposits
  const VAULT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(VAULT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">
              Connect your wallet to deposit
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">
          Deposit USDC
        </h1>

        {/* Vault Address Card */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Vault Address
          </h2>

          <div className="mb-6">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Send USDC to the following address:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2.5 bg-[var(--background-tertiary)] border border-[var(--border-default)] rounded text-sm font-mono text-[var(--text-primary)] break-all">
                {VAULT_ADDRESS}
              </code>
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-[var(--accent-blue)] text-white font-semibold rounded hover:bg-[var(--accent-blue-hover)] transition-colors text-sm whitespace-nowrap"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-[var(--warning-yellow-muted)] border border-[var(--warning-yellow)] rounded-lg p-4">
            <p className="text-[var(--warning-yellow)] text-sm">
              <strong>Important:</strong> Only send USDC tokens to this address. Sending any other
              assets may result in permanent loss.
            </p>
          </div>
        </div>

        {/* How to Deposit */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            How to Deposit
          </h3>
          <ol className="space-y-3">
            {[
              'Copy the vault address above',
              'Go to your wallet or exchange and initiate a USDC transfer',
              'Paste the vault address as the recipient',
              'Enter the amount of USDC you want to deposit',
              'Confirm the transaction and wait for it to be processed',
            ].map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-[var(--accent-blue)] text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-[var(--text-secondary)]">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
