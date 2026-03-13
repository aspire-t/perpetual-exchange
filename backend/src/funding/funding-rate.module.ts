import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FundingRate } from '../entities/FundingRate.entity';
import { Position } from '../entities/Position.entity';
import { FundingRateService } from './funding-rate.service';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FundingRate, Position]),
    PriceModule,
  ],
  providers: [FundingRateService],
  exports: [FundingRateService],
})
export class FundingRateModule {}
