import { Controller, Post, Body } from '@nestjs/common';
import { IndexerService } from './indexer.service';

@Controller('indexer')
export class IndexerController {
  constructor(private readonly indexerService: IndexerService) {}

  @Post('deposit')
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
