'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';
import { SymbolSelector } from '../components/SymbolSelector';
import toast from 'react-hot-toast';
import { useDeposits } from '../hooks/useDeposits';
import { useWithdrawals } from '../hooks/useWithdrawals';
import { useOrders } from '../hooks/useOrders';
import { KlineChart } from './components/KlineChart';
import { TimeframeSelector } from './components/TimeframeSelector';

const AVAILABLE_SYMBOLS = ['ETH', 'BTC', 'SOL'];

interface OrderData {
  side: 'Long' | 'Short';
  size: string;
  symbol: string;
  leverage: number;
}

type HistoryTabType = 'orders' | 'deposits' | 'withdrawals';

export default function TradePage() {
  const { isConnected, address } = useAccount();
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(1);
  const [selectedSymbol, setSelectedSymbol] = useState('ETH');
  const [timeframe, setTimeframe] = useState('15m');
  const [historyTab, setHistoryTab] = useState<HistoryTabType>('orders');
  const queryClient = useQueryClient();

  // Fetch current price for selected symbol
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ['price', selectedSymbol],
    queryFn: async () => {
      const response = await fetch(`http://localhost:3001/price/${selectedSymbol}`);
      const data = await response.json();
      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Failed to fetch price');
      }
      return data;
    },
    refetchInterval: 5000,
  });

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ['balance', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`http://localhost:3001/balance/${address}`);
      const data = await response.json();
      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Failed to fetch balance');
      }
      return data;
    },
    enabled: !!address,
    refetchInterval: 5000,
  });

  // Faucet mutation
  const faucetMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      const response = await fetch('/api/faucet/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, amount: '100000000' }), // 100 USDC
      });
      const data = await response.json();
      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Faucet failed');
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Minted 100 Mock USDC');
      queryClient.invalidateQueries({ queryKey: ['balance', address] });
    },
    onError: (error: Error) => {
      toast.error(`Faucet failed: ${error.message}`);
    },
  });

  // Submit order mutation
  const submitOrder = useMutation({
    mutationFn: async (orderData: OrderData) => {
      if (!address) throw new Error('Wallet not connected');

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          type: 'market',
          side: orderData.side === 'Long' ? 'long' : 'short',
          symbol: orderData.symbol,
          size: (BigInt(Math.floor(Number(orderData.size) * 1e18))).toString(),
          leverage: orderData.leverage.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Order failed');
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Order submitted successfully!');
      setSize('');
      // Invalidate orders query to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['orders', address] });
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
    submitOrder.mutateAsync({ side, size, symbol: selectedSymbol, leverage });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)]">
        <Navigation />
        <main className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--background-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Connect Wallet</h1>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Please connect your wallet to access the trading platform and manage your positions.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)] text-[var(--text-primary)] font-sans">
      <Navigation />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header / Stats Bar */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Trade</h1>
            <div className="h-6 w-px bg-[var(--border-default)]"></div>
            <div className="flex items-baseline gap-2">
              <span className="text-[var(--text-secondary)] font-medium">{selectedSymbol}</span>
              <span className={`text-lg font-mono font-bold ${priceData?.success ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {priceLoading ? 'Loading...' : priceData?.success ? `$${Number(priceData.data.price).toFixed(2)}` : '--'}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
          {/* Left - Trading Panel */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <TradeSection {...{ priceData, priceLoading, balanceData, faucetMutation, size, setSize, leverage, setLeverage, submitOrder, handleOrder, selectedSymbol, setSelectedSymbol }} />
          </div>

          {/* Right - Transaction History & Charts */}
          <div className="lg:col-span-1 order-1 lg:order-2 space-y-6">
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-default)] overflow-hidden">
              <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)]">{selectedSymbol}/USD</span>
                  <span className="text-xs text-[var(--text-muted)] bg-[var(--background-tertiary)] px-2 py-1 rounded">Perpetual</span>
                </div>
                <TimeframeSelector value={timeframe} onChange={setTimeframe} />
              </div>
              <div className="p-4">
                <KlineChart symbol={selectedSymbol} timeframe={timeframe} />
              </div>
            </div>

            <HistorySection {...{ historyTab, setHistoryTab, address }} />
          </div>
        </div>
      </main>
    </div>
  );
}

interface PriceData {
  success: boolean;
  data: {
    price: string;
  };
  error?: string;
}

interface TradeSectionProps {
  priceData: PriceData | undefined;
  priceLoading: boolean;
  balanceData: any;
  faucetMutation: UseMutationResult<any, Error, void, unknown>;
  size: string;
  setSize: (size: string) => void;
  leverage: number;
  setLeverage: (leverage: number) => void;
  submitOrder: UseMutationResult<unknown, Error, OrderData, unknown>;
  handleOrder: (side: 'Long' | 'Short') => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
}

function TradeSection({ priceData, priceLoading, balanceData, faucetMutation, size, setSize, leverage, setLeverage, submitOrder, handleOrder, selectedSymbol, setSelectedSymbol }: TradeSectionProps) {
  return (
    <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-xl p-5 shadow-sm sticky top-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Place Order</h2>
          {/* Balance & Faucet */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-[var(--text-secondary)]">Available</div>
              <div className="text-sm font-mono font-medium text-[var(--text-primary)]">
                {balanceData?.success ? (Number(balanceData.data.availableBalance) / 1e6).toFixed(2) : '0.00'} USDC
              </div>
            </div>
            <button
              onClick={() => faucetMutation.mutate()}
              disabled={faucetMutation.isPending}
              className="p-1.5 text-[var(--accent-blue)] hover:bg-[var(--accent-blue-dim)] rounded-md transition-colors"
              title="Mint 100 Mock USDC"
            >
              <svg className={`w-5 h-5 ${faucetMutation.isPending ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </div>
        <SymbolSelector
          symbols={AVAILABLE_SYMBOLS}
          selectedSymbol={selectedSymbol}
          onSymbolChange={setSelectedSymbol}
        />
      </div>

      {/* Leverage Selector */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="leverage-slider" className="text-sm font-medium text-[var(--text-secondary)]">Leverage</label>
          <span className="text-sm font-bold text-[var(--accent-blue)]">{leverage}x</span>
        </div>
        <div className="relative h-6 flex items-center">
          <input
            id="leverage-slider"
            type="range"
            min="1"
            max="10"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full h-1.5 bg-[var(--background-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue-dim)]"
          />
        </div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>1x</span>
          <span>5x</span>
          <span>10x</span>
        </div>
      </div>

      {/* Order Form */}
      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="size" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Size
          </label>
          <div className="relative group">
            <input
              id="size"
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              className="w-full pl-4 pr-16 py-3 bg-[var(--background-tertiary)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] font-mono text-lg focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-colors placeholder-[var(--text-muted)]"
              min="0"
              step="0.01"
            />
            <div className="absolute right-0 top-0 bottom-0 px-4 flex items-center pointer-events-none border-l border-[var(--border-default)] bg-[var(--background-elevated)] rounded-r-lg">
              <span className="text-sm font-bold text-[var(--text-secondary)]">USDC</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-muted)] space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Margin Required</span>
            <span className="font-mono text-[var(--text-primary)]">{size ? (Number(size) / leverage).toFixed(2) : '0.00'} USDC</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">Trading Fee</span>
            <span className="font-mono text-[var(--text-primary)]">0.00 USDC</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleOrder('Long')}
          disabled={submitOrder.isPending}
          className="relative w-full py-3 px-4 bg-[var(--success-green)] hover:bg-[var(--success-green-hover)] text-white rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          {submitOrder.isPending ? 'Processing...' : 'Long'}
        </button>
        <button
          onClick={() => handleOrder('Short')}
          disabled={submitOrder.isPending}
          className="relative w-full py-3 px-4 bg-[var(--danger-red)] hover:bg-[var(--danger-red-hover)] text-white rounded-lg font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          {submitOrder.isPending ? 'Processing...' : 'Short'}
        </button>
      </div>
    </div>
  );
}

interface HistorySectionProps {
  historyTab: HistoryTabType;
  setHistoryTab: (tab: HistoryTabType) => void;
  address: string | undefined;
}

function HistorySection({ historyTab, setHistoryTab, address }: HistorySectionProps) {
  const tabs: { id: HistoryTabType; label: string; }[] = [
    { id: 'orders', label: 'Orders' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'withdrawals', label: 'Withdrawals' },
  ];

  return (
    <section className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-sm min-h-[500px]">
      <div className="border-b border-[var(--border-default)] px-6">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHistoryTab(tab.id)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${historyTab === tab.id
                ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {historyTab === 'orders' && <OrdersTab userAddress={address || ''} />}
        {historyTab === 'deposits' && <DepositsTab userAddress={address || ''} />}
        {historyTab === 'withdrawals' && <WithdrawalsTab userAddress={address || ''} />}
      </div>
    </section>
  );
}

// ... Reusing the rest of the components but with improved table styles ...

interface Deposit {
  id: string;
  userId: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  createdAt: string;
}

function DepositsTab({ userAddress }: { userAddress: string; }) {
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

  if (isLoading) return <LoadingState text="Loading deposits..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!deposits || deposits.length === 0) return <EmptyState message="No deposits yet" />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-muted)]">
              <th className="pb-3 pl-2">Time</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 pr-2 text-right">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-muted)]">
            {deposits.map((deposit) => (
              <tr key={deposit.id} className="group hover:bg-[var(--background-tertiary)] transition-colors">
                <td className="py-3 pl-2 text-sm text-[var(--text-muted)] font-mono">
                  {new Date(deposit.createdAt).toLocaleString()}
                </td>
                <td className="py-3 text-sm text-[var(--text-primary)] font-mono font-medium">
                  {(Number(deposit.amount) / 1000000).toFixed(2)} USDC
                </td>
                <td className="py-3">
                  <StatusBadge status={deposit.status} />
                </td>
                <td className="py-3 pr-2 text-right">
                  {deposit.txHash ? (
                    <a
                      href={`https://sepolia.bscscan.com/tx/${deposit.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline font-mono text-sm"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function StatusBadge({ status }: { status: string; }) {
  const styles: Record<string, string> = {
    pending: 'bg-[var(--warning-yellow-dim)] text-[var(--warning-yellow)]',
    confirmed: 'bg-[var(--success-green-dim)] text-[var(--success-green)]',
    failed: 'bg-[var(--danger-red-dim)] text-[var(--danger-red)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${styles[status] || 'bg-[var(--background-elevated)] text-[var(--text-muted)]'}`}>
      {status}
    </span>
  );
}

function WithdrawalsTab({ userAddress }: { userAddress: string; }) {
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

  if (isLoading) return <LoadingState text="Loading withdrawals..." />;
  if (error) return <ErrorState message={error.message} />;
  if (!withdrawals || withdrawals.length === 0) return <EmptyState message="No withdrawals yet" />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-muted)]">
              <th className="pb-3 pl-2">Time</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 pr-2 text-right">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-muted)]">
            {withdrawals.map((withdrawal) => (
              <tr key={withdrawal.id} className="group hover:bg-[var(--background-tertiary)] transition-colors">
                <td className="py-3 pl-2 text-sm text-[var(--text-muted)] font-mono">
                  {new Date(withdrawal.createdAt).toLocaleString()}
                </td>
                <td className="py-3 text-sm text-[var(--text-primary)] font-mono font-medium">
                  {(Number(withdrawal.amount) / 1000000).toFixed(2)} USDC
                </td>
                <td className="py-3">
                  <WithdrawalStatusBadge status={withdrawal.status} />
                </td>
                <td className="py-3 pr-2 text-right">
                  {withdrawal.txHash ? (
                    <a
                      href={`https://sepolia.bscscan.com/tx/${withdrawal.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline font-mono text-sm"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)] text-sm">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function WithdrawalStatusBadge({ status }: { status: string; }) {
  const styles: Record<string, string> = {
    pending: 'bg-[var(--warning-yellow-dim)] text-[var(--warning-yellow)]',
    approved: 'bg-[var(--accent-blue-dim)] text-[var(--accent-blue)]',
    processing: 'bg-purple-900/20 text-purple-400',
    confirmed: 'bg-[var(--success-green-dim)] text-[var(--success-green)]',
    rejected: 'bg-[var(--danger-red-dim)] text-[var(--danger-red)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${styles[status] || 'bg-[var(--background-elevated)] text-[var(--text-muted)]'}`}>
      {status}
    </span>
  );
}

function OrdersTab({ userAddress }: { userAddress: string; }) {
  const [filter, setFilter] = useState<'open' | 'history'>('open');
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

  if (isLoading) return <LoadingState text="Loading orders..." />;
  if (error) return <ErrorState message={error.message} />;

  const filteredOrders = orders?.filter(order => {
    if (filter === 'open') {
      return ['pending', 'open'].includes(order.status.toLowerCase());
    } else {
      return ['filled', 'cancelled', 'rejected'].includes(order.status.toLowerCase());
    }
  }) || [];

  return (
    <>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('open')}
          className={`px-3 py-1.5 text-xs font-medium rounded border transition-all duration-200 ${filter === 'open'
            ? 'bg-[var(--background-elevated)] border-[var(--border-active)] text-[var(--text-primary)]'
            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]'
            }`}
        >
          Open Orders
        </button>
        <button
          onClick={() => setFilter('history')}
          className={`px-3 py-1.5 text-xs font-medium rounded border transition-all duration-200 ${filter === 'history'
            ? 'bg-[var(--background-elevated)] border-[var(--border-active)] text-[var(--text-primary)]'
            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]'
            }`}
        >
          History
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState message={`No ${filter} orders`} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-muted)]">
                <th className="pb-3 pl-2">Time</th>
                <th className="pb-3">Side</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Size</th>
                <th className="pb-3">Lev</th>
                <th className="pb-3">Price</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-[var(--background-tertiary)] transition-colors">
                  <td className="py-3 pl-2 text-sm text-[var(--text-muted)] font-mono">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`text-xs font-bold uppercase ${order.side === 'long' ? 'text-[var(--success-green)]' : 'text-[var(--danger-red)]'
                      }`}>
                      {order.side}
                    </span>
                  </td>
                  <td className="py-3 text-sm text-[var(--text-secondary)] font-medium">
                    {order.type.toUpperCase()}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-primary)] font-mono">
                    {(Number(order.size) / 1e18).toFixed(2)}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-secondary)] font-mono">
                    {order.leverage ? `${order.leverage}x` : '1x'}
                  </td>
                  <td className="py-3 text-sm text-[var(--text-primary)] font-mono">
                    {order.fillPrice
                      ? `$${(Number(order.fillPrice) / 1e18).toFixed(2)}`
                      : order.limitPrice
                        ? `$${(Number(order.limitPrice) / 1e18).toFixed(2)}`
                        : '-'}
                  </td>
                  <td className="py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="py-3 pr-2 text-right">
                    {order.txHash ? (
                      <a
                        href={`https://sepolia.bscscan.com/tx/${order.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline font-mono text-sm"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-[var(--text-muted)] text-sm">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function OrderStatusBadge({ status }: { status: string; }) {
  const styles: Record<string, string> = {
    pending: 'bg-[var(--warning-yellow-dim)] text-[var(--warning-yellow)]',
    open: 'bg-[var(--accent-blue-dim)] text-[var(--accent-blue)]',
    filled: 'bg-[var(--success-green-dim)] text-[var(--success-green)]',
    cancelled: 'text-[var(--text-muted)]',
    rejected: 'bg-[var(--danger-red-dim)] text-[var(--danger-red)]',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${styles[status] || 'bg-[var(--background-elevated)] text-[var(--text-muted)]'}`}>
      {status}
    </span>
  );
}

// Utility Components for cleaner code

function LoadingState({ text }: { text: string; }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[var(--text-secondary)] text-sm">{text}</div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string; }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-[var(--danger-red)] bg-[var(--danger-red-dim)] px-4 py-3 rounded-lg text-sm border border-[var(--danger-red-bg)]">
        {message}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string; }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
      <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
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
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--border-muted)]">
      <button
        onClick={onPrev}
        disabled={!hasPrevPage}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${hasPrevPage
          ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]'
          : 'text-[var(--text-muted)] cursor-not-allowed opacity-30'
          }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      <div className="text-xs text-[var(--text-muted)] font-mono">
        Page {currentPage} of {totalPages}
      </div>

      <button
        onClick={onNext}
        disabled={!hasNextPage}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${hasNextPage
          ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]'
          : 'text-[var(--text-muted)] cursor-not-allowed opacity-30'
          }`}
      >
        Next
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
