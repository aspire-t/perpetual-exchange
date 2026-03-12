import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IsEthereumAddress,
  IsNotEmpty,
  IsString,
  IsBoolean,
} from 'class-validator';
import { PositionService } from './position.service';

export class OpenPositionDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsNotEmpty()
  entryPrice: string;

  @IsBoolean()
  @IsNotEmpty()
  isLong: boolean;
}

export class PositionResponseDto {
  success: boolean;
  data?: {
    id: string;
    address: string;
    size: string;
    entryPrice: string;
    isLong: boolean;
  };
  error?: string;
}

@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  async openPosition(@Body() body: OpenPositionDto) {
    return this.positionService.openPosition(
      body.address,
      BigInt(body.size),
      BigInt(body.entryPrice),
      body.isLong,
    );
  }

  @Post(':id/close')
  async closePosition(@Param('id') id: string) {
    return this.positionService.closePosition(id);
  }

  @Get(':id')
  async getPosition(@Param('id') id: string) {
    return this.positionService.getPosition(id);
  }

  @Get('user/:address')
  async getUserPositions(
    @Param('address') address: string,
    @Query('isOpen') isOpen?: string,
  ) {
    // Default to open positions only if isOpen param is not provided
    const filterOpen = isOpen !== 'false';
    return this.positionService.getUserPositions(address, filterOpen);
  }
}
