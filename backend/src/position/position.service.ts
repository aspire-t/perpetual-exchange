import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../entities/Position.entity';
import { User } from '../entities/User.entity';
import { PriceService } from '../price/price.service';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly priceService: PriceService,
  ) {}

  async openPosition(
    userAddress: string,
    size: bigint,
    entryPrice: bigint,
    isLong: boolean,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Validate size
    if (size <= BigInt(0)) {
      return { success: false, error: 'Invalid size: must be greater than 0' };
    }

    // Normalize address to lowercase for consistent lookup
    const normalizedAddress = userAddress.toLowerCase();

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      // Auto-create user if not exists
      user = this.userRepository.create({ address: normalizedAddress });
      await this.userRepository.save(user);
    }

    // Create position - use strings for SQLite bigint compatibility
    const position = this.positionRepository.create();
    position.userId = user.id;
    position.size = size.toString();
    position.entryPrice = entryPrice.toString();
    position.isLong = isLong;
    position.isOpen = true;

    await this.positionRepository.save(position);

    return {
      success: true,
      data: {
        id: position.id,
        userId: position.userId,
        size: position.size.toString(),
        entryPrice: position.entryPrice.toString(),
        isLong: position.isLong,
        isOpen: position.isOpen,
        createdAt: position.createdAt,
      },
    };
  }

  async closePosition(
    positionId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    if (!position.isOpen) {
      return { success: false, error: 'Position is already closed' };
    }

    // Get current price (assuming ETH for now)
    const priceResult = await this.priceService.getPrice('ETH');
    const currentPrice =
      priceResult.success && priceResult.data
        ? priceResult.data.price // Already a string
        : position.entryPrice;

    // Calculate PnL - convert strings to BigInt for calculation
    const pnl = this.calculatePnL(
      BigInt(position.size),
      BigInt(position.entryPrice),
      BigInt(currentPrice),
      position.isLong,
    );

    // Update position - store as strings
    position.isOpen = false;
    position.exitPrice = currentPrice.toString();
    position.pnl = pnl.toString();
    position.closedAt = new Date();

    await this.positionRepository.save(position);

    return {
      success: true,
      data: {
        id: position.id,
        isOpen: position.isOpen,
        exitPrice: position.exitPrice,
        pnl: position.pnl,
        closedAt: position.closedAt,
      },
    };
  }

  /**
   * Increase position size (add to existing position)
   * Only works for same direction (long/long or short/short)
   * Recalculates weighted average entry price
   */
  async increasePosition(
    positionId: string,
    additionalSize: bigint,
    newEntryPrice: bigint,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (additionalSize <= BigInt(0)) {
      return {
        success: false,
        error: 'Invalid size: must be greater than 0',
      };
    }

    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    if (!position.isOpen) {
      return { success: false, error: 'Position is not open' };
    }

    // Calculate new weighted average entry price
    // newEntryPrice = (oldSize * oldPrice + newSize * newPrice) / (oldSize + newSize)
    const oldSize = BigInt(position.size);
    const oldEntryPrice = BigInt(position.entryPrice);
    const totalSize = oldSize + additionalSize;
    const totalValue = oldSize * oldEntryPrice + additionalSize * newEntryPrice;
    const averageEntryPrice = totalValue / totalSize;

    // Update position
    position.size = totalSize.toString();
    position.entryPrice = averageEntryPrice.toString();

    await this.positionRepository.save(position);

    return {
      success: true,
      data: {
        id: position.id,
        size: position.size.toString(),
        entryPrice: position.entryPrice.toString(),
        averageEntryPrice: averageEntryPrice.toString(),
      },
    };
  }

  /**
   * Reduce position size (partial close)
   * Realizes PnL proportionally
   */
  async reducePosition(
    positionId: string,
    reduceSize: bigint,
    currentPrice: bigint,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (reduceSize <= BigInt(0)) {
      return {
        success: false,
        error: 'Invalid size: must be greater than 0',
      };
    }

    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    if (!position.isOpen) {
      return { success: false, error: 'Position is not open' };
    }

    const currentPositionSize = BigInt(position.size);
    if (reduceSize > currentPositionSize) {
      return {
        success: false,
        error: `Reduce size (${reduceSize.toString()}) exceeds position size (${currentPositionSize.toString()})`,
      };
    }

    // Calculate realized PnL for the reduced portion
    const entryPrice = BigInt(position.entryPrice);
    const realizedPnl = this.calculatePnL(
      reduceSize,
      entryPrice,
      currentPrice,
      position.isLong,
    );

    // Update position size
    const newSize = currentPositionSize - reduceSize;
    position.size = newSize.toString();

    // If position is fully closed, mark as closed
    if (newSize === BigInt(0)) {
      position.isOpen = false;
      position.exitPrice = currentPrice.toString();
      position.closedAt = new Date();
    }

    await this.positionRepository.save(position);

    return {
      success: true,
      data: {
        id: position.id,
        size: position.size.toString(),
        isOpen: position.isOpen,
        realizedPnl: realizedPnl.toString(),
      },
    };
  }

  async getPosition(
    positionId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    return {
      success: true,
      data: {
        id: position.id,
        userId: position.userId,
        size: position.size,
        entryPrice: position.entryPrice,
        exitPrice: position.exitPrice,
        isLong: position.isLong,
        isOpen: position.isOpen,
        pnl: position.pnl,
        createdAt: position.createdAt,
        closedAt: position.closedAt,
      },
    };
  }

  /**
   * Get all positions for a user with pagination
   * @param userAddress - The user address to filter positions
   * @param openOnly - Filter for open positions only (default: true)
   * @param page - Page number (default: 1)
   * @param pageSize - Number of records per page (default: 50)
   */
  async getUserPositions(
    userAddress: string,
    openOnly: boolean = true,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    // Normalize address to lowercase for consistent lookup
    const normalizedAddress = userAddress.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      // Return empty array if user not found (no positions yet)
      return { success: true, data: [] };
    }

    const positions = await this.positionRepository.find({
      where: openOnly ? { userId: user.id, isOpen: true } : { userId: user.id },
      order: { createdAt: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return {
      success: true,
      data: positions.map((position) => ({
        id: position.id,
        userId: position.userId,
        size: position.size,
        entryPrice: position.entryPrice,
        exitPrice: position.exitPrice,
        isLong: position.isLong,
        isOpen: position.isOpen,
        pnl: position.pnl,
        createdAt: position.createdAt,
        closedAt: position.closedAt,
      })),
    };
  }

  private calculatePnL(
    size: bigint,
    entryPrice: bigint,
    currentPrice: bigint,
    isLong: boolean,
  ): bigint {
    if (isLong) {
      // Long: profit when price goes up
      return (
        ((currentPrice - entryPrice) * size) / BigInt('1000000000000000000')
      );
    } else {
      // Short: profit when price goes down
      return (
        ((entryPrice - currentPrice) * size) / BigInt('1000000000000000000')
      );
    }
  }
}
