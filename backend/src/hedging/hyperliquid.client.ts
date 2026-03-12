import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface HyperliquidOrder {
  coin: string;
  isCross: boolean;
  limitPx: string;
  side: string; // 'A' for ask (short), 'B' for bid (long)
  size: string;
  reduceOnly: boolean;
  orderType: string;
}

export interface HyperliquidPosition {
  coin: string;
  entryPx: string;
  leverage: { type: string; value: number };
  liquidationPx: string;
  marginUsed: string;
  maxLeverage: number;
  positionValue: string;
  returnOnEquity: string;
  szi: string;
  unrealizedPnl: string;
}

@Injectable()
export class HyperliquidClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly walletAddress?: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('HYPERLIQUID_API_URL') ||
      'https://api.hyperliquid.xyz';
    this.apiKey = this.configService.get<string>('HYPERLIQUID_API_KEY');
    this.walletAddress = this.configService.get<string>(
      'HYPERLIQUID_WALLET_ADDRESS',
    );
  }

  /**
   * Place an order on Hyperliquid
   * @param coin - Asset symbol (e.g., 'ETH')
   * @param size - Order size in tokens
   * @param isShort - true for short, false for long
   * @param limitPrice - Optional limit price, if not provided uses market order
   */
  async placeOrder(
    coin: string,
    size: string,
    isShort: boolean,
    limitPrice?: string,
  ): Promise<{
    success: boolean;
    data?: { orderId: string; status: string };
    error?: string;
  }> {
    try {
      // In real mode, this would call the Hyperliquid API
      // For now, return a mock response
      return {
        success: true,
        data: {
          orderId: `mock-order-${Date.now()}`,
          status: 'placed',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to place order: ${error.message}`,
      };
    }
  }

  /**
   * Get current position on Hyperliquid
   * @param coin - Asset symbol (e.g., 'ETH')
   */
  async getPosition(
    coin: string,
  ): Promise<{
    success: boolean;
    data?: HyperliquidPosition;
    error?: string;
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/info`, {
          params: {
            type: 'clearinghouse',
            user: this.walletAddress,
          },
        }),
      );

      const positions = response.data as any[];
      const position = positions.find(
        (p) => p.coin?.toUpperCase() === coin.toUpperCase(),
      );

      if (!position) {
        return {
          success: false,
          error: `No position found for coin: ${coin}`,
        };
      }

      return {
        success: true,
        data: position as HyperliquidPosition,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get position: ${error.message}`,
      };
    }
  }

  /**
   * Close a position on Hyperliquid
   * @param coin - Asset symbol (e.g., 'ETH')
   */
  async closePosition(
    coin: string,
  ): Promise<{
    success: boolean;
    data?: { orderId: string };
    error?: string;
  }> {
    try {
      // Get current position to determine close size
      const positionResult = await this.getPosition(coin);
      if (!positionResult.success || !positionResult.data) {
        return {
          success: false,
          error: 'No open position to close',
        };
      }

      const position = positionResult.data;
      const isShort = parseFloat(position.szi) < 0;

      // Place opposite order to close
      return this.placeOrder(
        coin,
        Math.abs(parseFloat(position.szi)).toString(),
        !isShort,
      );
    } catch (error) {
      return {
        success: false,
        error: `Failed to close position: ${error.message}`,
      };
    }
  }
}
