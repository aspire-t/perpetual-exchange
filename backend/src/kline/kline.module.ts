import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Kline } from '../entities/Kline.entity';
import { KlineService } from './kline.service';
import { KlineController } from './kline.controller';
import { PriceModule } from '../price/price.module';

@Module({
  imports: [TypeOrmModule.forFeature([Kline]), PriceModule],
  controllers: [KlineController],
  providers: [KlineService],
  exports: [KlineService],
})
export class KlineModule {}
