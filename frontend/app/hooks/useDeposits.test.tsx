import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeposits } from './useDeposits';

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

describe('useDeposits', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch deposits data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useDeposits('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
  });

  it('should fetch deposits with default page and limit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useDeposits('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/deposit/user/0x1234567890123456789012345678901234567890?page=1&limit=10'
    );
  });

  it('should fetch deposits with custom page and limit', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { result } = renderHook(
      () => useDeposits('0x1234567890123456789012345678901234567890', { page: 2, limit: 20 }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/deposit/user/0x1234567890123456789012345678901234567890?page=2&limit=20'
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

    const { result } = renderHook(() => useDeposits('0x1234567890123456789012345678901234567890'), {
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

    const { result } = renderHook(() => useDeposits('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.goToNextPage).toBeDefined();
    expect(result.current.goToPrevPage).toBeDefined();
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPrevPage).toBe(false);
  });
});
