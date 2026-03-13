import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeposit } from './useDeposit';

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

describe('useDeposit Hook', () => {
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

  it('should return deposit function', () => {
    const { result } = renderHook(() => useDeposit(), {
      wrapper: createWrapper(),
    });

    expect(result.current.deposit).toBeDefined();
    expect(typeof result.current.deposit).toBe('function');
  });

  it('should return hash from useWriteContract', () => {
    const { result } = renderHook(() => useDeposit(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hash).toBe(mockHash);
  });

  it('should call writeContract with correct deposit parameters', () => {
    const depositAmount = BigInt(1000000000);

    const { result } = renderHook(() => useDeposit(), {
      wrapper: createWrapper(),
    });

    result.current.deposit(depositAmount);

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'deposit',
      args: [depositAmount],
    });
  });

  it('should handle large deposit amounts', () => {
    const depositAmount = BigInt('1000000000000000000000'); // 1000 USDC

    const { result } = renderHook(() => useDeposit(), {
      wrapper: createWrapper(),
    });

    result.current.deposit(depositAmount);

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'deposit',
      args: [depositAmount],
    });
  });

  it('should return isConfirming status', () => {
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: true,
      isSuccess: false,
      isPending: false,
    });

    const { result } = renderHook(() => useDeposit(), {
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

    const { result } = renderHook(() => useDeposit(), {
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

    const { result } = renderHook(() => useDeposit(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('should call deposit multiple times with different amounts', () => {
    const { result } = renderHook(() => useDeposit(), {
      wrapper: createWrapper(),
    });

    result.current.deposit(BigInt(1000000000));
    result.current.deposit(BigInt(2000000000));
    result.current.deposit(BigInt(5000000000));

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
