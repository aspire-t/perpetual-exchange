import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FundingRate } from '../entities/FundingRate.entity';
import { Position } from '../entities/Position.entity';
import { PriceService } from '../price/price.service';

interface CachedRate {
  rate: string;
  timestamp: number;
}

/**
 * Funding Rate Service
 *
 * Implements funding rate mechanism for perpetual futures.
 * Funding rate is calculated and applied every 8 hours (standard in the industry).
 *
 * Formula:
 * - Long positions pay funding when rate is positive
 * - Short positions receive funding when rate is positive
 * - Funding = position_size * funding_rate
 */
@Injectable()
export class FundingRateService {
  private readonly logger = new Logger(FundingRateService.name);

  // Standard funding interval: 8 hours (28800 seconds)
  private readonly FUNDING_INTERVAL = 28800;

  // Default funding rate (0.01% per 8 hours = 0.0001)
  private readonly DEFAULT_FUNDING_RATE = 0.0001;

  // Cache for funding rates with 60 second TTL
  private readonly rateCache = new Map<string, CachedRate>();
  private readonly CACHE_TTL = 60000;

  constructor(
    @InjectRepository(FundingRate)
    private fundingRateRepository: Repository<FundingRate>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    private readonly priceService: PriceService,
  ) {}

  /**
   * Get current funding rate for a symbol
   * @param symbol Trading pair symbol (e.g., 'ETH')
   * @returns Current funding rate
   */
  async getCurrentFundingRate(symbol: string = 'ETH'): Promise<string> {
    const cached = this.rateCache.get(symbol);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.rate;
    }

    const latestRate = await this.fundingRateRepository.findOne({
      where: { symbol },
      order: { timestamp: 'DESC' },
    });

    const rate = latestRate
      ? latestRate.rate
      : this.DEFAULT_FUNDING_RATE.toString();

    // Cache the rate
    this.rateCache.set(symbol, {
      rate,
      timestamp: now,
    });

    return rate;
  }

  /**
   * Calculate funding rate based on market conditions
   * Uses simplified model: rate based on price premium/discount
   *
   * @param symbol Trading pair symbol
   * @param markPrice Current mark price
   * @param indexPrice Index price (fair value)
   * @returns Calculated funding rate
   */
  calculateFundingRate(
    symbol: string,
    markPrice: bigint,
    indexPrice: bigint,
  ): string {
    // Simplified funding rate calculation
    // In production, this would use more sophisticated models
    if (indexPrice === BigInt(0)) {
      return this.DEFAULT_FUNDING_RATE.toString();
    }

    // Price differential as a fraction
    const differential = Number(markPrice - indexPrice) / Number(indexPrice);

    // Clamp funding rate to reasonable bounds (±0.1% per 8 hours)
    const clampedRate = Math.max(-0.001, Math.min(0.001, differential));

    return clampedRate.toString();
  }

  /**
   * Apply funding to all open positions
   * Called every funding interval (8 hours)
   */
  async applyFundingToPositions(): Promise<{
    success: boolean;
    data?: { positionsUpdated: number; totalFunding: string };
    error?: string;
  }> {
    try {
      const fundingRateStr = await this.getCurrentFundingRate('ETH');
      const fundingRate = parseFloat(fundingRateStr);

      const openPositions = await this.positionRepository.find({
        where: { isOpen: true },
      });

      let totalFunding = BigInt(0);
      let positionsUpdated = 0;

      for (const position of openPositions) {
        const positionSize = BigInt(position.size);

        // Funding amount = position_size * funding_rate
        // For long positions: pay if rate positive, receive if negative
        // For short positions: receive if rate positive, pay if negative
        const fundingAmount = BigInt(
          Math.floor(Number(positionSize) * fundingRate),
        );

        let newFundingPaid = BigInt(position.fundingPaid);

        if (position.isLong) {
          // Long pays funding when rate is positive
          newFundingPaid += fundingAmount;
        } else {
          // Short receives funding when rate is positive
          newFundingPaid -= fundingAmount;
        }

        position.fundingPaid = newFundingPaid.toString();
        await this.positionRepository.save(position);

        totalFunding += fundingAmount;
        positionsUpdated++;
      }

      this.logger.log(
        `Applied funding to ${positionsUpdated} positions. Total funding: ${totalFunding.toString()}`,
      );

      return {
        success: true,
        data: {
          positionsUpdated,
          totalFunding: totalFunding.toString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error applying funding: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate funding for a specific position
   * @param position Position to calculate funding for
   * @param fundingRate Current funding rate
   * @returns Funding amount (positive = pay, negative = receive)
   */
  calculatePositionFunding(position: Position, fundingRate: string): bigint {
    const positionSize = BigInt(position.size);
    const rate = parseFloat(fundingRate);

    let fundingAmount = BigInt(Math.floor(Number(positionSize) * rate));

    // For short positions, invert the funding direction
    if (!position.isLong) {
      fundingAmount = -fundingAmount;
    }

    return fundingAmount;
  }

  /**
   * Save funding rate to database
   * @param symbol Trading pair symbol
   * @param rate Funding rate
   * @param price Price at time of rate calculation
   */
  async saveFundingRate(
    symbol: string,
    rate: string,
    price: string,
  ): Promise<FundingRate> {
    const fundingRate = this.fundingRateRepository.create({
      symbol,
      rate,
      price,
      interval: this.FUNDING_INTERVAL,
    });

    // Invalidate cache for this symbol
    this.rateCache.delete(symbol);

    return this.fundingRateRepository.save(fundingRate);
  }

  /**
   * Get funding rate history
   * @param symbol Trading pair symbol
   * @param limit Number of records to return
   * @returns Array of historical funding rates
   */
  async getFundingRateHistory(
    symbol: string,
    limit: number = 100,
  ): Promise<FundingRate[]> {
    return this.fundingRateRepository.find({
      where: { symbol },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
}
