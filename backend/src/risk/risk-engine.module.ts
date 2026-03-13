import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from '../entities/Position.entity';
import { User } from '../entities/User.entity';
import { RiskEngineService } from './risk-engine.service';
import { PriceModule } from '../price/price.module';
import { RiskEngineController } from './risk-engine.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Position, User]),
    PriceModule,
  ],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
  controllers: [RiskEngineController],
})
export class RiskEngineModule {}
