'use client';

import { useState } from 'react';
import { useDeposits } from '../hooks/useDeposits';
import { useWithdrawals } from '../hooks/useWithdrawals';
import { useOrders } from '../hooks/useOrders';
import { useAccount } from 'wagmi';

type TabType = 'deposits' | 'withdrawals' | 'orders';

export default function TransactionsPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('deposits');

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
          Transaction History
        </h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-[var(--border-default)]">
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'deposits'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Deposits
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'withdrawals'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Withdrawals
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'orders'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Orders
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'deposits' && <DepositsTab userAddress={address || ''} />}
          {activeTab === 'withdrawals' && <WithdrawalsTab userAddress={address || ''} />}
          {activeTab === 'orders' && <OrdersTab userAddress={address || ''} />}
        </div>
      </main>
    </div>
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
  const { data: deposits, isLoading, error } = useDeposits(userAddress);

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
  const { data: withdrawals, isLoading, error } = useWithdrawals(userAddress);

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
  const { data: orders, isLoading, error } = useOrders(userAddress);

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
              {(Number(order.size) / 1000000).toFixed(2)} USDC
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
