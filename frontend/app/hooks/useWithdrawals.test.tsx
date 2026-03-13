import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWithdrawals } from './useWithdrawals';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('useWithdrawals', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch withdrawals data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useWithdrawals('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
  });

  it('should fetch withdrawals with default page and limit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useWithdrawals('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/withdraw/user/0x1234567890123456789012345678901234567890?page=1&limit=10'
    );
  });

  it('should fetch withdrawals with custom page and limit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(
      () => useWithdrawals('0x1234567890123456789012345678901234567890', { page: 2, limit: 20 }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/withdraw/user/0x1234567890123456789012345678901234567890?page=2&limit=20'
    );
  });

  it('should return totalPages from response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        totalPages: 5,
        currentPage: 1,
      }),
    });

    const { result } = renderHook(() => useWithdrawals('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalPages).toBe(5);
    expect(result.current.currentPage).toBe(1);
  });

  it('should provide goToNextPage and goToPrevPage functions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], totalPages: 3 }),
    });

    const { result } = renderHook(() => useWithdrawals('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.goToNextPage).toBeDefined();
    expect(result.current.goToPrevPage).toBeDefined();
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);
  });
});
