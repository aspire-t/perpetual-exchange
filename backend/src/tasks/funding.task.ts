import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FundingRateService } from '../funding/funding-rate.service';

@Injectable()
export class FundingTask {
  private readonly logger = new Logger(FundingTask.name);

  constructor(private readonly fundingRateService: FundingRateService) {}

  @Cron('0 * * * *')
  async applyFundingToPositions() {
    this.logger.debug('Running funding rate application task...');
    try {
      const result = await this.fundingRateService.applyFundingToPositions();
      if (result.success && result.data) {
        this.logger.log(
          `Applied funding to ${result.data.positionsUpdated} positions. Total funding: ${result.data.totalFunding}`,
        );
      } else if (!result.success) {
        this.logger.error(`Funding task failed: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error in funding task: ${error.message}`);
    }
  }
}
