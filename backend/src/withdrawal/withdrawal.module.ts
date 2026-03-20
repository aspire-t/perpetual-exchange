import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { User } from '../entities/User.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([User, Withdrawal]), AuthModule],
  providers: [WithdrawalService, JwtAuthGuard],
  controllers: [WithdrawalController],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
