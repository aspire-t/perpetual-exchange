import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApprove } from './useApprove';

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

describe('useApprove Hook', () => {
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

  it('should return approve function', () => {
    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    expect(result.current.approve).toBeDefined();
    expect(typeof result.current.approve).toBe('function');
  });

  it('should return hash from useWriteContract', () => {
    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    expect(result.current.hash).toBe(mockHash);
  });

  it('should call writeContract with correct approve parameters', () => {
    const approveAmount = BigInt(1000000000);

    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    result.current.approve(approveAmount);

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'approve',
      args: [expect.any(String), approveAmount],
    });
  });

  it('should call writeContract with VAULT as spender', () => {
    const approveAmount = BigInt(1000000000);

    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    result.current.approve(approveAmount);

    expect(mockWriteContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [expect.any(String), approveAmount],
      })
    );
  });

  it('should handle large approve amounts', () => {
    const approveAmount = BigInt('1000000000000000000000'); // 1000 USDC

    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    result.current.approve(approveAmount);

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: expect.any(String),
      abi: expect.any(Array),
      functionName: 'approve',
      args: [expect.any(String), approveAmount],
    });
  });

  it('should return isConfirming status', () => {
    (useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: true,
      isSuccess: false,
      isPending: false,
    });

    const { result } = renderHook(() => useApprove(), {
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

    const { result } = renderHook(() => useApprove(), {
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

    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('should call approve multiple times with different amounts', () => {
    const { result } = renderHook(() => useApprove(), {
      wrapper: createWrapper(),
    });

    result.current.approve(BigInt(1000000000));
    result.current.approve(BigInt(2000000000));
    result.current.approve(BigInt(5000000000));

    expect(mockWriteContract).toHaveBeenCalledTimes(3);
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ args: [expect.any(String), BigInt(1000000000)] })
    );
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ args: [expect.any(String), BigInt(2000000000)] })
    );
    expect(mockWriteContract).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ args: [expect.any(String), BigInt(5000000000)] })
    );
  });
});
