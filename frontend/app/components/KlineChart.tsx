'use client';

import { useQuery } from '@tanstack/react-query';

interface KlineData {
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface KlineChartProps {
  symbol: string;
  timeframe?: string;
}

export function KlineChart({ symbol, timeframe = '1h' }: KlineChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['klines', symbol, timeframe],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:3001/klines?symbol=${symbol}&timeframe=${timeframe}&count=50`,
      );
      const data = await response.json();
      if (!response.ok || (data.success === false)) {
        throw new Error(data.error || 'Failed to fetch kline data');
      }
      return data;
    },
    refetchInterval: 10000,
    enabled: !!symbol,
  });

  if (isLoading) {
    return (
      <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-8">
        <div className="text-center text-[var(--text-secondary)]">
          Loading chart...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-8">
        <div className="text-center text-[var(--danger-red)]">
          Failed to load chart data
        </div>
      </div>
    );
  }

  const klines = data?.data || [];

  if (!klines || klines.length === 0) {
    return (
      <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-8">
        <div className="text-center text-[var(--text-secondary)]">
          No kline data available
        </div>
      </div>
    );
  }

  // Calculate scale for SVG - prices are in wei (18 decimals)
  const prices = klines.flatMap((k: KlineData) => [
    Number(k.high) / 1e18,
    Number(k.low) / 1e18,
  ]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const volumes = klines.map((k: KlineData) => Number(k.volume));
  const maxVolume = Math.max(...volumes);

  const chartWidth = 800;
  const chartHeight = 300;
  const candleWidth = (chartWidth - 60) / klines.length;
  const candleBodyWidth = Math.max(candleWidth * 0.7, 2);

  const getPriceY = (price: number) => {
    return chartHeight - 20 - ((price - minPrice) / priceRange) * (chartHeight - 40);
  };

  const getVolumeHeight = (volume: number) => {
    return (volume / maxVolume) * 60;
  };

  // Format price for display (convert from wei)
  const formatPrice = (price: string) => {
    return (Number(price) / 1e18).toFixed(2);
  };

  return (
    <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
          {symbol} Price Chart ({timeframe})
        </h2>
        <div className="flex gap-2 text-xs">
          <span className="text-[var(--text-muted)]">
            O: <span className="text-[var(--text-primary)]">${formatPrice(klines[klines.length - 1]?.open || '0')}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            H: <span className="text-[var(--text-primary)]">${formatPrice(klines[klines.length - 1]?.high || '0')}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            L: <span className="text-[var(--text-primary)]">${formatPrice(klines[klines.length - 1]?.low || '0')}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            C: <span className="text-[var(--text-primary)]">${formatPrice(klines[klines.length - 1]?.close || '0')}</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          width="100%"
          height={chartHeight + 40}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
          preserveAspectRatio="none"
          className="min-w-[600px]"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 20 + ratio * (chartHeight - 40);
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={ratio}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="var(--border-default)"
                  strokeWidth="1"
                />
                <text
                  x={chartWidth - 5}
                  y={y - 2}
                  textAnchor="end"
                  className="fill-[var(--text-muted)] text-[10px]"
                >
                  ${price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks and volume bars */}
          {klines.map((kline: KlineData, index: number) => {
            const x = index * candleWidth + candleWidth / 2;
            const open = Number(kline.open);
            const high = Number(kline.high);
            const low = Number(kline.low);
            const close = Number(kline.close);
            const isGreen = close >= open;
            const color = isGreen ? 'var(--success-green)' : 'var(--danger-red)';

            const openY = getPriceY(open);
            const closeY = getPriceY(close);
            const highY = getPriceY(high);
            const lowY = getPriceY(low);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

            const volumeHeight = getVolumeHeight(Number(kline.volume));

            return (
              <g key={index}>
                {/* Volume bar */}
                <rect
                  x={x - candleBodyWidth / 2}
                  y={chartHeight - volumeHeight}
                  width={candleBodyWidth}
                  height={volumeHeight}
                  fill={color}
                  opacity="0.3"
                />

                {/* Wick (high-low line) */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1"
                />

                {/* Body (open-close rectangle) */}
                <rect
                  x={x - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                />

                {/* Tooltip on hover */}
                <title>{`${new Date(kline.timestamp).toLocaleString()}
O: $${formatPrice(kline.open)}
H: $${formatPrice(kline.high)}
L: $${formatPrice(kline.low)}
C: $${formatPrice(kline.close)}
Vol: ${(Number(kline.volume) / 1e18).toFixed(2)}`}</title>
              </g>
            );
          })}

          {/* Time labels */}
          {klines.filter((_: KlineData, i: number) => i % 10 === 0).map((kline: KlineData, i: number) => {
            const originalIndex = i * 10;
            const x = originalIndex * candleWidth + candleWidth / 2;
            return (
              <text
                key={i}
                x={x}
                y={chartHeight + 15}
                textAnchor="middle"
                className="fill-[var(--text-muted)] text-[10px]"
              >
                {new Date(kline.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
