import { render, screen, waitFor } from '@testing-library/react';
import { KlineChart } from './KlineChart';
import { useKlineData } from '../hooks/useKlineData';
import { createChart } from 'lightweight-charts';

// Mock useKlineData hook
jest.mock('../hooks/useKlineData', () => ({
  useKlineData: jest.fn(),
}));

// Mock lightweight-charts
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(),
  CandlestickSeries: jest.fn(),
  HistogramSeries: jest.fn(),
}));

describe('KlineChart', () => {
  const mockSymbol = 'BTCUSD';
  const mockTimeframe = '15m';
  const mockCreateChart = createChart as jest.MockedFunction<typeof createChart>;
  const mockUseKlineData = useKlineData as jest.MockedFunction<typeof useKlineData>;

  const mockChart = {
    addSeries: jest.fn(),
    series: jest.fn(),
    remove: jest.fn(),
    timeScale: jest.fn().mockReturnThis(),
    fitContent: jest.fn(),
    applyOptions: jest.fn(),
    priceScale: jest.fn().mockReturnThis(),
  };

  const mockCandlestickSeries = {
    setData: jest.fn(),
  };

  const mockVolumeSeries = {
    setData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateChart.mockReturnValue(mockChart as any);
    mockChart.addSeries.mockReturnValueOnce(mockCandlestickSeries).mockReturnValueOnce(mockVolumeSeries);
    mockChart.series.mockReturnValue({
      values: () => ({
        next: () => ({ value: mockCandlestickSeries }),
        item: () => mockVolumeSeries,
      }),
    });

    mockUseKlineData.mockReturnValue({
      candles: [],
      volumes: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('should render chart container with correct styling', () => {
    const { container } = render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    const chartContainer = container.querySelector('div');
    expect(chartContainer).toHaveClass('w-full');
  });

  it('should display loading state when isLoading is true', () => {
    mockUseKlineData.mockReturnValue({
      candles: [],
      volumes: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  it('should display error state when error exists', () => {
    const mockError = new Error('Failed to fetch data');
    mockUseKlineData.mockReturnValue({
      candles: [],
      volumes: [],
      isLoading: false,
      error: mockError,
      refetch: jest.fn(),
    });

    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(screen.getByText('Error loading chart: Failed to fetch data')).toBeInTheDocument();
  });

  it('should initialize chart on mount', () => {
    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(createChart).toHaveBeenCalledTimes(1);
  });

  it('should initialize chart with correct configuration', () => {
    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(createChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        width: expect.any(Number),
        height: 400,
        layout: expect.objectContaining({
          background: { color: '#1f2937' },
          textColor: '#9ca3af',
        }),
        grid: expect.objectContaining({
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        }),
      }),
    );
  });

  it('should add candlestick series with correct configuration', () => {
    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(mockChart.addSeries).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        upColor: '#4ade80',
        downColor: '#f87171',
        borderVisible: false,
        wickUpColor: '#4ade80',
        wickDownColor: '#f87171',
      }),
    );
  });

  it('should add volume histogram series with correct configuration', () => {
    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(mockChart.addSeries).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        color: '#4b5563',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      }),
    );
  });

  it('should configure price scale margins', () => {
    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    expect(mockChart.priceScale).toHaveBeenCalledWith('');
    expect(mockChart.priceScale('').applyOptions).toHaveBeenCalledWith({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
  });

  it('should set candlestick data when candles are available', async () => {
    const mockCandles = [
      { time: 1000, open: 1.5, high: 1.6, low: 1.4, close: 1.55 },
      { time: 1060, open: 1.55, high: 1.65, low: 1.5, close: 1.6 },
    ];
    const mockVolumes = [
      { time: 1000, value: 1000, color: 'rgba(76, 175, 80, 0.5)' },
      { time: 1060, value: 1200, color: 'rgba(76, 175, 80, 0.5)' },
    ];

    mockUseKlineData.mockReturnValue({
      candles: mockCandles,
      volumes: mockVolumes,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    await waitFor(() => {
      expect(mockCandlestickSeries.setData).toHaveBeenCalledWith(mockCandles);
    });
  });

  it('should set volume data when volumes are available', async () => {
    const mockVolumes = [
      { time: 1000, value: 1000, color: 'rgba(76, 175, 80, 0.5)' },
      { time: 1060, value: 1200, color: 'rgba(244, 67, 54, 0.5)' },
    ];

    mockUseKlineData.mockReturnValue({
      candles: [{ time: 1000, open: 1.5, high: 1.6, low: 1.4, close: 1.55 }],
      volumes: mockVolumes,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    await waitFor(() => {
      expect(mockVolumeSeries.setData).toHaveBeenCalledWith(mockVolumes);
    });
  });

  it('should fit content when data is set', async () => {
    mockUseKlineData.mockReturnValue({
      candles: [{ time: 1000, open: 1.5, high: 1.6, low: 1.4, close: 1.55 }],
      volumes: [{ time: 1000, value: 1000, color: 'rgba(76, 175, 80, 0.5)' }],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    await waitFor(() => {
      expect(mockChart.timeScale().fitContent).toHaveBeenCalled();
    });
  });

  it('should cleanup chart on unmount', () => {
    const { unmount } = render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    unmount();

    expect(mockChart.remove).toHaveBeenCalledTimes(1);
  });

  it('should handle resize events', () => {
    render(<KlineChart symbol={mockSymbol} timeframe={mockTimeframe} />);

    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    expect(mockChart.applyOptions).toHaveBeenCalled();
  });
});
