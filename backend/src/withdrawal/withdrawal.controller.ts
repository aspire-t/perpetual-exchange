import { Controller, Post, Body } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';
import { WithdrawalService } from './withdrawal.service';

export class WithdrawalDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  amount: string;
}

@Controller('withdraw')
export class WithdrawalController {
  constructor(private withdrawalService: WithdrawalService) {}

  @Post()
  async withdraw(@Body() withdrawalDto: WithdrawalDto) {
    return await this.withdrawalService.withdraw(
      withdrawalDto.address,
      withdrawalDto.amount,
    );
  }

  // Alias for backend consistency - /withdrawal also works
  @Post('../withdrawal')
  async withdrawLegacy(@Body() withdrawalDto: WithdrawalDto) {
    return await this.withdrawalService.withdraw(
      withdrawalDto.address,
      withdrawalDto.amount,
    );
  }
}
