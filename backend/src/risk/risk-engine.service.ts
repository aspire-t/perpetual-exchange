import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Position } from '../entities/Position.entity';
import { User } from '../entities/User.entity';
import { PriceService } from '../price/price.service';
import { ethers } from 'ethers';
import { scaleQuoteToInternal } from '../common/precision';
import { ConfigService } from '@nestjs/config';

/**
 * Risk Engine Service
 *
 * Implements risk management for perpetual exchange:
 * - Margin checks
 * - Position limits
 * - Leverage limits
 * - Liquidation price calculation
 * - Health factor calculation
 */
@Injectable()
export class RiskEngineService {
  private readonly logger = new Logger(RiskEngineService.name);

  // Maximum leverage allowed (10x)
  private readonly MAX_LEVERAGE = 10;

  // Initial margin ratio (10%)
  private readonly INITIAL_MARGIN_RATIO = 0.1;

  // Maintenance margin ratio (5%)
  private readonly MAINTENANCE_MARGIN_RATIO = 0.05;

  // Liquidation threshold
  private readonly LIQUIDATION_THRESHOLD = 0.025;

  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
  ) {}

  private getRiskPriceSymbol(): string {
    return this.configService.get<string>('RISK_PRICE_SYMBOL', 'ETH');
  }

  /**
   * Check if a new position is within risk limits
   * @param userAddress User address
   * @param positionSize Position size in wei
   * @param leverage Leverage requested
   * @param currentPrice Current asset price
   * @returns Risk check result
   */
  async checkNewPositionRisk(
    userAddress: string,
    positionSize: bigint,
    leverage: number,
    currentPrice: bigint,
  ): Promise<{
    success: boolean;
    allowed: boolean;
    reason?: string;
    data?: {
      requiredMargin: string;
      maxAllowedSize: string;
      liquidationPrice: string;
    };
  }> {
    // Check leverage limit
    if (leverage > this.MAX_LEVERAGE) {
      return {
        success: true,
        allowed: false,
        reason: `Leverage exceeds maximum allowed (${this.MAX_LEVERAGE}x)`,
      };
    }

    if (leverage < 1) {
      return {
        success: true,
        allowed: false,
        reason: 'Leverage must be at least 1x',
      };
    }

    const user = await this.userRepository.findOne({
      where: { address: userAddress.toLowerCase() },
    });

    if (!user) {
      return {
        success: true,
        allowed: false,
        reason: 'User not found',
      };
    }

    const userBalance = scaleQuoteToInternal(BigInt(user.balance));
    const requiredMargin = positionSize / BigInt(leverage);

    // Check if user has sufficient balance
    if (userBalance < requiredMargin) {
      return {
        success: true,
        allowed: false,
        reason: 'Insufficient balance for required margin',
        data: {
          requiredMargin: requiredMargin.toString(),
          maxAllowedSize: (userBalance * BigInt(leverage)).toString(),
          liquidationPrice: '0',
        },
      };
    }

    // Calculate liquidation price
    const liquidationPrice = this.calculateLiquidationPrice(
      positionSize,
      requiredMargin,
      true, // isLong
      currentPrice, // entryPrice
    );

    return {
      success: true,
      allowed: true,
      data: {
        requiredMargin: requiredMargin.toString(),
        maxAllowedSize: (userBalance * BigInt(leverage)).toString(),
        liquidationPrice: liquidationPrice.toString(),
      },
    };
  }

  /**
   * Calculate liquidation price for a position
   * @param size Position size
   * @param margin Collateral amount
   * @param isLong Long or short position
   * @param entryPrice Entry price
   * @returns Liquidation price
   */
  calculateLiquidationPrice(
    size: bigint,
    margin: bigint,
    isLong: boolean,
    entryPrice: bigint,
  ): string {
    if (size === BigInt(0) || entryPrice === BigInt(0)) {
      return '0';
    }

    if (isLong) {
      // Long position liquidation: price drops until margin is depleted
      // Liquidation when: loss = margin
      // loss = size * (entryPrice - liquidationPrice) / entryPrice
      // liquidationPrice = entryPrice * (1 - margin / size)
      const marginRatio = (margin * BigInt(1e18)) / size;
      const liquidationPrice =
        (entryPrice * (BigInt(1e18) - marginRatio)) / BigInt(1e18);

      return liquidationPrice > BigInt(0)
        ? liquidationPrice.toString()
        : BigInt(1).toString();
    } else {
      // Short position liquidation: price rises until margin is depleted
      // liquidationPrice = entryPrice * (1 + margin / size)
      const marginRatio = (margin * BigInt(1e18)) / size;
      const liquidationPrice =
        (entryPrice * (BigInt(1e18) + marginRatio)) / BigInt(1e18);

      return liquidationPrice.toString();
    }
  }

  /**
   * Check if a position should be liquidated
   * @param position Position to check
   * @param currentPrice Current market price
   * @returns Liquidation check result
   */
  async checkLiquidation(
    position: Position,
    currentPrice: bigint,
  ): Promise<{
    shouldLiquidate: boolean;
    healthFactor: string;
    data?: {
      unrealizedPnl: string;
      marginRatio: string;
      distanceToLiquidation: string;
    };
  }> {
    const positionSize = BigInt(position.size);
    const entryPrice = BigInt(position.entryPrice);

    // Calculate unrealized PnL
    const unrealizedPnl = this.calculateUnrealizedPnl(
      positionSize,
      entryPrice,
      currentPrice,
      position.isLong,
    );

    // Calculate health factor
    const healthFactor = this.calculateHealthFactor(
      position,
      currentPrice,
      unrealizedPnl,
    );

    const shouldLiquidate =
      parseFloat(healthFactor) < this.LIQUIDATION_THRESHOLD;

    // Calculate distance to liquidation
    const liquidationPrice = BigInt(position.liquidationPrice || '0');
    const distanceToLiquidation = shouldLiquidate
      ? BigInt(0)
      : currentPrice > liquidationPrice
        ? currentPrice - liquidationPrice
        : liquidationPrice - currentPrice;

    return {
      shouldLiquidate,
      healthFactor,
      data: {
        unrealizedPnl: unrealizedPnl.toString(),
        marginRatio: this.calculateMarginRatio(position, currentPrice),
        distanceToLiquidation: distanceToLiquidation.toString(),
      },
    };
  }

  /**
   * Calculate unrealized PnL for a position
   */
  calculateUnrealizedPnl(
    size: bigint,
    entryPrice: bigint,
    currentPrice: bigint,
    isLong: boolean,
  ): bigint {
    if (isLong) {
      return ((currentPrice - entryPrice) * size) / entryPrice;
    } else {
      return ((entryPrice - currentPrice) * size) / entryPrice;
    }
  }

  /**
   * Calculate health factor
   * Health factor > 1 = healthy
   * Health factor < 1 = at risk of liquidation
   */
  calculateHealthFactor(
    position: Position,
    currentPrice: bigint,
    unrealizedPnl: bigint,
  ): string {
    const positionSize = BigInt(position.size);
    const entryPrice = BigInt(position.entryPrice);

    if (positionSize === BigInt(0) || entryPrice === BigInt(0)) {
      return '0';
    }

    // Notional value
    const notionalValue = (positionSize * currentPrice) / entryPrice;

    if (notionalValue === BigInt(0)) {
      return '999'; // No risk if no position
    }

    // Equity = margin + unrealized PnL - fundingPaid
    const margin = positionSize / BigInt(this.MAX_LEVERAGE);
    const fundingPaid = BigInt(position.fundingPaid || '0');
    const equity = margin + unrealizedPnl - fundingPaid;

    if (equity <= BigInt(0)) {
      return '0'; // Already liquidated
    }

    // Health factor = equity / (notional * maintenance_margin_ratio)
    const healthFactor =
      (equity * BigInt(1e18)) /
      (notionalValue *
        BigInt(Math.floor(this.MAINTENANCE_MARGIN_RATIO * 1e18)));

    return (Number(healthFactor) / 1e18).toFixed(4);
  }

  /**
   * Calculate margin ratio
   */
  calculateMarginRatio(position: Position, currentPrice: bigint): string {
    const unrealizedPnl = this.calculateUnrealizedPnl(
      BigInt(position.size),
      BigInt(position.entryPrice),
      currentPrice,
      position.isLong,
    );

    const margin = BigInt(position.size) / BigInt(this.MAX_LEVERAGE);
    const fundingPaid = BigInt(position.fundingPaid || '0');
    const equity = margin + unrealizedPnl - fundingPaid;

    if (equity <= BigInt(0)) {
      return '0';
    }

    const notionalValue =
      (BigInt(position.size) * currentPrice) / BigInt(position.entryPrice);

    const marginRatio = (equity * BigInt(1e18)) / notionalValue;

    return (Number(marginRatio) / 1e14).toFixed(2) + '%';
  }

  /**
   * Get maximum allowed position size for a user
   */
  async getMaxPositionSize(
    userAddress: string,
    currentPrice: bigint,
  ): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { address: userAddress.toLowerCase() },
    });

    if (!user) {
      return '0';
    }

    const balance = BigInt(user.balance);
    return (balance * BigInt(this.MAX_LEVERAGE) * currentPrice).toString();
  }

  /**
   * Execute liquidation
   * Closes position and transfers remaining balance to insurance fund
   */
  async executeLiquidation(
    positionId: string,
    currentPrice: bigint,
  ): Promise<{
    success: boolean;
    data?: {
      positionId: string;
      liquidationPrice: string;
      remainingBalance: string;
    };
    error?: string;
  }> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
    });

    if (!position) {
      return { success: false, error: 'Position not found' };
    }

    if (!position.isOpen) {
      return { success: false, error: 'Position is already closed' };
    }

    // Verify liquidation is necessary
    const liquidationCheck = await this.checkLiquidation(
      position,
      currentPrice,
    );

    if (!liquidationCheck.shouldLiquidate) {
      return {
        success: false,
        error: 'Position does not meet liquidation criteria',
      };
    }

    // Close position at current price
    position.isOpen = false;
    position.exitPrice = currentPrice.toString();
    position.pnl = liquidationCheck.data?.unrealizedPnl || '0';
    position.closedAt = new Date();

    await this.positionRepository.save(position);

    this.logger.log(
      `Liquidated position ${positionId} at price ${currentPrice.toString()}`,
    );

    return {
      success: true,
      data: {
        positionId,
        liquidationPrice: currentPrice.toString(),
        remainingBalance: '0',
      },
    };
  }

  /**
   * Scan all positions for liquidation candidates
   * Uses price oracle to get current market prices
   */
  async scanForLiquidations(): Promise<{
    success: boolean;
    data?: {
      positionsAtRisk: Array<{
        id: string;
        healthFactor: string;
        liquidationPrice: string;
        currentPrice: string;
        distanceToLiquidation: string;
      }>;
    };
    error?: string;
  }> {
    try {
      const openPositions = await this.positionRepository.find({
        where: { isOpen: true },
        relations: ['user'],
      });

      const positionsAtRisk: Array<{
        id: string;
        healthFactor: string;
        liquidationPrice: string;
        currentPrice: string;
        distanceToLiquidation: string;
      }> = [];

      // Get current price from oracle
      const priceResult = await this.priceService.getPrice(this.getRiskPriceSymbol());
      if (!priceResult.success || !priceResult.data) {
        return {
          success: false,
          error: 'Failed to fetch current price from oracle',
        };
      }

      const currentPrice = ethers.parseUnits(priceResult.data.price, 18);

      for (const position of openPositions) {
        const liquidationCheck = await this.checkLiquidation(
          position,
          currentPrice,
        );

        // Add positions with low health factor (< 1.5 is at risk)
        const healthFactor = parseFloat(liquidationCheck.healthFactor);
        if (healthFactor < 1.5 || liquidationCheck.shouldLiquidate) {
          const liqPrice = BigInt(position.liquidationPrice || '0');
          const distance =
            currentPrice > liqPrice
              ? currentPrice - liqPrice
              : liqPrice - currentPrice;

          positionsAtRisk.push({
            id: position.id,
            healthFactor: liquidationCheck.healthFactor,
            liquidationPrice: position.liquidationPrice || '0',
            currentPrice: priceResult.data!.price,
            distanceToLiquidation: distance.toString(),
          });
        }
      }

      return {
        success: true,
        data: { positionsAtRisk },
      };
    } catch (error) {
      this.logger.error(`Error scanning for liquidations: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-liquidate positions that breach the liquidation threshold
   * Should be called periodically by a cron job or monitoring service
   */
  async autoLiquidate(): Promise<{
    success: boolean;
    data?: {
      liquidated: Array<{
        positionId: string;
        liquidationPrice: string;
        healthFactor: string;
      }>;
      failed: Array<{
        positionId: string;
        reason: string;
      }>;
    };
    error?: string;
  }> {
    const liquidationResult = await this.scanForLiquidations();

    if (!liquidationResult.success) {
      return { success: false, error: liquidationResult.error };
    }

    const liquidated: Array<{
      positionId: string;
      liquidationPrice: string;
      healthFactor: string;
    }> = [];

    const failed: Array<{
      positionId: string;
      reason: string;
    }> = [];

    // Get current price once for all liquidations
    const priceResult = await this.priceService.getPrice(this.getRiskPriceSymbol());
    if (!priceResult.success || !priceResult.data) {
      return {
        success: false,
        error: 'Failed to fetch current price for liquidation',
      };
    }

    const currentPrice = ethers.parseUnits(priceResult.data.price, 18);

    for (const positionAtRisk of liquidationResult.data!.positionsAtRisk) {
      const shouldLiquidate =
        parseFloat(positionAtRisk.healthFactor) < this.LIQUIDATION_THRESHOLD;

      if (shouldLiquidate) {
        const result = await this.executeLiquidation(
          positionAtRisk.id,
          currentPrice,
        );

        if (result.success && result.data) {
          liquidated.push({
            positionId: positionAtRisk.id,
            liquidationPrice: result.data.liquidationPrice,
            healthFactor: positionAtRisk.healthFactor,
          });
        } else {
          failed.push({
            positionId: positionAtRisk.id,
            reason: result.error || 'Unknown error',
          });
        }
      }
    }

    return {
      success: true,
      data: { liquidated, failed },
    };
  }
}
