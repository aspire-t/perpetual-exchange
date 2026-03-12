import { Controller, Get, Query } from '@nestjs/common';
import { BalanceService } from './balance.service';

export class BalanceResponseDto {
  success: boolean;
  data?: {
    totalDeposits: string;
    totalWithdrawals: string;
    totalInPositions: string;
    availableBalance: string;
  };
  error?: string;
}

@Controller('balance')
export class BalanceController {
  constructor(private balanceService: BalanceService) {}

  @Get()
  async getBalance(@Query('address') address: string): Promise<BalanceResponseDto> {
    return await this.balanceService.getBalance(address);
  }
}
