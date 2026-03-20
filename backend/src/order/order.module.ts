import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from '../entities/Order.entity';
import { User } from '../entities/User.entity';
import { Position } from '../entities/Position.entity';
import { BalanceService } from '../balance/balance.service';
import { PositionModule } from '../position/position.module';
import { HedgingModule } from '../hedging/hedging.module';
import { PriceModule } from '../price/price.module';
import { RiskEngineModule } from '../risk/risk-engine.module';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { Hedge } from '../entities/Hedge.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      User,
      Position,
      Deposit,
      Withdrawal,
      Hedge,
    ]),
    PositionModule,
    HedgingModule,
    PriceModule,
    RiskEngineModule,
    AuthModule,
  ],
  controllers: [OrderController],
  providers: [OrderService, BalanceService, JwtAuthGuard],
  exports: [OrderService],
})
export class OrderModule {}
