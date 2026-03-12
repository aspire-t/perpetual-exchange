import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hedge, HedgeStatus } from '../entities/Hedge.entity';
import { Position } from '../entities/Position.entity';
import { PriceService } from '../price/price.service';

@Injectable()
export class HedgingService {
  constructor(
    @InjectRepository(Hedge)
    private hedgeRepository: Repository<Hedge>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    private readonly priceService: PriceService,
  ) {}

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
    const hedge = this.hedgeRepository.create({
      positionId,
      size: position.size,
      entryPrice: position.entryPrice,
      isShort: !position.isLong, // Opposite side
      status: HedgeStatus.OPEN,
    });

    await this.hedgeRepository.save(hedge);

    return {
      success: true,
      data: {
        id: hedge.id,
        positionId: hedge.positionId,
        size: hedge.size.toString(),
        entryPrice: hedge.entryPrice.toString(),
        isShort: hedge.isShort,
        status: hedge.status,
        createdAt: hedge.createdAt,
      },
    };
  }

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

    // Get current price
    const priceResult = await this.priceService.getPrice('ETH');
    const currentPrice =
      priceResult.success && priceResult.data
        ? BigInt(priceResult.data.price)
        : hedge.entryPrice;

    // Calculate PnL
    const pnl = this.calculateHedgePnL(
      hedge.size,
      hedge.entryPrice,
      currentPrice,
      hedge.isShort,
    );

    // Update hedge
    hedge.status = HedgeStatus.CLOSED;
    hedge.exitPrice = currentPrice;
    hedge.pnl = pnl;
    hedge.closedAt = new Date();

    await this.hedgeRepository.save(hedge);

    return {
      success: true,
      data: {
        id: hedge.id,
        status: hedge.status,
        exitPrice: hedge.exitPrice.toString(),
        pnl: hedge.pnl.toString(),
        closedAt: hedge.closedAt,
      },
    };
  }

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
        size: hedge.size.toString(),
        entryPrice: hedge.entryPrice.toString(),
        exitPrice: hedge.exitPrice?.toString(),
        isShort: hedge.isShort,
        status: hedge.status,
        pnl: hedge.pnl?.toString(),
        createdAt: hedge.createdAt,
        closedAt: hedge.closedAt,
      },
    };
  }

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
        size: hedge.size.toString(),
        entryPrice: hedge.entryPrice.toString(),
        exitPrice: hedge.exitPrice?.toString(),
        isShort: hedge.isShort,
        status: hedge.status,
        pnl: hedge.pnl?.toString(),
        createdAt: hedge.createdAt,
        closedAt: hedge.closedAt,
      })),
    };
  }

  async autoHedge(
    positionId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Auto-hedge is called when a position is opened
    // It will create a hedge if one doesn't exist
    return this.openHedge(positionId);
  }

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
}
