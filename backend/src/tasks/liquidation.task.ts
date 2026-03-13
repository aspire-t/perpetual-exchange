import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RiskEngineService } from '../risk/risk-engine.service';

@Injectable()
export class LiquidationTask {
  private readonly logger = new Logger(LiquidationTask.name);

  constructor(private readonly riskEngineService: RiskEngineService) {}

  @Cron('*/10 * * * * *')
  async autoLiquidate() {
    this.logger.debug('Running auto liquidation task...');
    try {
      const result = await this.riskEngineService.autoLiquidate();
      if (result.success && result.data) {
        if (result.data.liquidated.length > 0) {
          this.logger.log(
            `Liquidated ${result.data.liquidated.length} positions`,
          );
        }
        if (result.data.failed.length > 0) {
          this.logger.warn(
            `Failed to liquidate ${result.data.failed.length} positions`,
          );
        }
      } else if (!result.success) {
        this.logger.error(`Liquidation task failed: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error in liquidation task: ${error.message}`);
    }
  }
}
