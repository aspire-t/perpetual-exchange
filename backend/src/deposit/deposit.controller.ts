import { Controller, Post, Body } from '@nestjs/common';
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
}
