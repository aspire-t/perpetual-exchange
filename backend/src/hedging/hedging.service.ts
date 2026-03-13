import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private dataSource: DataSource,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let hedge: Hedge | null = null;

    try {
      // Find the position
      const position = await queryRunner.manager.findOne(Position, {
        where: { id: positionId },
      });

      if (!position) {
        await queryRunner.release();
        return { success: false, error: 'Position not found' };
      }

      // Check if hedge already exists
      const existingHedge = await queryRunner.manager.findOne(Hedge, {
        where: { positionId },
      });

      if (existingHedge) {
        await queryRunner.release();
        return {
          success: false,
          error: 'Hedge already exists for this position',
        };
      }

      // Create opposite hedge: long position -> short hedge, short position -> long hedge
      hedge = queryRunner.manager.create(Hedge);
      hedge.positionId = positionId;
      hedge.size = position.size;
      hedge.entryPrice = position.entryPrice;
      hedge.isShort = position.isLong; // Opposite direction
      hedge.status = HedgeStatus.PENDING;

      // Place order on Hyperliquid
      const orderResult = await this.hyperliquidClient.placeOrder(
        'ETH', // Assuming ETH perpetual
        this.weiToTokenSize(BigInt(position.size)),
        hedge.isShort,
      );

      if (!orderResult.success) {
        hedge.status = HedgeStatus.FAILED;
        await queryRunner.manager.save(hedge);
        await queryRunner.commitTransaction();
        await queryRunner.release();

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

      await queryRunner.manager.save(hedge);
      await queryRunner.commitTransaction();

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
      await queryRunner.rollbackTransaction();

      if (hedge) {
        hedge.status = HedgeStatus.FAILED;
        try {
          await queryRunner.manager.save(hedge);
          await queryRunner.commitTransaction();
        } catch (saveError) {
          // Ignore save error in catch block
        }
      }

      this.logger.error(`Failed to open hedge: ${error.message}`);

      return {
        success: false,
        error: `Failed to open hedge: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Close a hedge
   * Closes the hedge position on Hyperliquid
   */
  async closeHedge(
    hedgeId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hedge = await queryRunner.manager.findOne(Hedge, {
        where: { id: hedgeId },
      });

      if (!hedge) {
        await queryRunner.release();
        return { success: false, error: 'Hedge not found' };
      }

      if (hedge.status === HedgeStatus.CLOSED) {
        await queryRunner.release();
        return { success: false, error: 'Hedge is already closed' };
      }

      // Close position on Hyperliquid
      const closeResult = await this.hyperliquidClient.closePosition('ETH');

      if (!closeResult.success) {
        await queryRunner.release();
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

      await queryRunner.manager.save(hedge);
      await queryRunner.commitTransaction();

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
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to close hedge: ${error.message}`);

      return {
        success: false,
        error: `Failed to close hedge: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
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
   * Get all hedges for a position with pagination
   * @param positionId - The position ID to filter hedges
   * @param page - Page number (default: 1)
   * @param pageSize - Number of records per page (default: 50)
   */
  async getPositionHedges(
    positionId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const hedges = await this.hedgeRepository.find({
      where: { positionId },
      order: { createdAt: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hedge = await queryRunner.manager.findOne(Hedge, {
        where: { id: hedgeId },
      });

      if (!hedge) {
        await queryRunner.release();
        return { success: false, error: 'Hedge not found' };
      }

      if (hedge.status === HedgeStatus.CLOSED) {
        await queryRunner.release();
        return {
          success: true,
          data: { synced: false, reason: 'Already closed' },
        };
      }

      // Get position from Hyperliquid
      const positionResult = await this.hyperliquidClient.getPosition('ETH');

      if (!positionResult.success) {
        await queryRunner.release();
        return {
          success: false,
          error: positionResult.error || 'Failed to sync status',
        };
      }

      const hlPosition = positionResult.data!;

      // Update hedge with current data
      hedge.entryPrice = hlPosition.entryPx;
      hedge.pnl = hlPosition.unrealizedPnl;

      await queryRunner.manager.save(hedge);
      await queryRunner.commitTransaction();

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
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        error: `Failed to sync hedge status: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
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
