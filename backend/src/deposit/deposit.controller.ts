import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';
import { DepositService } from './deposit.service';

export class DepositDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
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

  @Get('user/:address')
  async getUserDeposits(@Param('address') address: string) {
    return await this.depositService.getUserDeposits(address);
  }

  /**
   * Dev faucet - fund wallet with test USDC for development
   * Only available in development environment
   */
  @Post('faucet')
  async faucet(@Body() body: { address: string; amount?: string }) {
    return await this.depositService.faucet(
      body.address,
      body.amount || '100000000', // 100 USDC (6 decimals)
    );
  }
}
