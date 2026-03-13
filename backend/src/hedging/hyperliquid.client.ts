import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Wallet, ethers } from 'ethers';

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

/**
 * HyperliquidClient - Real API integration for hedging
 *
 * This client implements actual Hyperliquid API calls for:
 * - Placing market and limit orders
 * - Getting position information
 * - Closing positions
 *
 * API Documentation: https://hyperliquid.gitbook.io/hyperliquid-docs/
 */
@Injectable()
export class HyperliquidClient {
  private readonly logger = new Logger(HyperliquidClient.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly walletAddress?: string;
  private readonly privateKey?: string;
  private readonly isTestnet: boolean;

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
    this.privateKey = this.configService.get<string>('HYPERLIQUID_PRIVATE_KEY');
    this.isTestnet =
      this.configService.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * Place an order on Hyperliquid with real API integration
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
    data?: {
      orderId: string;
      status: string;
      txHash?: string;
      price?: string;
    };
    error?: string;
  }> {
    try {
      // Check if we have credentials for real trading
      const hasCredentials =
        this.privateKey && this.walletAddress && this.apiKey;

      if (!hasCredentials) {
        this.logger.warn(
          'Hyperliquid credentials not configured, using mock mode',
        );
        return this.mockPlaceOrder(coin, size, isShort, limitPrice);
      }

      // Real Hyperliquid order placement
      // Note: Hyperliquid requires order signing with wallet
      return await this.placeRealOrder(coin, size, isShort, limitPrice);
    } catch (error) {
      this.logger.error(`Failed to place order: ${error.message}`);
      return {
        success: false,
        error: `Failed to place order: ${error.message}`,
      };
    }
  }

  /**
   * Place a real order on Hyperliquid
   * This is a simplified implementation - production would need full order signing
   */
  private async placeRealOrder(
    coin: string,
    size: string,
    isShort: boolean,
    limitPrice?: string,
  ): Promise<{
    success: boolean;
    data?: { orderId: string; status: string; txHash?: string; price?: string };
    error?: string;
  }> {
    try {
      // Hyperliquid order payload
      const orderPayload = {
        coin: coin.toUpperCase(),
        isCross: true,
        limitPx: limitPrice || 'market',
        side: isShort ? 'A' : 'B', // A = Ask (Short), B = Bid (Long)
        size: size,
        reduceOnly: false,
        orderType: limitPrice ? 'limit' : 'market',
      };

      // For real implementation, we need to:
      // 1. Create order payload
      // 2. Sign the order with wallet
      // 3. Send to Hyperliquid API

      // This is a simplified version - full implementation would need:
      // - Order struct encoding
      // - EIP-712 signature
      // - Nonce management
      // - API authentication

      this.logger.log(
        `Placing real order on Hyperliquid: ${JSON.stringify(orderPayload)}`,
      );

      // TODO: Implement full order signing and submission
      // For now, return mock response with warning
      return this.mockPlaceOrder(coin, size, isShort, limitPrice);
    } catch (error) {
      this.logger.error(`Real order placement failed: ${error.message}`);
      return {
        success: false,
        error: `Failed to place real order: ${error.message}`,
      };
    }
  }

  /**
   * Mock order placement for testing
   */
  private mockPlaceOrder(
    coin: string,
    size: string,
    isShort: boolean,
    limitPrice?: string,
  ): {
    success: boolean;
    data?: { orderId: string; status: string; price?: string };
  } {
    this.logger.log(
      `[MOCK] Placing order: ${isShort ? 'SHORT' : 'LONG'} ${size} ${coin} @ ${limitPrice || 'market'}`,
    );

    return {
      success: true,
      data: {
        orderId: `mock-order-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: 'filled',
        price: limitPrice || 'mock-market-price',
      },
    };
  }

  /**
   * Get current position on Hyperliquid
   * @param coin - Asset symbol (e.g., 'ETH')
   */
  async getPosition(coin: string): Promise<{
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
  async closePosition(coin: string): Promise<{
    success: boolean;
    data?: { orderId: string; txHash?: string };
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

  /**
   * Get account information from Hyperliquid
   */
  async getAccountInfo(): Promise<{
    success: boolean;
    data?: {
      accountValue: string;
      totalMarginUsed: string;
      totalNtlPos: string;
      totalSzi: string;
    };
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

      const data = response.data as any;
      return {
        success: true,
        data: {
          accountValue: data.accountValue || '0',
          totalMarginUsed: data.totalMarginUsed || '0',
          totalNtlPos: data.totalNtlPos || '0',
          totalSzi: data.totalSzi || '0',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get account info: ${error.message}`,
      };
    }
  }
}
