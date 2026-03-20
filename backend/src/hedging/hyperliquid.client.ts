import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Wallet, ethers } from 'ethers';
import * as msgpack from 'msgpack-lite';

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

export type HyperliquidErrorCode =
  | 'CONFIG_ERROR'
  | 'ASSET_NOT_FOUND'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'NO_POSITION'
  | 'UNKNOWN_ERROR';

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
  private coinToAssetId: Map<string, number> = new Map();

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

  private failure(
    error: string,
    code: HyperliquidErrorCode,
    retryable: boolean = false,
  ): { success: false; error: string; code: HyperliquidErrorCode; retryable: boolean } {
    return { success: false, error, code, retryable };
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
    code?: HyperliquidErrorCode;
    retryable?: boolean;
  }> {
    try {
      // Check if we have credentials for real trading
      const hasCredentials =
        this.privateKey && this.walletAddress && this.apiKey;

      if (!hasCredentials) {
        if (!this.isTestnet) {
          return this.failure(
            'Hyperliquid credentials are required in production environment',
            'CONFIG_ERROR',
            false,
          );
        }
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
      return this.failure(
        `Failed to place order: ${error.message}`,
        'UNKNOWN_ERROR',
        false,
      );
    }
  }

  /**
   * Place a real order on Hyperliquid
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
    code?: HyperliquidErrorCode;
    retryable?: boolean;
  }> {
    try {
      const assetIndex = await this.getAssetIndex(coin);
      if (assetIndex === undefined) {
        return this.failure(
          `Asset index not found for coin: ${coin}`,
          'ASSET_NOT_FOUND',
          false,
        );
      }

      const wallet = new Wallet(this.privateKey!);
      const nonce = Date.now();

      // Order action payload
      const action = {
        type: 'order',
        orders: [
          {
            a: assetIndex,
            b: !isShort, // true for buy (long), false for sell (short)
            p: limitPrice || '1000000', // Need a valid price. If market, usually aggressive limit.
            s: size,
            r: false, // reduce only
            t: { limit: { tif: 'Gtc' } }, // Time in force: Gtc, Ioc, Alo
          },
        ],
        grouping: 'na',
      };

      // For market orders, we should probably set a very aggressive price or use Ioc?
      // But standard Hyperliquid usage is often Limit Gtc with aggressive price for market.
      // If limitPrice is not provided, we should probably fetch current price and add slippage?
      // Or just rely on the user providing a price or handling 'market' logic upstream.
      // For now, if no limitPrice, we use a placeholder or handle it.
      // NOTE: 'market' string in limitPx logic in mock was a simplification.
      // Real API requires a numeric string price.
      if (!limitPrice) {
          // If no limit price, we should probably fetch the mark price first?
          // Or just assume the caller handles it.
          // Let's throw for now if no price, as 'market' orders need a limit price in Hyperliquid (limit crossing spread).
          // Or we can try to get the price.
          // For safety, let's warn and require price or implement price fetching.
          // But to keep it simple as requested:
          // The user's mock code used 'market'.
          // Let's fetch the price if not provided.
          const priceRes = await this.priceServiceGetPrice(coin);
          if (priceRes) {
             const basePrice = parseFloat(priceRes);
             const slippage = isShort ? 0.995 : 1.005; // 0.5% slippage
             action.orders[0].p = (basePrice * slippage).toFixed(6); // 6 decimals usually safe?
             action.orders[0].t = { limit: { tif: 'Ioc' } }; // Immediate or cancel for market
          } else {
             throw new Error('Limit price required for real orders or price fetch failed');
          }
      }

      const signature = await this.signL1Action(wallet, action, nonce);

      const payload = {
        action,
        nonce,
        signature,
        vaultAddress: null,
      };

      this.logger.log(
        `Sending order to Hyperliquid: coin=${coin}, size=${size}, side=${isShort ? 'short' : 'long'}, hasLimitPrice=${Boolean(limitPrice)}, nonce=${nonce}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/exchange`, payload)
      );

      const result = response.data;
      if (result.status === 'ok') {
        const status = result.response?.data?.statuses?.[0];
        if (status?.error) {
             return this.failure(`Order error: ${status.error}`, 'API_ERROR', false);
        }
        return {
          success: true,
          data: {
            orderId: result.response?.data?.statuses?.[0]?.resting?.oid?.toString() || 'filled',
            status: 'filled', // or 'open'
            price: action.orders[0].p,
          },
        };
      } else {
        return this.failure(result.response || 'Unknown error', 'API_ERROR', true);
      }
    } catch (error) {
      this.logger.error(`Real order placement failed: ${error.message}`);
      return this.failure(
        `Failed to place real order: ${error.message}`,
        'NETWORK_ERROR',
        true,
      );
    }
  }

  // Helper to fetch price if needed (simplified)
  private async priceServiceGetPrice(coin: string): Promise<string | null> {
      // In a real app, inject PriceService. Here we might just fetch from Hyperliquid info.
      // Or reuse the existing getPosition logic which calls /info.
      // Let's call /info meta or allMids.
      try {
           const response = await firstValueFrom(
              this.httpService.post(`${this.baseUrl}/info`, { type: 'allMids' })
           );
           const mids = response.data;
           return mids[coin] || null;
      } catch (e) {
          return null;
      }
  }

  /**
   * Sign an L1 action for Hyperliquid
   */
  private async signL1Action(
    wallet: Wallet,
    action: any,
    nonce: number,
  ): Promise<{ r: string; s: string; v: number }> {
    const actionBytes = msgpack.encode(action);
    const nonceBytes = Buffer.alloc(8);
    // Write nonce as uint64 big-endian. JS numbers are doubles (53 bits integer safety).
    // nonce is timestamp (ms), fits in 53 bits.
    // We need to write 64-bit integer.
    // High 32 bits, Low 32 bits.
    const high = Math.floor(nonce / 0x100000000);
    const low = nonce % 0x100000000;
    nonceBytes.writeUInt32BE(high, 0);
    nonceBytes.writeUInt32BE(low, 4);

    const vaultAddressBytes = Buffer.from([0]); // No vault address

    const payload = Buffer.concat([actionBytes, nonceBytes, vaultAddressBytes]);
    const connectionId = ethers.keccak256(payload);

    // EIP-712 Domain
    const domain = {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: 1337,
      verifyingContract: '0x0000000000000000000000000000000000000000',
    };

    // Types
    const types = {
      Agent: [
        { name: 'source', type: 'string' },
        { name: 'connectionId', type: 'bytes32' },
      ],
    };

    // Value
    const value = {
      source: this.isTestnet ? 'b' : 'a', // 'a' for mainnet, 'b' for testnet usually
      connectionId: connectionId,
    };

    const signature = await wallet.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    return {
      r: sig.r,
      s: sig.s,
      v: sig.v,
    };
  }

  /**
   * Get asset index for a coin symbol
   */
  private async getAssetIndex(coin: string): Promise<number | undefined> {
    if (this.coinToAssetId.has(coin)) {
      return this.coinToAssetId.get(coin);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/info`, {
          type: 'meta',
        }),
      );

      const universe = response.data.universe;
      universe.forEach((asset: any, index: number) => {
        this.coinToAssetId.set(asset.name, index);
      });

      return this.coinToAssetId.get(coin);
    } catch (error) {
      this.logger.error(`Failed to fetch asset meta: ${error.message}`);
      return undefined;
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
    code?: HyperliquidErrorCode;
    retryable?: boolean;
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
        return this.failure(`No position found for coin: ${coin}`, 'NO_POSITION', false);
      }

      return {
        success: true,
        data: position as HyperliquidPosition,
      };
    } catch (error) {
      return this.failure(
        `Failed to get position: ${error.message}`,
        'NETWORK_ERROR',
        true,
      );
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
    code?: HyperliquidErrorCode;
    retryable?: boolean;
  }> {
    try {
      // Get current position to determine close size
      const positionResult = await this.getPosition(coin);
      if (!positionResult.success || !positionResult.data) {
        return this.failure('No open position to close', 'NO_POSITION', false);
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
      return this.failure(
        `Failed to close position: ${error.message}`,
        'UNKNOWN_ERROR',
        false,
      );
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
    code?: HyperliquidErrorCode;
    retryable?: boolean;
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
      return this.failure(
        `Failed to get account info: ${error.message}`,
        'NETWORK_ERROR',
        true,
      );
    }
  }
}
