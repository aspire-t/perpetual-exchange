# K-line Chart Frontend Design

## Overview

Implement k-line (candlestick) chart visualization on the trading page using TradingView's Lightweight Charts library.

## Backend API Verification

**Status**: ✅ Verified

The backend `/klines` endpoint is functional and returns properly formatted data:

```bash
GET /klines?symbol=BTC&timeframe=15m&count=100
```

Response format:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC",
      "timeframe": "15m",
      "timestamp": "2026-03-18T07:30:00.000Z",
      "open": "2060916219",
      "high": "2098862241",
      "low": "2002273517",
      "close": "2041776332",
      "volume": "3768690971937003865"
    }
  ]
}
```

**Note**: Current backend returns mock data with uniform price ranges (~2000) for all symbols. This is acceptable for frontend development.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Trade Page     │────▶│  KlineChart      │────▶│  Lightweight    │
│  (page.tsx)     │     │  Component       │     │  Charts Library │
│                 │     │                  │     │                 │
│  - symbol       │     │  - chart init    │     │  - candlestick  │
│  - timeframe    │     │  - data transform│     │  - volume       │
│  - kline data   │     │  - resize        │     │  - series       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Timeframe      │     │  TanStack Query  │
│  Selector       │     │  (api hook)      │
└─────────────────┘     └──────────────────┘
```

## Components

### 1. KlineChart.tsx

**Purpose**: Main candlestick chart component with volume overlay

**Props**:
- `symbol: string` - Trading symbol (BTC, ETH, SOL)
- `timeframe: string` - Current timeframe selection
- `onSymbolChange?: (symbol: string) => void` - Optional symbol change handler

**Features**:
- Initialize Lightweight Charts candlestick series
- Display volume histogram below price chart
- Auto-resize on container changes
- Price formatting based on symbol (remove BigInt precision artifacts)
- Dark theme matching application design

**Data Transformation**:
```typescript
// Backend price (BigInt string like "2060916219") → Display price
const formatPrice = (price: string): number => {
  return Number(price) / 1e9; // Convert from wei-like precision
};

// Candle format for Lightweight Charts
interface CandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

interface VolumeData {
  time: number;
  value: number;
  color: string; // Green for up, red for down
}
```

### 2. TimeframeSelector.tsx

**Purpose**: Timeframe selection dropdown/buttons

**Props**:
- `value: string` - Current selected timeframe
- `onChange: (timeframe: string) => void` - Timeframe change handler

**Available Timeframes**:
- `1m` - 1 minute
- `5m` - 5 minutes
- `15m` - 15 minutes (default)
- `1h` - 1 hour
- `4h` - 4 hours
- `1d` - 1 day

**UI**: Horizontal button group with active state highlighting

### 3. API Hook (hooks/useKlineData.ts)

**Purpose**: TanStack Query hook for fetching k-line data

**Returns**:
- `data: Candle[]` - Transformed candlestick data
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state
- `refetch: () => void` - Manual refetch function

**Query Configuration**:
```typescript
{
  queryKey: ['klines', symbol, timeframe],
  queryFn: fetchKlines,
  refetchInterval: 5000, // 5 seconds - match price feed
  staleTime: 3000, // 3 seconds
}
```

## Implementation Plan

1. Create `hooks/useKlineData.ts` - API data fetching hook
2. Create `TimeframeSelector.tsx` - Timeframe selection component
3. Create `KlineChart.tsx` - Main chart component
4. Update `trade/page.tsx` - Integrate chart into trading page layout

## Testing

- Component rendering tests
- Data transformation tests (BigInt → display price)
- Timeframe selection tests
- Responsive layout tests

## Future Enhancements

- Real-time candle updates via WebSocket
- Crosshair and tooltip customization
- Chart zoom/pan interactions
- Multiple chart types (line, area, bars)
- Technical indicators (MA, EMA, RSI)
