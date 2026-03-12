'use client';

import { useState } from 'react';

type TabType = 'deposits' | 'withdrawals' | 'orders';

export default function TransactionsPage() {
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
          {activeTab === 'deposits' && <DepositsTab />}
          {activeTab === 'withdrawals' && <WithdrawalsTab />}
          {activeTab === 'orders' && <OrdersTab />}
        </div>
      </main>
    </div>
  );
}

function DepositsTab() {
  return <div className="text-[var(--text-secondary)]">Deposits content</div>;
}

function WithdrawalsTab() {
  return <div className="text-[var(--text-secondary)]">Withdrawals content</div>;
}

function OrdersTab() {
  return <div className="text-[var(--text-secondary)]">Orders content</div>;
}
