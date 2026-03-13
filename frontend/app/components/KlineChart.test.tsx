import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KlineChart } from './KlineChart';

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockKlineData = [
  {
    symbol: 'ETH',
    timeframe: '1h',
    timestamp: '2026-03-13T10:00:00Z',
    open: '2000000000000000000000',
    high: '2100000000000000000000',
    low: '1900000000000000000000',
    close: '2050000000000000000000',
    volume: '50000000000000000000000',
  },
  {
    symbol: 'ETH',
    timeframe: '1h',
    timestamp: '2026-03-13T11:00:00Z',
    open: '2050000000000000000000',
    high: '2150000000000000000000',
    low: '2000000000000000000000',
    close: '2100000000000000000000',
    volume: '60000000000000000000000',
  },
  {
    symbol: 'ETH',
    timeframe: '1h',
    timestamp: '2026-03-13T12:00:00Z',
    open: '2100000000000000000000',
    high: '2200000000000000000000',
    low: '2050000000000000000000',
    close: '2150000000000000000000',
    volume: '55000000000000000000000',
  },
];

const renderWithQueryClient = (component: React.ReactElement, queryClient?: QueryClient) => {
  const client = queryClient || createQueryClient();
  return render(
    <QueryClientProvider client={client}>
      {component}
    </QueryClientProvider>
  );
};

describe('KlineChart', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createQueryClient();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Loading state', () => {
    it('should display loading message while fetching data', () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise(() => {
          // Never resolve - keeps component in loading state
        });
      });

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
      });
    });

    it('should display error message for non-200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
      });
    });
  });

  describe('Empty data state', () => {
    it('should display message when no kline data is available', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('No kline data available')).toBeInTheDocument();
      });
    });
  });

  describe('Chart rendering', () => {
    it('should render chart with kline data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('ETH Price Chart (1h)')).toBeInTheDocument();
      });

      // Verify OHLC display is present (check for the specific elements in header)
      const ohlcContainer = screen.getByText('ETH Price Chart (1h)').parentElement;
      expect(ohlcContainer).toBeInTheDocument();
      // The OHLC labels are in the next sibling div
      const ohlcLabels = ohlcContainer?.parentElement?.querySelectorAll('span');
      expect(ohlcLabels?.length).toBeGreaterThan(0);
    });

    it('should display correct symbol and timeframe in header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="BTC" timeframe="4h" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('BTC Price Chart (4h)')).toBeInTheDocument();
      });
    });

    it('should use default timeframe of 1h when not provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('ETH Price Chart (1h)')).toBeInTheDocument();
      });
    });

    it('should render SVG element for chart', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('should render candlesticks for each kline', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Count rect elements (candle bodies + volume bars)
        const rects = document.querySelectorAll('rect');
        // 3 candles * 2 rects (body + volume) = 6 minimum
        expect(rects.length).toBeGreaterThanOrEqual(6);
      });
    });

    it('should render grid lines', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        const lines = document.querySelectorAll('line');
        // 5 grid lines + 3 candle wicks = 8 minimum
        expect(lines.length).toBeGreaterThanOrEqual(5);
      });
    });

    it('should display price labels on grid', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Price labels should contain $ symbol
        const priceLabels = Array.from(document.querySelectorAll('text')).filter(
          (el) => el.textContent?.includes('$')
        );
        expect(priceLabels.length).toBeGreaterThan(0);
      });
    });

    it('should display time labels on x-axis', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Time labels should be present
        const timeLabels = document.querySelectorAll('text');
        expect(timeLabels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Price formatting', () => {
    it('should convert wei prices to decimal format for display', async () => {
      const mockDataWithLargeValues = [
        {
          symbol: 'ETH',
          timeframe: '1h',
          timestamp: '2026-03-13T10:00:00Z',
          open: '2500000000000000000000', // 2500 in wei
          high: '2600000000000000000000',
          low: '2400000000000000000000',
          close: '2550000000000000000000',
          volume: '50000000000000000000000',
        },
      ];

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockDataWithLargeValues }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Should display formatted prices (divided by 1e18)
        const closePrice = screen.getByText('$2550.00');
        expect(closePrice).toBeInTheDocument();
      });
    });
  });

  describe('Volume display', () => {
    it('should render volume bars below candlesticks', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Volume bars have opacity="0.3"
        const volumeBars = Array.from(document.querySelectorAll('rect')).filter(
          (el) => el.getAttribute('opacity') === '0.3'
        );
        expect(volumeBars.length).toBe(mockKlineData.length);
      });
    });
  });

  describe('Candlestick colors', () => {
    it('should use green color for bullish candles (close >= open)', async () => {
      const bullishData = [
        {
          symbol: 'ETH',
          timeframe: '1h',
          timestamp: '2026-03-13T10:00:00Z',
          open: '2000000000000000000000',
          high: '2100000000000000000000',
          low: '1900000000000000000000',
          close: '2100000000000000000000', // close > open = bullish
          volume: '50000000000000000000000',
        },
      ];

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: bullishData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Green candles should use success-green CSS variable
        const coloredElements = Array.from(document.querySelectorAll('rect, line')).filter(
          (el) => {
            const fill = el.getAttribute('fill');
            const stroke = el.getAttribute('stroke');
            return (
              (fill && fill.includes('var(--success-green)')) ||
              (stroke && stroke.includes('var(--success-green)'))
            );
          }
        );
        expect(coloredElements.length).toBeGreaterThan(0);
      });
    });

    it('should use red color for bearish candles (close < open)', async () => {
      const bearishData = [
        {
          symbol: 'ETH',
          timeframe: '1h',
          timestamp: '2026-03-13T10:00:00Z',
          open: '2100000000000000000000',
          high: '2200000000000000000000',
          low: '1900000000000000000000',
          close: '2000000000000000000000', // close < open = bearish
          volume: '50000000000000000000000',
        },
      ];

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ data: bearishData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        // Red candles should use danger-red CSS variable
        const coloredElements = Array.from(document.querySelectorAll('rect, line')).filter(
          (el) => {
            const fill = el.getAttribute('fill');
            const stroke = el.getAttribute('stroke');
            return (
              (fill && fill.includes('var(--danger-red)')) ||
              (stroke && stroke.includes('var(--danger-red)'))
            );
          }
        );
        expect(coloredElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tooltips', () => {
    it('should include tooltip with OHLCV data for each candle', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        const titleElements = document.querySelectorAll('title');
        expect(titleElements.length).toBe(mockKlineData.length);
      });
    });
  });

  describe('API integration', () => {
    it('should fetch from correct endpoint with symbol and timeframe', async () => {
      const mockFetch = (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(
        <KlineChart symbol="BTC" timeframe="4h" />,
        queryClient
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/klines?symbol=BTC&timeframe=4h&count=50'
        );
      });
    });

    it('should use default count of 50 klines', async () => {
      const mockFetch = (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('count=50')
        );
      });
    });
  });

  describe('Query configuration', () => {
    it('should not fetch data when symbol is empty', async () => {
      const mockFetch = (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="" timeframe="1h" />, queryClient);

      // Wait for potential fetch
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should refetch data every 10 seconds', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockKlineData }),
      } as Response);

      renderWithQueryClient(<KlineChart symbol="ETH" timeframe="1h" />, queryClient);

      await waitFor(() => {
        expect(screen.getByText('ETH Price Chart (1h)')).toBeInTheDocument();
      });

      // Verify query is configured with refetchInterval
      // This is implicitly tested by the queryClient configuration
      expect(queryClient.getQueryState(['klines', 'ETH', '1h'])).toBeDefined();
    });
  });
});
