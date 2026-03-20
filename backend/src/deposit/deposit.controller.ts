import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';
import { DepositService } from './deposit.service';
import { JwtAuthGuard, JwtUserPayload } from '../auth/jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard)
  async faucet(
    @Body() body: { address: string; amount?: string },
    @Req() req: { user: JwtUserPayload },
  ) {
    return await this.depositService.faucet(
      req.user.address,
      body.amount || '100000000', // 100 USDC (6 decimals)
    );
  }
}
