import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetchJson } from '../lib/api';

interface Order {
  id: string;
  userId: string;
  type: 'market' | 'limit';
  side: 'long' | 'short';
  size: string;
  limitPrice?: string;
  fillPrice?: string;
  leverage?: string;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';
  txHash?: string;
  createdAt: string;
}

interface PaginatedResponse {
  data: Order[];
  totalPages: number;
  currentPage: number;
}

interface UseOrdersResult {
  data: Order[] | undefined;
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

interface UseOrdersOptions {
  page?: number;
  limit?: number;
}

export function useOrders(userAddress: string, options: UseOrdersOptions = {}): UseOrdersResult {
  const { page: initialPage = 1, limit = 10 } = options;
  const [currentPage, setCurrentPage] = useState(initialPage);

  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse>({
    queryKey: ['orders', userAddress, currentPage, limit],
    queryFn: async () => {
      if (!userAddress) return { data: [], totalPages: 0, currentPage: 0 };
      const result = await apiFetchJson<any>(
        `/order/user/${userAddress}?page=${currentPage}&limit=${limit}`,
      );

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
