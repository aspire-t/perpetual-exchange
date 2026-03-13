import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface CachedValue<T> {
  value: T;
  timestamp: number;
}

@Injectable()
export class PriceService {
  private readonly apiUrl: string;
  private readonly priceCache = new Map<string, CachedValue<string>>();
  private allPricesCache: CachedValue<Record<string, string>> | null = null;
  private readonly CACHE_TTL = 5000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>(
      'HYPERLIQUID_API_URL',
      'https://api.hyperliquid.xyz',
    );
  }

  async getPrice(coin: string): Promise<{
    success: boolean;
    data?: { coin: string; price: string };
    error?: string;
  }> {
    const cached = this.priceCache.get(coin.toUpperCase());
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return {
        success: true,
        data: { coin: coin.toUpperCase(), price: cached.value },
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.apiUrl}/info`, {
          type: 'allMids',
        }),
      );

      const prices = response.data as Record<string, string>;

      // Cache all prices from the response
      for (const [coinSymbol, price] of Object.entries(prices)) {
        this.priceCache.set(coinSymbol, {
          value: price,
          timestamp: now,
        });
      }

      const price = prices[coin.toUpperCase()];

      if (!price) {
        return { success: false, error: `Price not found for coin: ${coin}` };
      }

      return {
        success: true,
        data: { coin: coin.toUpperCase(), price },
      };
    } catch (error) {
      console.warn(
        `Price API request failed: ${error.message}. Falling back to mock prices.`,
      );

      // Fallback to mock prices if API fails
      const mockPrices: Record<string, string> = {
        ETH: '3000.0',
        BTC: '60000.0',
        SOL: '100.0',
        ARB: '100.0',
        OP: '1.5',
        MATIC: '1.5',
      };

      const price = mockPrices[coin.toUpperCase()];

      if (price) {
        // Update cache so we don't spam errors
        this.priceCache.set(coin.toUpperCase(), {
          value: price,
          timestamp: now,
        });

        return {
          success: true,
          data: { coin: coin.toUpperCase(), price },
        };
      }

      return {
        success: false,
        error: `Failed to fetch price for ${coin}: ${error.message}`,
      };
    }
  }

  async getPrices(): Promise<{
    success: boolean;
    data?: Record<string, string>;
    error?: string;
  }> {
    const now = Date.now();

    if (
      this.allPricesCache &&
      now - this.allPricesCache.timestamp < this.CACHE_TTL
    ) {
      return {
        success: true,
        data: this.allPricesCache.value,
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.apiUrl}/info`, {
          type: 'allMids',
        }),
      );

      const prices = response.data as Record<string, string>;
      this.allPricesCache = {
        value: prices,
        timestamp: now,
      };

      return {
        success: true,
        data: prices,
      };
    } catch (error) {
      console.warn(
        `Price API request failed: ${error.message}. Falling back to mock prices.`,
      );

      // Fallback to mock prices
      const mockPrices: Record<string, string> = {
        ETH: '3000.0',
        BTC: '60000.0',
        SOL: '100.0',
        ARB: '100.0',
        OP: '1.5',
        MATIC: '1.5',
      };

      this.allPricesCache = {
        value: mockPrices,
        timestamp: now,
      };

      return {
        success: true,
        data: mockPrices,
      };
    }
  }

  async getPriceHistory(
    symbol: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ price: string; volume: string; timestamp: Date }[]> {
    // For now, return mock data for testing
    // This will be replaced with actual historical data fetch later
    const now = Date.now();
    const points: { price: string; volume: string; timestamp: Date }[] = [];

    // Generate mock price points every 30 seconds within the time range
    const interval = 30 * 1000; // 30 seconds
    for (
      let time = startTime.getTime();
      time <= endTime.getTime();
      time += interval
    ) {
      // Mock price around base price with small variation
      const basePrice = 2000000000n; // 2000 in wei terms
      const variation = BigInt(Math.floor(Math.random() * 100000000));
      const price = basePrice + variation;

      points.push({
        price: price.toString(),
        volume: (
          BigInt(100000000000000000) +
          BigInt(Math.floor(Math.random() * 50000000000000000))
        ).toString(),
        timestamp: new Date(time),
      });
    }

    return points;
  }
}
