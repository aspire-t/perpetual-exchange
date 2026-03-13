import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'confirmed';
  txHash?: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: Withdrawal[];
  totalPages: number;
  currentPage: number;
}

interface UseWithdrawalsResult {
  data: Withdrawal[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToNextPage: () => void;
  goToPrevPage: () => void;
}

interface UseWithdrawalsOptions {
  page?: number;
  limit?: number;
}

export function useWithdrawals(userAddress: string, options: UseWithdrawalsOptions = {}): UseWithdrawalsResult {
  const { page: initialPage = 1, limit = 10 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse>({
    queryKey: ['withdrawals', userAddress, currentPage, limit],
    queryFn: async () => {
      if (!userAddress) return { data: [], totalPages: 0, currentPage: 0 };
      const response = await fetch(`/api/withdraw/user/${userAddress}?page=${currentPage}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch withdrawals');
      const result = await response.json();
      if (!result.success) return { data: [], totalPages: 0, currentPage: 0 };

      return {
        data: result.data || [],
        totalPages: result.totalPages || 1,
        currentPage: result.currentPage || currentPage,
      };
    },
    enabled: !!userAddress,
  });

  const totalPages = data?.totalPages || 1;

  return {
    data: data?.data,
    isLoading,
    error: error as Error | null,
    refetch,
    totalPages,
    currentPage: data?.currentPage || currentPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToNextPage: () => setCurrentPage((prev) => Math.min(prev + 1, totalPages)),
    goToPrevPage: () => setCurrentPage((prev) => Math.max(prev - 1, 1)),
  };
}
