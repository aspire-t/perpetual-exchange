import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { User } from '../entities/User.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Withdrawal])],
  providers: [WithdrawalService],
  controllers: [WithdrawalController],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
