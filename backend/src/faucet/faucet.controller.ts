import { Controller, Post, Body } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';
import { FaucetService } from './faucet.service';

export class MintDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  amount: string;
}

@Controller('faucet')
export class FaucetController {
  constructor(private faucetService: FaucetService) {}

  @Post('mint')
  async mint(@Body() mintDto: MintDto) {
    return await this.faucetService.mint(mintDto.address, mintDto.amount);
  }
}
