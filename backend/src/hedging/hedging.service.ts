import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hedge, HedgeStatus } from '../entities/Hedge.entity';
import { Position } from '../entities/Position.entity';
import { PriceService } from '../price/price.service';
import { HyperliquidClient } from './hyperliquid.client';

/**
 * Hedging Service
 *
 * Implements automatic hedging logic:
 * - Opens hedge positions on Hyperliquid when user positions are opened
 * - Manages hedge lifecycle (open, close, track PnL)
 * - Supports both mock and real Hyperliquid API integration
 */
@Injectable()
export class HedgingService {
  private readonly logger = new Logger(HedgingService.name);

  constructor(
    @InjectRepository(Hedge)
    private hedgeRepository: Repository<Hedge>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    private readonly priceService: PriceService,
    private readonly hyperliquidClient: HyperliquidClient,
  ) {}

  /**
   * Open a hedge for a position
   * Creates opposite position on Hyperliquid:
   * - Long position -> Short hedge
   * - Short position -> Long hedge
   */
  async openHedge(
    positionId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Find the position
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    // Check if hedge already exists
    const existingHedge = await this.hedgeRepository.findOne({
      where: { positionId },
    });

    if (existingHedge) {
      return {
        success: false,
        error: 'Hedge already exists for this position',
      };
    }

    // Create opposite hedge: long position -> short hedge, short position -> long hedge
    const hedge = this.hedgeRepository.create();
    hedge.positionId = positionId;
    hedge.size = position.size;
    hedge.entryPrice = position.entryPrice;
    hedge.isShort = position.isLong; // Opposite direction
    hedge.status = HedgeStatus.PENDING;

    try {
      // Place order on Hyperliquid
      const orderResult = await this.hyperliquidClient.placeOrder(
        'ETH', // Assuming ETH perpetual
        this.weiToTokenSize(BigInt(position.size)),
        hedge.isShort,
      );

      if (!orderResult.success) {
        hedge.status = HedgeStatus.FAILED;
        await this.hedgeRepository.save(hedge);

        return {
          success: false,
          error: `Failed to place hedge order: ${orderResult.error}`,
        };
      }

      // Update hedge with order info
      hedge.status = HedgeStatus.OPEN;
      hedge.hyperliquidOrderId = orderResult.data?.orderId;
      if (orderResult.data?.price) {
        hedge.entryPrice = orderResult.data.price;
      }

      await this.hedgeRepository.save(hedge);

      this.logger.log(
        `Hedge opened successfully for position ${positionId}: OrderId=${orderResult.data?.orderId}`,
      );

      return {
        success: true,
        data: {
          id: hedge.id,
          positionId: hedge.positionId,
          size: hedge.size.toString(),
          entryPrice: hedge.entryPrice.toString(),
          isShort: hedge.isShort,
          status: hedge.status,
          hyperliquidOrderId: hedge.hyperliquidOrderId,
          createdAt: hedge.createdAt,
        },
      };
    } catch (error) {
      hedge.status = HedgeStatus.FAILED;
      await this.hedgeRepository.save(hedge);

      this.logger.error(`Failed to open hedge: ${error.message}`);

      return {
        success: false,
        error: `Failed to open hedge: ${error.message}`,
      };
    }
  }

  /**
   * Close a hedge
   * Closes the hedge position on Hyperliquid
   */
  async closeHedge(
    hedgeId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const hedge = await this.hedgeRepository.findOne({
      where: { id: hedgeId },
    });

    if (!hedge) {
      return { success: false, error: 'Hedge not found' };
    }

    if (hedge.status === HedgeStatus.CLOSED) {
      return { success: false, error: 'Hedge is already closed' };
    }

    try {
      // Close position on Hyperliquid
      const closeResult = await this.hyperliquidClient.closePosition('ETH');

      if (!closeResult.success) {
        return {
          success: false,
          error: `Failed to close hedge on Hyperliquid: ${closeResult.error}`,
        };
      }

      // Get current price for PnL calculation
      const priceResult = await this.priceService.getPrice('ETH');
      const currentPrice =
        priceResult.success && priceResult.data
          ? priceResult.data.price
          : hedge.entryPrice;

      // Calculate PnL
      const pnl = this.calculateHedgePnL(
        BigInt(hedge.size),
        BigInt(hedge.entryPrice),
        BigInt(currentPrice),
        hedge.isShort,
      );

      // Update hedge
      hedge.status = HedgeStatus.CLOSED;
      hedge.exitPrice = currentPrice.toString();
      hedge.pnl = pnl.toString();
      hedge.closedAt = new Date();
      hedge.hyperliquidOrderId = closeResult.data?.orderId;

      await this.hedgeRepository.save(hedge);

      this.logger.log(
        `Hedge closed successfully: id=${hedgeId}, pnl=${pnl.toString()}`,
      );

      return {
        success: true,
        data: {
          id: hedge.id,
          status: hedge.status,
          exitPrice: hedge.exitPrice.toString(),
          pnl: hedge.pnl.toString(),
          closedAt: hedge.closedAt,
          hyperliquidOrderId: hedge.hyperliquidOrderId,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to close hedge: ${error.message}`);

      return {
        success: false,
        error: `Failed to close hedge: ${error.message}`,
      };
    }
  }

  /**
   * Get hedge by ID
   */
  async getHedge(
    hedgeId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const hedge = await this.hedgeRepository.findOne({
      where: { id: hedgeId },
    });

    if (!hedge) {
      return { success: false, error: 'Hedge not found' };
    }

    return {
      success: true,
      data: {
        id: hedge.id,
        positionId: hedge.positionId,
        size: hedge.size,
        entryPrice: hedge.entryPrice,
        exitPrice: hedge.exitPrice,
        isShort: hedge.isShort,
        status: hedge.status,
        pnl: hedge.pnl,
        hyperliquidOrderId: hedge.hyperliquidOrderId,
        createdAt: hedge.createdAt,
        closedAt: hedge.closedAt,
      },
    };
  }

  /**
   * Get all hedges for a position
   */
  async getPositionHedges(
    positionId: string,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const hedges = await this.hedgeRepository.find({
      where: { positionId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: hedges.map((hedge) => ({
        id: hedge.id,
        positionId: hedge.positionId,
        size: hedge.size,
        entryPrice: hedge.entryPrice,
        exitPrice: hedge.exitPrice,
        isShort: hedge.isShort,
        status: hedge.status,
        pnl: hedge.pnl,
        hyperliquidOrderId: hedge.hyperliquidOrderId,
        createdAt: hedge.createdAt,
        closedAt: hedge.closedAt,
      })),
    };
  }

  /**
   * Auto-hedge: Open hedge when position is opened
   * This is the main entry point for automatic hedging
   */
  async autoHedge(
    positionId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    this.logger.log(`Auto-hedge triggered for position ${positionId}`);
    return this.openHedge(positionId);
  }

  /**
   * Sync hedge status with Hyperliquid
   * Fetches current status from Hyperliquid and updates local records
   */
  async syncHedgeStatus(
    hedgeId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const hedge = await this.hedgeRepository.findOne({
      where: { id: hedgeId },
    });

    if (!hedge) {
      return { success: false, error: 'Hedge not found' };
    }

    if (hedge.status === HedgeStatus.CLOSED) {
      return {
        success: true,
        data: { synced: false, reason: 'Already closed' },
      };
    }

    try {
      // Get position from Hyperliquid
      const positionResult = await this.hyperliquidClient.getPosition('ETH');

      if (!positionResult.success) {
        return {
          success: false,
          error: positionResult.error || 'Failed to sync status',
        };
      }

      const hlPosition = positionResult.data!;

      // Update hedge with current data
      hedge.entryPrice = hlPosition.entryPx;
      hedge.pnl = hlPosition.unrealizedPnl;

      await this.hedgeRepository.save(hedge);

      return {
        success: true,
        data: {
          synced: true,
          entryPrice: hlPosition.entryPx,
          unrealizedPnl: hlPosition.unrealizedPnl,
          liquidationPrice: hlPosition.liquidationPx,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to sync hedge status: ${error.message}`,
      };
    }
  }

  /**
   * Calculate PnL for a hedge position
   */
  private calculateHedgePnL(
    size: bigint,
    entryPrice: bigint,
    currentPrice: bigint,
    isShort: boolean,
  ): bigint {
    if (isShort) {
      // Short hedge: profit when price goes down
      return (
        ((entryPrice - currentPrice) * size) / BigInt('1000000000000000000')
      );
    } else {
      // Long hedge: profit when price goes up
      return (
        ((currentPrice - entryPrice) * size) / BigInt('1000000000000000000')
      );
    }
  }

  /**
   * Convert wei-denominated size to token size
   * Hyperliquid uses token units, not wei
   */
  private weiToTokenSize(weiSize: bigint): string {
    // Assuming 18 decimals for ETH
    const decimals = BigInt('1000000000000000000');
    return (weiSize / decimals).toString();
  }

  /**
   * Get total hedged volume
   */
  async getTotalHedgedVolume(): Promise<{
    success: boolean;
    data?: { totalVolume: string; openHedges: number };
    error?: string;
  }> {
    try {
      const openHedges = await this.hedgeRepository.find({
        where: { status: HedgeStatus.OPEN },
      });

      const totalVolume = openHedges.reduce(
        (sum, hedge) => sum + BigInt(hedge.size),
        BigInt(0),
      );

      return {
        success: true,
        data: {
          totalVolume: totalVolume.toString(),
          openHedges: openHedges.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to calculate hedged volume: ${error.message}`,
      };
    }
  }
}
