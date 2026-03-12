import { useQuery } from '@tanstack/react-query';

interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'confirmed';
  txHash?: string;
  createdAt: string;
}

interface UseWithdrawalsResult {
  data: Withdrawal[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWithdrawals(userAddress: string): UseWithdrawalsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['withdrawals', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];
      const response = await fetch(`/api/withdraw/user/${userAddress}`);
      if (!response.ok) throw new Error('Failed to fetch withdrawals');
      const result = await response.json();
      return result.success ? result.data : [];
    },
    enabled: !!userAddress,
    initialData: [],
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
