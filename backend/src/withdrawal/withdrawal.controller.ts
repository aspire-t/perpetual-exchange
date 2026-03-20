import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WithdrawalService } from './withdrawal.service';
import { JwtAuthGuard, JwtUserPayload } from '../auth/jwt-auth.guard';

export class WithdrawalDto {
  @IsOptional()
  @IsEthereumAddress()
  address?: string;

  @IsString()
  @IsNotEmpty()
  amount: string;
}

@Controller('withdraw')
export class WithdrawalController {
  constructor(private withdrawalService: WithdrawalService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async withdraw(
    @Body() withdrawalDto: WithdrawalDto,
    @Req() req: { user: JwtUserPayload },
  ) {
    return await this.withdrawalService.withdraw(
      req.user.address,
      withdrawalDto.amount,
    );
  }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  async requestWithdrawal(
    @Body() withdrawalDto: WithdrawalDto,
    @Req() req: { user: JwtUserPayload },
  ) {
    return await this.withdrawalService.withdraw(
      req.user.address,
      withdrawalDto.amount,
    );
  }

  // Alias for backend consistency - /withdrawal also works
  @Post('../withdrawal')
  @UseGuards(JwtAuthGuard)
  async withdrawLegacy(
    @Body() withdrawalDto: WithdrawalDto,
    @Req() req: { user: JwtUserPayload },
  ) {
    return await this.withdrawalService.withdraw(
      req.user.address,
      withdrawalDto.amount,
    );
  }

  @Get('user/:address')
  async getUserWithdrawals(@Param('address') address: string) {
    return await this.withdrawalService.getUserWithdrawals(address);
  }
}
