import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWithdraw } from './useWithdraw';

jest.mock('wagmi', () => ({
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}));

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

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

describe('useWithdraw Hook', () => {
  const mockWriteContract = jest.fn();
  const mockHash = '0xabc123def456';

  beforeEach(() => {
    jest.clearAllMocks();
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: mockHash,
      isPending: false,
      isError: false,
      error: null,
    });
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
      isPending: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return withdraw function', () => {
    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    expect(result.current.withdraw).toBeDefined();
    expect(typeof result.current.withdraw).toBe('function');
  });

  it('should return hash from useWriteContract', () => {
    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hash).toBe(mockHash);
  });

  it('should call writeContract with correct withdraw parameters', () => {
    const withdrawAmount = BigInt(1000000000);

    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    result.current.withdraw(withdrawAmount);

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'withdraw',
      args: [withdrawAmount],
    });
  });

  it('should handle large withdraw amounts', () => {
    const withdrawAmount = BigInt('1000000000000000000000'); // 1000 USDC

    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    result.current.withdraw(withdrawAmount);

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'withdraw',
      args: [withdrawAmount],
    });
  });

  it('should return isConfirming status', () => {
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: true,
      isSuccess: false,
      isPending: false,
    });

    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConfirming).toBe(true);
  });

  it('should return isConfirmed status', () => {
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: true,
      isPending: false,
    });

    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isConfirmed).toBe(true);
  });

  it('should spread rest props from useWriteContract', () => {
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: mockHash,
      isPending: true,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('should call withdraw multiple times with different amounts', () => {
    const { result } = renderHook(() => useWithdraw(), {
      wrapper: createWrapper(),
    });

    result.current.withdraw(BigInt(1000000000));
    result.current.withdraw(BigInt(2000000000));
    result.current.withdraw(BigInt(5000000000));

    expect(mockWriteContract).toHaveBeenCalledTimes(3);
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ args: [BigInt(1000000000)] })
    );
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ args: [BigInt(2000000000)] })
    );
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ args: [BigInt(5000000000)] })
    );
  });
});
