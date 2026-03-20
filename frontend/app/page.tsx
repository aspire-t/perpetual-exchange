 'use client';

import Link from 'next/link';
import { Navigation } from './components/Navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from './lib/api';
import { formatAmountFromUnits } from './lib/units';

function formatUsdFromWei(value?: string) {
  if (!value) return '--';
  return `$${Number(formatAmountFromUnits(value, 18)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function Home() {
  const { data: statsData } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () =>
      apiFetchJson<{
        success: boolean;
        data: {
          totalValueLocked: string;
          openInterest: string;
          volume24h: string;
          trades24h: number;
        };
      }>('/stats'),
    refetchInterval: 30000,
  });
  const stats = statsData?.data;

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center py-20">
          <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-6">
            Perpetual Futures Exchange
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
            Trade perpetual futures with on-chain collateral. Built on Hyperliquid with
            automatic hedging and real-time PnL tracking.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/trade"
              className="px-6 py-3 text-lg font-medium bg-[var(--accent-blue)] text-white rounded hover:bg-[var(--accent-blue-hover)] transition-colors"
            >
              Start Trading
            </Link>
            <Link
              href="/deposit"
              className="px-6 py-3 text-lg font-medium border border-[var(--border-default)] text-[var(--text-primary)] rounded hover:bg-[var(--background-tertiary)] transition-colors"
            >
              Deposit USDC
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              On-Chain Vault
            </h3>
            <p className="text-[var(--text-secondary)]">
              Deposit USDC to a secure vault. Your collateral is always verifiable on-chain.
            </p>
          </div>
          <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Perpetual Futures
            </h3>
            <p className="text-[var(--text-secondary)]">
              Open long or short positions with up to 10x leverage. No expiry, close anytime.
            </p>
          </div>
          <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Auto-Hedging
            </h3>
            <p className="text-[var(--text-secondary)]">
              Positions are automatically hedged on Hyperliquid for risk management.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-8">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 text-center">
            Platform Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)] mb-1">Total Value Locked</p>
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {formatUsdFromWei(stats?.totalValueLocked)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)] mb-1">24h Volume</p>
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {formatUsdFromWei(stats?.volume24h)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)] mb-1">Open Interest</p>
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {formatUsdFromWei(stats?.openInterest)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-[var(--text-muted)] mb-1">Total Trades</p>
              <p className="text-2xl font-mono font-bold text-[var(--text-primary)]">
                {stats ? stats.trades24h.toLocaleString() : '--'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
