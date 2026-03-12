import { Controller, Post, Body } from '@nestjs/common';
import { DepositService } from './deposit.service';

export class DepositDto {
  address: string;
  amount: string;
  txHash: string;
}

@Controller('deposit')
export class DepositController {
  constructor(private depositService: DepositService) {}

  @Post()
  async deposit(@Body() depositDto: DepositDto) {
    return await this.depositService.deposit(
      depositDto.address,
      depositDto.amount,
      depositDto.txHash,
    );
  }
}
