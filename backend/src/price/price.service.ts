import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PriceService {
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>(
      'HYPERLIQUID_API_URL',
      'https://api.hyperliquid.xyz',
    );
  }

  async getPrice(
    coin: string,
  ): Promise<{
    success: boolean;
    data?: { coin: string; price: string };
    error?: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.apiUrl}/info`, {
          type: 'allMids',
        }),
      );

      const prices = response.data as Record<string, string>;
      const price = prices[coin.toUpperCase()];

      if (!price) {
        return { success: false, error: `Price not found for coin: ${coin}` };
      }

      return {
        success: true,
        data: { coin: coin.toUpperCase(), price },
      };
    } catch (error) {
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
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.apiUrl}/info`, {
          type: 'allMids',
        }),
      );

      return {
        success: true,
        data: response.data as Record<string, string>,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch prices: ${error.message}`,
      };
    }
  }
}
