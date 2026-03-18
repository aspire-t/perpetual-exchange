import { useQuery } from '@tanstack/react-query';

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeData {
  time: number;
  value: number;
  color: string;
}

export interface KlineResponse {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface UseKlineDataReturn {
  candles: CandleData[];
  volumes: VolumeData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const formatPrice = (price: string): number => {
  return Number(price) / 1e9;
};

export const formatVolume = (volume: string): number => {
  return Number(volume) / 1e9;
};

export const fetchKlines = async (
  symbol: string,
  timeframe: string,
  count: number = 100,
): Promise<{ candles: CandleData[]; volumes: VolumeData[] }> => {
  const params = new URLSearchParams({
    symbol,
    timeframe,
    count: count.toString(),
  });

  const response = await fetch(`/api/klines?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch klines: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch klines');
  }

  const candles: CandleData[] = [];
  const volumes: VolumeData[] = [];

  for (const kline of result.data) {
    const time = Math.floor(new Date(kline.timestamp).getTime() / 1000);
    const open = formatPrice(kline.open);
    const high = formatPrice(kline.high);
    const low = formatPrice(kline.low);
    const close = formatPrice(kline.close);
    const volume = formatVolume(kline.volume);

    candles.push({ time, open, high, low, close });

    const isUp = close >= open;
    volumes.push({
      time,
      value: volume,
      color: isUp ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
    });
  }

  return { candles, volumes };
};

export const useKlineData = (
  symbol: string,
  timeframe: string,
  count: number = 100,
): UseKlineDataReturn => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['klines', symbol, timeframe, count],
    queryFn: () => fetchKlines(symbol, timeframe, count),
    refetchInterval: 5000,
    staleTime: 3000,
  });

  return {
    candles: data?.candles ?? [],
    volumes: data?.volumes ?? [],
    isLoading,
    error,
    refetch,
  };
};
