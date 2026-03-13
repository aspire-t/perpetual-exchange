import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
} from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';

@Controller('risk')
export class RiskEngineController {
  private readonly logger = new Logger(RiskEngineController.name);

  constructor(private readonly riskEngineService: RiskEngineService) {}

  @Get('check/:address')
  async checkPositionRisk(
    @Param('address') address: string,
    @Query('size') size?: string,
    @Query('leverage') leverage?: string,
  ) {
    if (!size || !leverage) {
      return {
        success: false,
        error: 'Size and leverage are required',
      };
    }

    const result = await this.riskEngineService.checkNewPositionRisk(
      address,
      BigInt(size),
      parseInt(leverage),
      BigInt(0), // Will be fetched from price service
    );

    return result;
  }

  @Get('liquidation/:positionId')
  async checkLiquidation(@Param('positionId') positionId: string) {
    const position = await this.riskEngineService['positionRepository'].findOne(
      {
        where: { id: positionId },
      },
    );

    if (!position) {
      return {
        success: false,
        error: 'Position not found',
      };
    }

    // Get current price from oracle
    const priceResult =
      await this.riskEngineService['priceService'].getPrice('ETH');
    if (!priceResult.success || !priceResult.data) {
      return {
        success: false,
        error: 'Failed to fetch price from oracle',
      };
    }

    const result = await this.riskEngineService.checkLiquidation(
      position,
      BigInt(priceResult.data.price),
    );

    return {
      success: true,
      data: {
        positionId,
        shouldLiquidate: result.shouldLiquidate,
        healthFactor: result.healthFactor,
        unrealizedPnl: result.data?.unrealizedPnl,
        marginRatio: result.data?.marginRatio,
        distanceToLiquidation: result.data?.distanceToLiquidation,
        currentPrice: priceResult.data.price,
      },
    };
  }

  @Get('liquidations')
  async scanLiquidations() {
    const result = await this.riskEngineService.scanForLiquidations();
    return result;
  }

  @Post('liquidate/:positionId')
  async executeLiquidation(@Param('positionId') positionId: string) {
    // Get current price from oracle
    const priceResult =
      await this.riskEngineService['priceService'].getPrice('ETH');
    if (!priceResult.success || !priceResult.data) {
      return {
        success: false,
        error: 'Failed to fetch price from oracle',
      };
    }

    const result = await this.riskEngineService.executeLiquidation(
      positionId,
      BigInt(priceResult.data.price),
    );

    return result;
  }

  @Post('liquidate-all')
  async autoLiquidate() {
    const result = await this.riskEngineService.autoLiquidate();
    return result;
  }

  @Get('max-size/:address')
  async getMaxPositionSize(@Param('address') address: string) {
    const maxSize = await this.riskEngineService.getMaxPositionSize(
      address,
      BigInt(0), // Will be fetched from price service
    );
    return {
      success: true,
      data: { maxSize },
    };
  }
}
