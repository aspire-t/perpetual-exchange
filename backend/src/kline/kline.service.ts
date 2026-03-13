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
    const high = prices.reduce((max, p) =>
      BigInt(p.price) > BigInt(max) ? p.price : max, prices[0].price);
    const low = prices.reduce((min, p) =>
      BigInt(p.price) < BigInt(min) ? p.price : min, prices[0].price);
    const volume = prices.reduce(
      (sum, p) => sum + BigInt(p.volume),
      BigInt(0)
    ).toString();

    return {
      open,
      high,
      low,
      close,
      volume,
      timestamp: prices[0].timestamp,
    };
  }
}
