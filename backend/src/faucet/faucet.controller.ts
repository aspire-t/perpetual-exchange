import { Controller, Post, Body } from '@nestjs/common';
import { FaucetService } from './faucet.service';

export class MintDto {
  address: string;
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
