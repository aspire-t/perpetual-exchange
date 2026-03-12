import { Controller, Post, Body } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';

export class WithdrawalDto {
  address: string;
  amount: string;
}

@Controller('withdrawal')
export class WithdrawalController {
  constructor(private withdrawalService: WithdrawalService) {}

  @Post()
  async withdraw(@Body() withdrawalDto: WithdrawalDto) {
    return await this.withdrawalService.withdraw(
      withdrawalDto.address,
      withdrawalDto.amount,
    );
  }
}
