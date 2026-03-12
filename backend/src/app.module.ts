import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FaucetModule } from './faucet/faucet.module';
import { BalanceModule } from './balance/balance.module';
import { DepositModule } from './deposit/deposit.module';
import { WithdrawalModule } from './withdrawal/withdrawal.module';
import { IndexerModule } from './indexer/indexer.module';
import { User } from './entities/User.entity';
import { Deposit } from './entities/Deposit.entity';
import { Withdrawal } from './entities/Withdrawal.entity';
import { Position } from './entities/Position.entity';
import { ProcessedEvent } from './entities/ProcessedEvent.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'sqlite',
        database: ':memory:',
        dropSchema: true,
        entities: [User, Deposit, Withdrawal, Position, ProcessedEvent],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    FaucetModule,
    BalanceModule,
    DepositModule,
    WithdrawalModule,
    IndexerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
