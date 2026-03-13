import { Injectable } from '@nestjs/common';
import { PriceService } from '../price/price.service';

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
  constructor(private priceService: PriceService) {}
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

  async generateKlines(
    symbol: string,
    timeframe: string,
    count: number,
  ): Promise<Partial<Candle>[]> {
    const endTime = new Date();
    const startTime = this.getStartTime(endTime, timeframe, count);

    const prices = await this.priceService.getPriceHistory(
      symbol,
      startTime,
      endTime,
    );

    if (prices.length === 0) {
      return [];
    }

    const buckets = this.bucketByTimeframe(prices, timeframe);
    const klines: Partial<Candle>[] = [];

    for (const [timestamp, bucketPrices] of buckets.entries()) {
      const candle = this.aggregateCandle(bucketPrices, timeframe);
      klines.push({
        symbol,
        timeframe,
        timestamp: new Date(timestamp),
        ...candle,
      });
    }

    return klines.slice(-count);
  }

  private getStartTime(endTime: Date, timeframe: string, count: number): Date {
    const msPerMinute = 60 * 1000;
    const msPerHour = 60 * msPerMinute;
    const msPerDay = 24 * msPerHour;

    let duration: number;
    switch (timeframe) {
      case '1m':
        duration = msPerMinute;
        break;
      case '5m':
        duration = 5 * msPerMinute;
        break;
      case '15m':
        duration = 15 * msPerMinute;
        break;
      case '1h':
        duration = msPerHour;
        break;
      case '4h':
        duration = 4 * msPerHour;
        break;
      case '1d':
        duration = msPerDay;
        break;
      default:
        duration = msPerMinute;
    }

    return new Date(endTime.getTime() - duration * count * 2);
  }
}
