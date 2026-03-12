import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaucetService } from './faucet.service';
import { FaucetController } from './faucet.controller';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Deposit])],
  providers: [FaucetService],
  controllers: [FaucetController],
  exports: [FaucetService],
})
export class FaucetModule {}
