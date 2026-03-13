import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FaucetModule } from './faucet/faucet.module';
import { BalanceModule } from './balance/balance.module';
import { DepositModule } from './deposit/deposit.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';
import { IndexerModule } from './indexer/indexer.module';
import { OrderModule } from './order/order.module';
import { PriceModule } from './price/price.module';
import { PositionModule } from './position/position.module';
import { User } from './entities/User.entity';
import { Deposit } from './entities/Deposit.entity';
import { Withdrawal } from './entities/Withdrawal.entity';
import { Position } from './entities/Position.entity';
import { ProcessedEvent } from './entities/ProcessedEvent.entity';
import { Order } from './entities/Order.entity';
import { Hedge } from './entities/Hedge.entity';
import { FundingRate } from './entities/FundingRate.entity';
import { Kline } from './entities/Kline.entity';
import { HedgingModule } from './hedging/hedging.module';
import { FundingRateModule } from './funding/funding-rate.module';
import { RiskEngineModule } from './risk/risk-engine.module';
import { KlineModule } from './kline/kline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get('DATABASE_PATH', 'dev.db'),
        dropSchema: configService.get('NODE_ENV') === 'test',
        entities: [
          User,
          Deposit,
          Withdrawal,
          Position,
          ProcessedEvent,
          Order,
          Hedge,
          FundingRate,
          Kline,
        ],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    FaucetModule,
    BalanceModule,
    DepositModule,
    WithdrawalModule,
    IndexerModule,
    OrderModule,
    PriceModule,
    PositionModule,
    HedgingModule,
    FundingRateModule,
    RiskEngineModule,
    KlineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
