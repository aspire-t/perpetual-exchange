# Transaction History Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified transaction history page with three tabs (Deposits, Withdrawals, Orders) displaying user's transaction records.

**Architecture:** Frontend-only feature that consumes existing backend APIs. Each tab fetches data independently from its respective API endpoint.

**Tech Stack:** Next.js 16, React, TanStack Query, TypeScript, TailwindCSS, Playwright for E2E tests.

---

## Task 1: Verify Backend API Endpoints

**Files:**
- Check: `/Users/trent/Workspace/perpetual-exchange/backend/src/deposit/deposit.controller.ts`
- Check: `/Users/trent/Workspace/perpetual-exchange/backend/src/withdrawal/withdrawal.controller.ts`
- Check: `/Users/trent/Workspace/perpetual-exchange/backend/src/order/order.controller.ts`

**Step 1: Read existing deposit controller**

Read the deposit controller to verify the API endpoint exists.

**Step 2: Read existing withdrawal controller**

Read the withdrawal controller to verify the API endpoint exists.

**Step 3: Read existing order controller**

Read the order controller to verify the API endpoint exists.

**Step 4: Verify all three endpoints return paginated data**

Expected endpoints:
- `GET /deposits` - Returns `{ success: true, data: [...] }`
- `GET /withdrawals` - Returns `{ success: true, data: [...] }`
- `GET /orders/history` - Returns `{ success: true, data: [...] }`

**Step 5: Create backend test if endpoints don't exist**

If any endpoint is missing, create it following the existing pattern.

---

## Task 2: Create Transaction History Page Component

**Files:**
- Create: `frontend/app/transactions/page.tsx`
- Test: `frontend/app/transactions/page.test.tsx`

**Step 1: Write the failing test**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import TransactionsPage from './page';

describe('TransactionsPage', () => {
  it('should render page title', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('should render three tabs', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Deposits')).toBeInTheDocument();
    expect(screen.getByText('Withdrawals')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- frontend/app/transactions/page.test.tsx`
Expected: FAIL with "Unable to find element"

**Step 3: Write minimal implementation**

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- frontend/app/transactions/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/transactions/page.tsx frontend/app/transactions/page.test.tsx
git commit -m "feat: create transaction history page with tab navigation
"
```

---

## Task 3: Create Deposits API Hook

**Files:**
- Create: `frontend/app/hooks/useDeposits.ts`
- Test: `frontend/app/hooks/useDeposits.test.ts`

**Step 1: Write the failing test**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { useDeposits } from './useDeposits';

describe('useDeposits', () => {
  it('should fetch deposits data', async () => {
    const { result } = renderHook(() => useDeposits());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- frontend/app/hooks/useDeposits.test.ts`
Expected: FAIL with "useDeposits is not defined"

**Step 3: Write minimal implementation**

```typescript
import { useQuery } from '@tanstack/react-query';

interface Deposit {
  id: string;
  userId: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  createdAt: string;
}

interface UseDepositsResult {
  data: Deposit[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDeposits(page = 0, limit = 20): UseDepositsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['deposits', page, limit],
    queryFn: async () => {
      const response = await fetch(`/api/deposits?limit=${limit}&offset=${page * limit}`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch deposits');
      }
      return result.data as Deposit[];
    },
    initialData: [],
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- frontend/app/hooks/useDeposits.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/hooks/useDeposits.ts frontend/app/hooks/useDeposits.test.ts
git commit -m "feat: create useDeposits hook for fetching deposit records
"
```

---

## Task 4: Implement Deposits Tab with Data Fetching

**Files:**
- Modify: `frontend/app/transactions/page.tsx`
- Test: `frontend/app/transactions/page.test.tsx`

**Step 1: Write the failing test**

Add test for deposits table rendering with mock data.

**Step 2: Update useDeposits hook to handle loading states properly**

```typescript
// Update the hook to return proper loading/error states
```

**Step 3: Implement DepositsTab component with real data**

```typescript
function DepositsTab() {
  const { data: deposits, isLoading, error } = useDeposits();

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
                  href={`https://blockscout.com/tx/${deposit.txHash}`}
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
```

**Step 4: Run test to verify it passes**

Run: `npm test -- frontend/app/transactions/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/app/transactions/page.tsx
git commit -m "feat: implement deposits tab with data fetching
"
```

---

## Task 5: Create Withdrawals API Hook

**Files:**
- Create: `frontend/app/hooks/useWithdrawals.ts`
- Test: `frontend/app/hooks/useWithdrawals.test.ts`

**Step 1-5: Same pattern as Task 3**

Create hook following the same pattern as useDeposits.

---

## Task 6: Implement Withdrawals Tab

**Files:**
- Modify: `frontend/app/transactions/page.tsx`

**Step 1-5: Same pattern as Task 4**

Implement WithdrawalsTab component with status badge colors:
- `pending`: Yellow
- `approved`: Blue
- `processing`: Purple
- `confirmed`: Green
- `rejected`: Red

---

## Task 7: Create Orders API Hook

**Files:**
- Create: `frontend/app/hooks/useOrders.ts`
- Test: `frontend/app/hooks/useOrders.test.ts`

**Step 1-5: Same pattern as Task 3**

Create hook for fetching order history.

---

## Task 8: Implement Orders Tab

**Files:**
- Modify: `frontend/app/transactions/page.tsx`

**Step 1: Implement OrdersTab component**

```typescript
function OrdersTab() {
  const { data: orders, isLoading, error } = useOrders();

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
            <td className="py-3 text-[var(--text-primary)]">{order.size}</td>
            <td className="py-3 text-[var(--text-primary)]">{order.fillPrice || order.limitPrice}</td>
            <td className="py-3">
              <OrderStatusBadge status={order.status} />
            </td>
            <td className="py-3">
              {order.txHash ? (
                <a
                  href={`https://blockscout.com/tx/${order.txHash}`}
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
```

**Step 2: Run tests**

Run: `npm test -- frontend/app/transactions/page.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add frontend/app/transactions/page.tsx
git commit -m "feat: implement orders tab with data fetching
"
```

---

## Task 9: Add Pagination Support

**Files:**
- Modify: `frontend/app/transactions/page.tsx`
- Modify: `frontend/app/hooks/useDeposits.ts`
- Modify: `frontend/app/hooks/useWithdrawals.ts`
- Modify: `frontend/app/hooks/useOrders.ts`

**Step 1: Add pagination state to page component**

```typescript
const [currentPage, setCurrentPage] = useState(0);
const PAGE_SIZE = 20;
```

**Step 2: Update hooks to accept page parameter**

**Step 3: Add pagination controls**

```typescript
<div className="flex justify-between items-center mt-6">
  <button
    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
    disabled={currentPage === 0}
    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Previous
  </button>
  <span className="text-[var(--text-secondary)]">Page {currentPage + 1}</span>
  <button
    onClick={() => setCurrentPage(p => p + 1)}
    disabled={!hasMoreData}
    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Next
  </button>
</div>
```

**Step 4: Commit**

```bash
git add frontend/app/transactions/page.tsx frontend/app/hooks/*.ts
git commit -m "feat: add pagination to transaction history
"
```

---

## Task 10: Add E2E Tests

**Files:**
- Create: `frontend/e2e/transactions.spec.ts`

**Step 1: Write E2E tests**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Transaction History Page', () => {
  test('should display page title', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText('Transaction History')).toBeVisible();
  });

  test('should display three tabs', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText('Deposits')).toBeVisible();
    await expect(page.getByText('Withdrawals')).toBeVisible();
    await expect(page.getByText('Orders')).toBeVisible();
  });

  test('should switch tabs', async ({ page }) => {
    await page.goto('/transactions');

    // Click Withdrawals tab
    await page.getByText('Withdrawals').click();
    await expect(page.getByText('Withdrawals content')).toBeVisible();

    // Click Orders tab
    await page.getByText('Orders').click();
    await expect(page.getByText('Orders content')).toBeVisible();
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e -- transactions.spec.ts`
Expected: PASS (3 tests)

**Step 3: Commit**

```bash
git add frontend/e2e/transactions.spec.ts
git commit -m "test: add E2E tests for transaction history page
"
```

---

## Task 11: Add Navigation Link

**Files:**
- Modify: `frontend/app/components/Navigation.tsx`

**Step 1: Add Transactions link to navigation**

```typescript
<Link href="/transactions" className="...">
  History
</Link>
```

**Step 2: Verify navigation works**

**Step 3: Commit**

```bash
git add frontend/app/components/Navigation.tsx
git commit -m "feat: add transaction history link to navigation
"
```

---

## Task 12: Final Verification

**Files:**
- All files in `frontend/app/transactions/`
- All files in `frontend/app/hooks/`

**Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 2: Run E2E tests**

Run: `npm run test:e2e`
Expected: All E2E tests pass

**Step 3: Build frontend**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Verify manually in browser**

- Navigate to /transactions
- Verify all three tabs display correctly
- Verify tab switching works
- Verify loading states
- Verify empty states
