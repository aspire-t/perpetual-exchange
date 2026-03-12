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

  async getUserPositions(
    userAddress: string,
    openOnly: boolean = true,
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
