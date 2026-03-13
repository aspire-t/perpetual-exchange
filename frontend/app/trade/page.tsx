'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';
import { SymbolSelector } from '../components/SymbolSelector';
import toast from 'react-hot-toast';
import { useDeposits } from '../hooks/useDeposits';
import { useWithdrawals } from '../hooks/useWithdrawals';
import { useOrders } from '../hooks/useOrders';

const AVAILABLE_SYMBOLS = ['ETH', 'BTC', 'SOL'];

interface OrderData {
  side: 'Long' | 'Short';
  size: string;
  symbol: string;
}

type HistoryTabType = 'orders' | 'deposits' | 'withdrawals';

export default function TradePage() {
  const { isConnected, address } = useAccount();
  const [size, setSize] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('ETH');
  const [historyTab, setHistoryTab] = useState<HistoryTabType>('orders');

  // Fetch orders for refetch after placing order
  const { refetch: refetchOrders } = useOrders(address || '');

  // Fetch current price for selected symbol
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ['price', selectedSymbol],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/price?symbol=${selectedSymbol}`);
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
          symbol: orderData.symbol,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Order failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Order submitted successfully!');
      setSize('');
      refetchOrders();
    },
    onError: (error: Error) => {
      toast.error(`Order failed: ${error.message}`);
    },
  });

  const handleOrder = (side: 'Long' | 'Short') => {
    if (!size || Number(size) <= 0) {
      toast.error('Please enter a valid size');
      return;
    }
    submitOrder.mutateAsync({ side, size, symbol: selectedSymbol });
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
        {/* Trade Section */}
        <TradeSection {...{ priceData, priceLoading, size, setSize, submitOrder, handleOrder, selectedSymbol, setSelectedSymbol }} />

        {/* Divider */}
        <hr className="border-t border-[var(--border-default)] my-8" />

        {/* History Section */}
        <HistorySection {...{ historyTab, setHistoryTab, address }} />
      </main>
    </div>
  );
}

interface TradeSectionProps {
  priceData: any;
  priceLoading: boolean;
  size: string;
  setSize: (size: string) => void;
  submitOrder: any;
  handleOrder: (side: 'Long' | 'Short') => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
}

function TradeSection({ priceData, priceLoading, size, setSize, submitOrder, handleOrder, selectedSymbol, setSelectedSymbol }: TradeSectionProps) {
  return (
    <section>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">
        Trade Perpetual Futures
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form - Left Column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Symbol Selector */}
          <SymbolSelector
            symbols={AVAILABLE_SYMBOLS}
            selectedSymbol={selectedSymbol}
            onSymbolChange={setSelectedSymbol}
          />

          {/* Price Display */}
          <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">{selectedSymbol} Price</p>
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
          {/* Market Stats - Only show if data exists */}
          {priceData?.success && priceData?.data?.stats && (
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Market Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {priceData.data.stats.volume24h && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">24h Volume</p>
                    <p className="text-sm font-mono text-[var(--text-primary)]">
                      ${Number(priceData.data.stats.volume24h).toLocaleString()}
                    </p>
                  </div>
                )}
                {priceData.data.stats.change24h && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">24h Change</p>
                    <p className={`text-sm font-mono ${Number(priceData.data.stats.change24h) >= 0 ? 'text-[var(--success-green)]' : 'text-[var(--danger-red)]'}`}>
                      {Number(priceData.data.stats.change24h) >= 0 ? '+' : ''}{Number(priceData.data.stats.change24h).toFixed(2)}%
                    </p>
                  </div>
                )}
                {priceData.data.stats.high24h && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">24h High</p>
                    <p className="text-sm font-mono text-[var(--text-primary)]">
                      ${Number(priceData.data.stats.high24h).toLocaleString()}
                    </p>
                  </div>
                )}
                {priceData.data.stats.low24h && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">24h Low</p>
                    <p className="text-sm font-mono text-[var(--text-primary)]">
                      ${Number(priceData.data.stats.low24h).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Trades - Only show if trades exist */}
          {priceData?.success && priceData?.data?.recentTrades && priceData.data.recentTrades.length > 0 && (
            <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Recent Trades</h2>
              <div className="space-y-2">
                {priceData.data.recentTrades.map((trade: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className={trade.side === 'buy' ? 'text-[var(--success-green)]' : 'text-[var(--danger-red)]'}>
                      {trade.side.toUpperCase()}
                    </span>
                    <span className="text-[var(--text-primary)] font-mono">
                      ${Number(trade.price).toLocaleString()}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
    </section>
  );
}

interface HistorySectionProps {
  historyTab: HistoryTabType;
  setHistoryTab: (tab: HistoryTabType) => void;
  address: string | undefined;
}

function HistorySection({ historyTab, setHistoryTab, address }: HistorySectionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Transaction History</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border-default)]">
        <button
          onClick={() => setHistoryTab('orders')}
          className={`px-4 py-2 font-medium transition-colors ${
            historyTab === 'orders'
              ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setHistoryTab('deposits')}
          className={`px-4 py-2 font-medium transition-colors ${
            historyTab === 'deposits'
              ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Deposits
        </button>
        <button
          onClick={() => setHistoryTab('withdrawals')}
          className={`px-4 py-2 font-medium transition-colors ${
            historyTab === 'withdrawals'
              ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Withdrawals
        </button>
      </div>

      {/* Tab Content */}
      {historyTab === 'orders' && <OrdersTab userAddress={address || ''} />}
      {historyTab === 'deposits' && <DepositsTab userAddress={address || ''} />}
      {historyTab === 'withdrawals' && <WithdrawalsTab userAddress={address || ''} />}
    </section>
  );
}

interface Deposit {
  id: string;
  userId: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  createdAt: string;
}

function DepositsTab({ userAddress }: { userAddress: string }) {
  const {
    data: deposits,
    isLoading,
    error,
    totalPages,
    currentPage,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
  } = useDeposits(userAddress);

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error.message}</div>;
  }

  if (!deposits || deposits.length === 0) {
    return <div className="text-[var(--text-secondary)]">No deposits yet</div>;
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-[var(--text-secondary)]">
            <th className="pb-3">Time</th>
            <th className="pb-3">Amount</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {deposits.map((deposit) => (
            <tr key={deposit.id} className="border-t border-[var(--border-default)]">
              <td className="py-3 text-[var(--text-primary)]">
                {new Date(deposit.createdAt).toLocaleString()}
              </td>
              <td className="py-3 text-[var(--text-primary)]">
                {(Number(deposit.amount) / 1000000).toFixed(2)} USDC
              </td>
              <td className="py-3">
                <StatusBadge status={deposit.status} />
              </td>
              <td className="py-3">
                {deposit.txHash ? (
                  <a
                    href={`https://sepolia.bscscan.com/tx/${deposit.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-blue)] hover:underline"
                  >
                    {deposit.txHash.slice(0, 10)}...{deposit.txHash.slice(-8)}
                  </a>
                ) : (
                  <span className="text-[var(--text-secondary)]">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onNext={goToNextPage}
        onPrev={goToPrevPage}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/20 text-yellow-400',
    confirmed: 'bg-green-900/20 text-green-400',
    failed: 'bg-red-900/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${statusColors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

function WithdrawalsTab({ userAddress }: { userAddress: string }) {
  const {
    data: withdrawals,
    isLoading,
    error,
    totalPages,
    currentPage,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
  } = useWithdrawals(userAddress);

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error.message}</div>;
  }

  if (!withdrawals || withdrawals.length === 0) {
    return <div className="text-[var(--text-secondary)]">No withdrawals yet</div>;
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-[var(--text-secondary)]">
            <th className="pb-3">Time</th>
            <th className="pb-3">Amount</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((withdrawal) => (
            <tr key={withdrawal.id} className="border-t border-[var(--border-default)]">
              <td className="py-3 text-[var(--text-primary)]">
                {new Date(withdrawal.createdAt).toLocaleString()}
              </td>
              <td className="py-3 text-[var(--text-primary)]">
                {(Number(withdrawal.amount) / 1000000).toFixed(2)} USDC
              </td>
              <td className="py-3">
                <WithdrawalStatusBadge status={withdrawal.status} />
              </td>
              <td className="py-3">
                {withdrawal.txHash ? (
                  <a
                    href={`https://sepolia.bscscan.com/tx/${withdrawal.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-blue)] hover:underline"
                  >
                    {withdrawal.txHash.slice(0, 10)}...{withdrawal.txHash.slice(-8)}
                  </a>
                ) : (
                  <span className="text-[var(--text-secondary)]">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onNext={goToNextPage}
        onPrev={goToPrevPage}
      />
    </>
  );
}

function WithdrawalStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/20 text-yellow-400',
    approved: 'bg-blue-900/20 text-blue-400',
    processing: 'bg-purple-900/20 text-purple-400',
    confirmed: 'bg-green-900/20 text-green-400',
    rejected: 'bg-red-900/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${statusColors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

function OrdersTab({ userAddress }: { userAddress: string }) {
  const {
    data: orders,
    isLoading,
    error,
    totalPages,
    currentPage,
    hasNextPage,
    hasPrevPage,
    goToNextPage,
    goToPrevPage,
  } = useOrders(userAddress);

  if (isLoading) {
    return <div className="text-[var(--text-secondary)]">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-400">Error: {error.message}</div>;
  }

  if (!orders || orders.length === 0) {
    return <div className="text-[var(--text-secondary)]">No orders yet</div>;
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="text-left text-sm text-[var(--text-secondary)]">
            <th className="pb-3">Time</th>
            <th className="pb-3">Side</th>
            <th className="pb-3">Type</th>
            <th className="pb-3">Size</th>
            <th className="pb-3">Price</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-[var(--border-default)]">
              <td className="py-3 text-[var(--text-primary)]">
                {new Date(order.createdAt).toLocaleString()}
              </td>
              <td className="py-3">
                <span className={order.side === 'long' ? 'text-green-400' : 'text-red-400'}>
                  {order.side.toUpperCase()}
                </span>
              </td>
              <td className="py-3 text-[var(--text-primary)]">
                {order.type.toUpperCase()}
              </td>
              <td className="py-3 text-[var(--text-primary)]">
                {(Number(order.size) / 1e18).toFixed(2)} USDC
              </td>
              <td className="py-3 text-[var(--text-primary)]">
                {order.fillPrice || order.limitPrice || '-'}
              </td>
              <td className="py-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="py-3">
                {order.txHash ? (
                  <a
                    href={`https://sepolia.bscscan.com/tx/${order.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent-blue)] hover:underline"
                  >
                    {order.txHash.slice(0, 10)}...{order.txHash.slice(-8)}
                  </a>
                ) : (
                  <span className="text-[var(--text-secondary)]">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onNext={goToNextPage}
        onPrev={goToPrevPage}
      />
    </>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-900/20 text-yellow-400',
    open: 'bg-blue-900/20 text-blue-400',
    filled: 'bg-green-900/20 text-green-400',
    cancelled: 'bg-gray-800 text-gray-400',
    rejected: 'bg-red-900/20 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${statusColors[status] || 'bg-gray-800 text-gray-400'}`}>
      {status}
    </span>
  );
}

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNext: () => void;
  onPrev: () => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onNext,
  onPrev,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-default)]">
      <button
        onClick={onPrev}
        disabled={!hasPrevPage}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          hasPrevPage
            ? 'text-[var(--accent-blue)] hover:bg-[var(--background-secondary)]'
            : 'text-[var(--text-secondary)] cursor-not-allowed opacity-50'
        }`}
      >
        Previous
      </button>
      <span className="text-[var(--text-secondary)] text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={!hasNextPage}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          hasNextPage
            ? 'text-[var(--accent-blue)] hover:bg-[var(--background-secondary)]'
            : 'text-[var(--text-secondary)] cursor-not-allowed opacity-50'
        }`}
      >
        Next
      </button>
    </div>
  );
}
