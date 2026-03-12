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

export function useDeposits(userAddress: string): UseDepositsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['deposits', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];
      const response = await fetch(`/api/deposit/user/${userAddress}`);
      if (!response.ok) throw new Error('Failed to fetch deposits');
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
