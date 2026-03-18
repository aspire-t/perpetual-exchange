import { formatPrice, formatVolume, CandleData, VolumeData, fetchKlines, useKlineData } from './useKlineData';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Create wrapper for hook tests
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useKlineData', () => {
  describe('formatPrice', () => {
    it('should convert BigInt string to display number', () => {
      const result = formatPrice('2060916219');
      expect(result).toBe(2.060916219);
    });

    it('should handle zero price', () => {
      const result = formatPrice('0');
      expect(result).toBe(0);
    });

    it('should handle large prices', () => {
      const result = formatPrice('999999999999');
      expect(result).toBe(999.999999999);
    });

    it('should handle small prices', () => {
      const result = formatPrice('1234567');
      expect(result).toBe(0.001234567);
    });
  });

  describe('formatVolume', () => {
    it('should convert BigInt string to display number', () => {
      const result = formatVolume('3768690971937003865');
      expect(result).toBe(3768690971.937004);
    });

    it('should handle zero volume', () => {
      const result = formatVolume('0');
      expect(result).toBe(0);
    });

    it('should handle large volumes', () => {
      const result = formatVolume('1000000000000000000');
      expect(result).toBe(1000000000);
    });
  });

  describe('fetchKlines', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should fetch klines data successfully', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: 'BTCUSD',
            timeframe: '15m',
            timestamp: '2024-01-01T00:00:00Z',
            open: '2060916219',
            high: '2100000000',
            low: '2000000000',
            close: '2050000000',
            volume: '1000000000',
          },
          {
            symbol: 'BTCUSD',
            timeframe: '15m',
            timestamp: '2024-01-01T00:15:00Z',
            open: '2050000000',
            high: '2080000000',
            low: '2040000000',
            close: '2070000000',
            volume: '1200000000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Import fetchKlines dynamically to access the internal function
      const { fetchKlines } = await import('./useKlineData');
      const result = await fetchKlines('BTCUSD', '15m', 2);

      expect(mockFetch).toHaveBeenCalledWith('/api/klines?symbol=BTCUSD&timeframe=15m&count=2');
      expect(result.candles).toHaveLength(2);
      expect(result.candles[0]).toEqual({
        time: 1704067200,
        open: 2.060916219,
        high: 2.1,
        low: 2.0,
        close: 2.05,
      });
      expect(result.candles[1]).toEqual({
        time: 1704068100,
        open: 2.05,
        high: 2.08,
        low: 2.04,
        close: 2.07,
      });
      expect(result.volumes).toHaveLength(2);
      expect(result.volumes[0]).toEqual({
        time: 1704067200,
        value: 1,
        color: 'rgba(244, 67, 54, 0.5)', // red because close < open
      });
      expect(result.volumes[1]).toEqual({
        time: 1704068100,
        value: 1.2,
        color: 'rgba(76, 175, 80, 0.5)', // green because close >= open
      });
    });

    it('should throw error on HTTP error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { fetchKlines } = await import('./useKlineData');

      await expect(fetchKlines('BTCUSD', '15m')).rejects.toThrow(
        'Failed to fetch klines: Internal Server Error',
      );
    });

    it('should throw error on API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid symbol',
          }),
      });

      const { fetchKlines } = await import('./useKlineData');

      await expect(fetchKlines('INVALID', '15m')).rejects.toThrow('Invalid symbol');
    });

    it('should throw default error on API error response without error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      });

      const { fetchKlines } = await import('./useKlineData');

      await expect(fetchKlines('BTCUSD', '15m')).rejects.toThrow('Failed to fetch klines');
    });

    it('should handle up candles with green volume color', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: 'BTCUSD',
            timeframe: '1h',
            timestamp: '2024-01-01T00:00:00Z',
            open: '2000000000',
            high: '2100000000',
            low: '1990000000',
            close: '2080000000',
            volume: '500000000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { fetchKlines } = await import('./useKlineData');
      const result = await fetchKlines('BTCUSD', '1h');

      expect(result.volumes[0].color).toBe('rgba(76, 175, 80, 0.5)');
    });

    it('should handle down candles with red volume color', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: 'BTCUSD',
            timeframe: '1h',
            timestamp: '2024-01-01T00:00:00Z',
            open: '2100000000',
            high: '2150000000',
            low: '2050000000',
            close: '2060000000',
            volume: '500000000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { fetchKlines } = await import('./useKlineData');
      const result = await fetchKlines('BTCUSD', '1h');

      expect(result.volumes[0].color).toBe('rgba(244, 67, 54, 0.5)');
    });

    it('should handle equal open and close with green volume color', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: 'BTCUSD',
            timeframe: '1d',
            timestamp: '2024-01-01T00:00:00Z',
            open: '2000000000',
            high: '2100000000',
            low: '1990000000',
            close: '2000000000',
            volume: '500000000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { fetchKlines } = await import('./useKlineData');
      const result = await fetchKlines('BTCUSD', '1d');

      expect(result.volumes[0].color).toBe('rgba(76, 175, 80, 0.5)');
    });

    it('should use default count of 100', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { fetchKlines } = await import('./useKlineData');
      await fetchKlines('BTCUSD', '15m');

      expect(mockFetch).toHaveBeenCalledWith('/api/klines?symbol=BTCUSD&timeframe=15m&count=100');
    });
  });

  describe('useKlineData hook', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('should return loading state initially', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useKlineData('BTCUSD', '15m'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.candles).toEqual([]);
      expect(result.current.volumes).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return data after successful fetch', async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            symbol: 'BTCUSD',
            timeframe: '15m',
            timestamp: '2024-01-01T00:00:00Z',
            open: '2000000000',
            high: '2100000000',
            low: '1990000000',
            close: '2050000000',
            volume: '1000000000',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useKlineData('BTCUSD', '15m'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.candles).toHaveLength(1);
      expect(result.current.candles[0]).toEqual({
        time: 1704067200,
        open: 2.0,
        high: 2.1,
        low: 1.99,
        close: 2.05,
      });
      expect(result.current.volumes).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it('should return error state on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Network Error',
      });

      const { result } = renderHook(() => useKlineData('BTCUSD', '15m'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.candles).toEqual([]);
      expect(result.current.volumes).toEqual([]);
    });

    it('should provide refetch function', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useKlineData('BTCUSD', '15m'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should use custom count parameter', async () => {
      const mockResponse = {
        success: true,
        data: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      renderHook(() => useKlineData('BTCUSD', '15m', 50), {
        wrapper: createWrapper(),
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/klines?symbol=BTCUSD&timeframe=15m&count=50');
    });
  });
});
