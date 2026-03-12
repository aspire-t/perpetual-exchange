import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositService } from './deposit.service';
import { DepositController } from './deposit.controller';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Deposit])],
  providers: [DepositService],
  controllers: [DepositController],
  exports: [DepositService],
})
export class DepositModule {}
