import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOrders } from './useOrders';

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

describe('useOrders', () => {
  it('should fetch orders data', async () => {
    const { result } = renderHook(() => useOrders('0x1234567890123456789012345678901234567890'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeDefined();
  });
});
