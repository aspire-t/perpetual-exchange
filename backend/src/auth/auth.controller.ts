import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Get,
  Query,
} from '@nestjs/common';
import { IsEthereumAddress, IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { AuthService } from './auth.service';

export class LoginDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  nonce: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsNumber()
  @IsNotEmpty()
  issuedAt: number;

  @IsString()
  @IsNotEmpty()
  statement: string;
}

export class NonceQueryDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.login(
        loginDto.address,
        loginDto.signature,
        loginDto.nonce,
        loginDto.issuedAt,
        loginDto.statement,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid signature');
    }
  }

  @Get('nonce')
  async getNonce(@Query() query: NonceQueryDto) {
    return this.authService.getNonce(query.address);
  }
}
