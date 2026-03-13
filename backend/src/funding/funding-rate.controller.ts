import { Controller, Get, Post, Param, Logger } from '@nestjs/common';
import { FundingRateService } from './funding-rate.service';

@Controller('funding')
export class FundingRateController {
  private readonly logger = new Logger(FundingRateController.name);

  constructor(
    private readonly fundingRateService: FundingRateService,
  ) {}

  @Get('rate/:symbol?')
  async getFundingRate(@Param('symbol') symbol?: string) {
    const result = await this.fundingRateService.getCurrentFundingRate(
      symbol || 'ETH',
    );
    return {
      success: true,
      data: {
        symbol: symbol || 'ETH',
        fundingRate: result,
        interval: '8h',
      },
    };
  }

  @Get('history/:symbol?')
  async getFundingHistory(@Param('symbol') symbol?: string) {
    const rates = await this.fundingRateService.getFundingRateHistory(
      symbol || 'ETH',
    );
    return {
      success: true,
      data: rates,
    };
  }

  @Post('apply')
  async applyFunding() {
    const result = await this.fundingRateService.applyFundingToPositions();
    return result;
  }
}
