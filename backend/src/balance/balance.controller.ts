import { Controller, Get, Query, Param } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty } from 'class-validator';
import { BalanceService } from './balance.service';

export class BalanceQueryDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;
}

export class BalanceResponseDto {
  success: boolean;
  data?: {
    totalDeposits: string;
    totalWithdrawals: string;
    totalInPositions: string;
    availableBalance: string;
    balance: string; // Alias for frontend compatibility
  };
  error?: string;
}

@Controller('balance')
export class BalanceController {
  constructor(private balanceService: BalanceService) {}

  @Get()
  async getBalance(
    @Query() query: BalanceQueryDto,
  ): Promise<BalanceResponseDto> {
    return await this.balanceService.getBalance(query.address);
  }

  @Get(':address')
  async getBalanceByAddress(
    @Param('address') address: string,
  ): Promise<BalanceResponseDto> {
    return await this.balanceService.getBalance(address);
  }
}
