'use client';

import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Navigation } from '../components/Navigation';

interface Position {
  id: string;
  size: string;
  entryPrice: string;
  isLong: boolean;
  createdAt: string;
}

export default function PositionsPage() {
  const { isConnected, address } = useAccount();

  // Fetch user positions
  const { data: positionsData, isLoading, refetch } = useQuery({
    queryKey: ['positions', address],
    queryFn: async () => {
      if (!address) return { success: true, data: [] };
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${BACKEND_URL}/position/user/${address}`);
      const data = await response.json();
      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Failed to fetch positions');
      }
      return data;
    },
    enabled: !!address,
  });

  // Close position mutation
  const closePosition = useMutation({
    mutationFn: async (positionId: string) => {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${BACKEND_URL}/position/${positionId}/close`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Failed to close position');
      }
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">
              Connect your wallet to view positions
            </p>
          </div>
        </main>
      </div>
    );
  }

  const positions: Position[] = positionsData?.success ? positionsData.data : [];

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">
          Your Positions
        </h1>

        {isLoading ? (
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">Loading...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">No open positions</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {positions.map((position) => (
              <div
                key={position.id}
                className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${position.isLong
                        ? 'bg-[var(--success-green-muted)] text-[var(--success-green)] border border-[var(--success-green)]'
                        : 'bg-[var(--danger-red-muted)] text-[var(--danger-red)] border border-[var(--danger-red)]'
                      }`}
                  >
                    {position.isLong ? 'Long' : 'Short'}
                  </span>
                  <button
                    onClick={() => closePosition.mutateAsync(position.id)}
                    disabled={closePosition.isPending}
                    className="text-[var(--danger-red)] hover:text-[var(--danger-red-bg)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Size</p>
                    <p className="text-base font-mono font-semibold text-[var(--text-primary)]">
                      ${(Number(BigInt(position.size)) / 1e18).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Entry Price</p>
                    <p className="text-base font-mono font-semibold text-[var(--text-primary)]">
                      ${(Number(BigInt(position.entryPrice)) / 1e18).toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-1">PnL</p>
                    <p className="text-base font-mono font-semibold text-[var(--text-primary)]">
                      $0.00
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
