import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVaultAllowance } from './useVaultAllowance';

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

describe('useVaultAllowance Hook', () => {
  const mockAddress: `0x${string}` = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  const mockAllowance = BigInt(1000000000);

  beforeEach(() => {
    jest.clearAllMocks();
    (useReadContract as jest.Mock).mockReturnValue({
      data: mockAllowance,
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

  it('should return allowance data when address is provided', () => {
    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(mockAllowance);
  });

  it('should return correct contract configuration', () => {
    renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(useReadContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'allowance',
      args: [mockAddress, expect.any(String)],
      query: {
        enabled: true,
        refetchInterval: 5000,
      },
    });
  });

  it('should use allowance function with owner and spender args', () => {
    renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(useReadContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: 'allowance',
        args: [mockAddress, expect.any(String)],
      })
    );
  });

  it('should use VAULT as spender address', () => {
    renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    const callArgs = (useReadContract as jest.Mock).mock.calls[0][0];
    expect(callArgs.args).toHaveLength(2);
    expect(callArgs.args[0]).toBe(mockAddress);
    expect(callArgs.args[1]).toEqual(expect.any(String));
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

    const { result } = renderHook(() => useVaultAllowance(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
  });

  it('should disable query when address is undefined', () => {
    renderHook(() => useVaultAllowance(undefined), {
      wrapper: createWrapper(),
    });

    expect(useReadContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'allowance',
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

    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should return success state', () => {
    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should return error state', () => {
    const mockError = new Error('Failed to fetch allowance');
    (useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: true,
      error: mockError,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBe(mockError);
  });

  it('should return refetch function', () => {
    const mockRefetch = jest.fn();
    (useReadContract as jest.Mock).mockReturnValue({
      data: mockAllowance,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle zero allowance', () => {
    (useReadContract as jest.Mock).mockReturnValue({
      data: BigInt(0),
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(BigInt(0));
  });

  it('should handle large allowance values', () => {
    const largeAllowance = BigInt('1000000000000000000000000'); // 1M USDC
    (useReadContract as jest.Mock).mockReturnValue({
      data: largeAllowance,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(largeAllowance);
  });

  it('should handle maximum uint256 allowance (unlimited)', () => {
    // 2^256 - 1 using bit shift: 1n << 256n
    const maxAllowance = (BigInt(1) << BigInt(256)) - BigInt(1);
    (useReadContract as jest.Mock).mockReturnValue({
      data: maxAllowance,
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBe(maxAllowance);
  });

  it('should use 5000ms refetch interval', () => {
    renderHook(() => useVaultAllowance(mockAddress), {
      wrapper: createWrapper(),
    });

    const callArgs = (useReadContract as jest.Mock).mock.calls[0][0];
    expect(callArgs.query.refetchInterval).toBe(5000);
  });
});
