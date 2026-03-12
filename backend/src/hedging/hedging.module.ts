import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { HedgingService } from './hedging.service';
import { Hedge } from '../entities/Hedge.entity';
import { Position } from '../entities/Position.entity';
import { PriceModule } from '../price/price.module';
import { HedgingController } from './hedging.controller';
import { HyperliquidClient } from './hyperliquid.client';

@Module({
  imports: [TypeOrmModule.forFeature([Hedge, Position]), PriceModule, HttpModule],
  providers: [HedgingService, HyperliquidClient],
  exports: [HedgingService, HyperliquidClient],
  controllers: [HedgingController],
})
export class HedgingModule {}
