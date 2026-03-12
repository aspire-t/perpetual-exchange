import { useQuery } from '@tanstack/react-query';

interface Order {
  id: string;
  userId: string;
  type: 'market' | 'limit';
  side: 'long' | 'short';
  size: string;
  limitPrice?: string;
  fillPrice?: string;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';
  txHash?: string;
  createdAt: string;
}

interface UseOrdersResult {
  data: Order[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useOrders(userAddress: string): UseOrdersResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', userAddress],
    queryFn: async () => {
      if (!userAddress) return [];
      const response = await fetch(`/api/order/user/${userAddress}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
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
