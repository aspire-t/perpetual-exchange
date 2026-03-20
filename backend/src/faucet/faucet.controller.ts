import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';
import { FaucetService } from './faucet.service';
import { JwtAuthGuard, JwtUserPayload } from '../auth/jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard)
  async mint(
    @Body() mintDto: MintDto,
    @Req() req: { user: JwtUserPayload },
  ) {
    return await this.faucetService.mint(req.user.address, mintDto.amount);
  }
}
