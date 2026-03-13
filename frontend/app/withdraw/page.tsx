'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';
import toast from 'react-hot-toast';

export default function WithdrawPage() {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState('');

  // Fetch user balance
  const { data: balanceData } = useQuery({
    queryKey: ['balance', address],
    queryFn: async () => {
      if (!address) return { success: true, data: { balance: '0' } };
      const response = await fetch(`http://localhost:3001/balance/${address}`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      return response.json();
    },
    enabled: !!address,
  });

  // Withdraw mutation
  const withdraw = useMutation({
    mutationFn: async (withdrawAmount: string) => {
      if (!address) throw new Error('Wallet not connected');
      const response = await fetch('http://localhost:3001/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: BigInt(Math.floor(Number(withdrawAmount) * 1e18)).toString(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Withdrawal failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('Withdrawal submitted successfully!');
      setAmount('');
    },
    onError: (error: Error) => {
      toast.error(`Withdrawal failed: ${error.message}`);
    },
  });

  const handleWithdraw = () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    withdraw.mutateAsync(amount);
  };

  const availableBalance = balanceData?.success
    ? (Number(balanceData.data.balance) / 1e18).toFixed(2)
    : '0.00';

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">
              Connect your wallet to withdraw
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
          Withdraw USDC
        </h1>

        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6 mb-6">
          {/* Balance Display */}
          <div className="mb-6">
            <p className="text-sm text-[var(--text-secondary)] mb-1">Available Balance</p>
            <p className="text-3xl font-mono font-bold text-[var(--text-primary)]">
              ${availableBalance}
            </p>
          </div>

          {/* Withdrawal Amount */}
          <div className="mb-6">
            <label htmlFor="amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Withdrawal Amount (USDC)
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded bg-[var(--background-tertiary)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent placeholder-[var(--text-muted)]"
              min="0"
              step="0.01"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleWithdraw}
            disabled={withdraw.isPending}
            className="w-full py-3 px-4 bg-[var(--accent-blue)] text-white font-semibold rounded hover:bg-[var(--accent-blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {withdraw.isPending ? 'Processing...' : 'Withdraw'}
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            About Withdrawals
          </h3>
          <div className="space-y-3 text-[var(--text-secondary)] text-sm">
            <p>
              Withdrawals are processed to your connected wallet address. Make sure you are using
              the correct wallet.
            </p>
            <p>
              <strong>Note:</strong> Withdrawals may take a few moments to process depending on
              network conditions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
