'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Navigation } from '../components/Navigation';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useVaultAllowance } from '../hooks/useVaultAllowance';
import { useApprove } from '../hooks/useApprove';
import { useDeposit } from '../hooks/useDeposit';
import toast from 'react-hot-toast';

export default function DepositPage() {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState('');

  // Read contract state
  const { data: balance } = useUSDCBalance(address);
  const { data: allowance } = useVaultAllowance(address);

  // Write contract state
  const { approve, hash: approveHash, isConfirming: isApproving, isConfirmed: isApproveConfirmed, error: approveError, reset: resetApprove } = useApprove();
  const { deposit, hash: depositHash, isConfirming: isDepositing, isConfirmed: isDepositConfirmed, error: depositError, reset: resetDeposit } = useDeposit();

  // Show toast on success
  useEffect(() => {
    if (isApproveConfirmed) {
      toast.success('Approval confirmed!');
      resetApprove?.();
    }
  }, [isApproveConfirmed, resetApprove]);

  useEffect(() => {
    if (isDepositConfirmed) {
      toast.success('Deposit successful!');
      resetDeposit?.();
      setAmount('');
    }
  }, [isDepositConfirmed, resetDeposit]);

  // Show toast on error
  useEffect(() => {
    if (approveError) {
      toast.error(`Approval failed: ${approveError.message}`);
    }
  }, [approveError]);

  useEffect(() => {
    if (depositError) {
      toast.error(`Deposit failed: ${depositError.message}`);
    }
  }, [depositError]);

  const handleMaxClick = () => {
    if (balance) {
      setAmount((Number(balance) / 1000000).toString());
    }
  };

  const handleApprove = async () => {
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1000000)); // 6 decimals
    await approve(amountWei);
  };

  const handleDeposit = async () => {
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1000000)); // 6 decimals
    await deposit(amountWei);
  };

  const amountWei = amount && parseFloat(amount) > 0 ? BigInt(Math.floor(parseFloat(amount) * 1000000)) : BigInt(0);
  const isApproved = allowance && amountWei && allowance >= amountWei;
  const isApproveDisabled = !amount || parseFloat(amount) <= 0 || (allowance && allowance >= amountWei);
  const isDepositDisabled = !amount || parseFloat(amount) <= 0 || !isApproved;

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

        {/* Balance Card */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Available Balance</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {balance ? `${(Number(balance) / 1000000).toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Vault Allowance</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {allowance ? `${(Number(allowance) / 1000000).toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
          </div>
        </div>

        {/* Deposit Form */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Deposit Amount
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-4 py-3 bg-[var(--background-tertiary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-lg"
              min="0"
              step="0.01"
            />
            <button
              onClick={handleMaxClick}
              className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded hover:bg-[var(--accent-blue-hover)] transition-colors"
            >
              Max
            </button>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">Enter amount in USDC</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Approve Button */}
          <button
            onClick={handleApprove}
            disabled={isApproveDisabled || isApproving || isApproveConfirmed}
            className={`w-full py-4 rounded-lg font-semibold transition-colors ${
              isApproveDisabled
                ? 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
                : isApproving
                  ? 'bg-[var(--accent-blue)]/50 text-white cursor-wait'
                  : isApproveConfirmed
                    ? 'bg-green-600 text-white'
                    : 'bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)]'
            }`}
          >
            {isApproving ? 'Approving...' : isApproveConfirmed ? '✓ Approved' : `Approve ${amount || '0'} USDC`}
          </button>

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={isDepositDisabled || isDepositing || isDepositConfirmed}
            className={`w-full py-4 rounded-lg font-semibold transition-colors ${
              isDepositDisabled
                ? 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
                : isDepositing
                  ? 'bg-[var(--accent-green)]/50 text-white cursor-wait'
                  : isDepositConfirmed
                    ? 'bg-green-600 text-white'
                    : 'bg-[var(--accent-green)] text-white hover:bg-[var(--accent-green-hover)]'
            }`}
          >
            {isDepositing ? 'Depositing...' : isDepositConfirmed ? '✓ Deposited' : `Deposit ${amount || '0'} USDC`}
          </button>
        </div>
      </main>
    </div>
  );
}
