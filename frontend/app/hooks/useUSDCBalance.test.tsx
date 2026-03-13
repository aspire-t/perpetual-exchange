import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUSDCBalance } from './useUSDCBalance';

jest.mock('wagmi', () => ({
  useReadContract: jest.fn(),
}));

import { useReadContract } from 'wagmi';

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

describe('useUSDCBalance Hook', () => {
  const mockAddress: `0x${string}` = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockBalance = BigInt(1000000000);

  beforeEach(() => {
    jest.clearAllMocks();
    (useReadContract as jest.Mock).mockReturnValue({
      data: mockBalance,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return balance data when address is provided', () => {
    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(mockBalance);
  });

  it('should return correct contract configuration', () => {
    renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(useReadContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'balanceOf',
      args: [mockAddress],
      query: {
        enabled: true,
        refetchInterval: 5000,
      },
    });
  });

  it('should return undefined when address is undefined', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUSDCBalance(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('should disable query when address is undefined', () => {
    renderHook(() => useUSDCBalance(undefined), {
      wrapper: createWrapper(),
    });

    expect(useReadContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'balanceOf',
      args: undefined,
      query: {
        enabled: false,
        refetchInterval: 5000,
      },
    });
  });

  it('should return loading state', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      isSuccess: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should return success state', () => {
    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should return error state', () => {
    const mockError = new Error('Failed to fetch balance');
    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: mockError,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  it('should return refetch function', () => {
    const mockRefetch = jest.fn();
    (useReadContract as jest.Mock).mockReturnValue({
      data: mockBalance,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle zero balance', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: BigInt(0),
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(BigInt(0));
  });

  it('should handle large balance values', () => {
    const largeBalance = BigInt('1000000000000000000000000'); // 1M USDC
    (useReadContract as jest.Mock).mockReturnValue({
      data: largeBalance,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(largeBalance);
  });

  it('should use balanceOf function with correct args', () => {
    renderHook(() => useUSDCBalance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'balanceOf',
        args: [mockAddress],
      })
    );
  });
});
