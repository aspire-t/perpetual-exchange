import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  async handleDeposit(@Body() body: {
    address: string;
    amount: string;
    txHash: string;
    blockNumber: number;
  }) {
    return this.indexerService.processDepositEvent(
      body.address,
      BigInt(body.amount),
      body.txHash,
      body.blockNumber,
    );
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async handleWithdraw(@Body() body: {
    address: string;
    amount: string;
    txHash: string;
    blockNumber: number;
  }) {
    return this.indexerService.processWithdrawEvent(
      body.address,
      BigInt(body.amount),
      body.txHash,
      body.blockNumber,
    );
  }
}
