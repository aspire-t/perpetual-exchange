'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';

interface OrderData {
  side: 'Long' | 'Short';
  size: string;
}

export default function TradePage() {
  const { isConnected, address } = useAccount();
  const [size, setSize] = useState('');
  const [orderResult, setOrderResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch current price
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ['price'],
    queryFn: async () => {
      const response = await fetch('http://localhost:3001/price');
      if (!response.ok) throw new Error('Failed to fetch price');
      return response.json();
    },
    refetchInterval: 5000,
  });

  // Submit order mutation
  const submitOrder = useMutation({
    mutationFn: async (orderData: OrderData) => {
      if (!address) throw new Error('Wallet not connected');

      const response = await fetch('http://localhost:3001/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          type: 'market',
          side: orderData.side === 'Long' ? 'long' : 'short',
          size: (BigInt(Math.floor(Number(orderData.size) * 1e18))).toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Order failed');
      }

      return response.json();
    },
    onSuccess: () => {
      setOrderResult({ type: 'success', message: 'Order submitted successfully!' });
      setSize('');
      setTimeout(() => setOrderResult(null), 3000);
    },
    onError: (error: Error) => {
      setOrderResult({ type: 'error', message: `Order failed: ${error.message}` });
      setTimeout(() => setOrderResult(null), 3000);
    },
  });

  const handleOrder = (side: 'Long' | 'Short') => {
    if (!size || Number(size) <= 0) {
      setOrderResult({ type: 'error', message: 'Please enter a valid size' });
      return;
    }
    submitOrder.mutateAsync({ side, size });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">
              Connect your wallet to start trading
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">
          Trade Perpetual Futures
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Form - Left Column */}
          <div className="lg:col-span-1 space-y-4">
            {/* Price Display */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <p className="text-sm text-[var(--text-secondary)] mb-1">ETH Price</p>
              {priceLoading ? (
                <p className="text-xl font-mono text-[var(--text-primary)]">Loading...</p>
              ) : priceData?.success && priceData?.data?.price ? (
                <p className="text-xl font-mono font-semibold text-[var(--text-primary)]">
                  ${Number(priceData.data.price).toFixed(2)}
                </p>
              ) : (
                <p className="text-xl font-mono text-[var(--text-primary)]">--</p>
              )}
            </div>

            {/* Order Form */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <div className="mb-4">
                <label htmlFor="size" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Position Size (USDC)
                </label>
                <input
                  id="size"
                  type="number"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded bg-[var(--background-tertiary)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent placeholder-[var(--text-muted)]"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Result Message */}
              {orderResult && (
                <div
                  className={`mb-4 p-3 rounded text-sm ${
                    orderResult.type === 'success'
                      ? 'bg-[var(--success-green-muted)] text-[var(--success-green)] border border-[var(--success-green)]'
                      : 'bg-[var(--danger-red-muted)] text-[var(--danger-red)] border border-[var(--danger-red)]'
                  }`}
                >
                  {orderResult.message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOrder('Long')}
                  disabled={submitOrder.isPending}
                  className="py-3 px-4 bg-[var(--success-green)] text-white font-semibold rounded hover:bg-[var(--success-green-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitOrder.isPending ? 'Submitting...' : 'Long'}
                </button>
                <button
                  onClick={() => handleOrder('Short')}
                  disabled={submitOrder.isPending}
                  className="py-3 px-4 bg-[var(--danger-red)] text-white font-semibold rounded hover:bg-[var(--danger-red-bg)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitOrder.isPending ? 'Submitting...' : 'Short'}
                </button>
              </div>
            </div>
          </div>

          {/* Market Info - Right Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Market Stats */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Market Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">24h Volume</p>
                  <p className="text-sm font-mono text-[var(--text-primary)]">--</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">24h Change</p>
                  <p className="text-sm font-mono text-[var(--success-green)]">--</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">24h High</p>
                  <p className="text-sm font-mono text-[var(--text-primary)]">--</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">24h Low</p>
                  <p className="text-sm font-mono text-[var(--text-primary)]">--</p>
                </div>
              </div>
            </div>

            {/* Recent Trades Placeholder */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Recent Trades</h2>
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                No recent trades
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                About Perpetual Futures
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Trade perpetual futures with no expiry. Your positions are automatically hedged on Hyperliquid
                for risk management. Deposit USDC as collateral and trade with up to 10x leverage.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
