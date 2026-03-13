import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LiquidationTask } from './liquidation.task';
import { FundingTask } from './funding.task';
import { RiskEngineModule } from '../risk/risk-engine.module';
import { FundingRateModule } from '../funding/funding-rate.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RiskEngineModule,
    FundingRateModule,
  ],
  providers: [LiquidationTask, FundingTask],
})
export class TasksModule {}
