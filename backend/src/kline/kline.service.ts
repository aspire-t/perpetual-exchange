import { Injectable } from '@nestjs/common';

interface PricePoint {
  price: string;
  volume: string;
  timestamp: Date;
}

interface Candle {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  timestamp: Date;
}

@Injectable()
export class KlineService {
  aggregateCandle(prices: PricePoint[], timeframe: string): Candle {
    if (prices.length === 0) {
      throw new Error('No price data to aggregate');
    }

    const open = prices[0].price;
    const close = prices[prices.length - 1].price;
    const high = prices.reduce(
      (max, p) => (BigInt(p.price) > BigInt(max) ? p.price : max),
      prices[0].price,
    );
    const low = prices.reduce(
      (min, p) => (BigInt(p.price) < BigInt(min) ? p.price : min),
      prices[0].price,
    );
    const volume = prices
      .reduce((sum, p) => sum + BigInt(p.volume), BigInt(0))
      .toString();

    return {
      open,
      high,
      low,
      close,
      volume,
      timestamp: prices[0].timestamp,
    };
  }

  private getBucketKey(timestamp: Date, timeframe: string): string {
    const msPerMinute = 60 * 1000;
    const msPerHour = 60 * msPerMinute;
    const msPerDay = 24 * msPerHour;

    let bucketMs: number;
    const time = timestamp.getTime();

    switch (timeframe) {
      case '1m':
        bucketMs = Math.floor(time / msPerMinute) * msPerMinute;
        break;
      case '5m':
        bucketMs = Math.floor(time / (5 * msPerMinute)) * (5 * msPerMinute);
        break;
      case '15m':
        bucketMs = Math.floor(time / (15 * msPerMinute)) * (15 * msPerMinute);
        break;
      case '1h':
        bucketMs = Math.floor(time / msPerHour) * msPerHour;
        break;
      case '4h':
        bucketMs = Math.floor(time / (4 * msPerHour)) * (4 * msPerHour);
        break;
      case '1d':
        bucketMs = Math.floor(time / msPerDay) * msPerDay;
        break;
      default:
        bucketMs = Math.floor(time / msPerMinute) * msPerMinute;
    }

    return new Date(bucketMs).toISOString();
  }

  bucketByTimeframe(
    prices: PricePoint[],
    timeframe: string,
  ): Map<string, PricePoint[]> {
    const buckets = new Map<string, PricePoint[]>();

    for (const price of prices) {
      const key = this.getBucketKey(price.timestamp, timeframe);
      const existing = buckets.get(key) || [];
      existing.push(price);
      buckets.set(key, existing);
    }

    return buckets;
  }
}
