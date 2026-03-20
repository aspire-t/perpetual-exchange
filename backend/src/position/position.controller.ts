import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IsEthereumAddress,
  IsNotEmpty,
  IsString,
  IsBoolean,
} from 'class-validator';
import { PositionService } from './position.service';
import { JwtAuthGuard, JwtUserPayload } from '../auth/jwt-auth.guard';

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
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async openPosition(
    @Body() body: OpenPositionDto,
    @Req() req: { user: JwtUserPayload },
  ) {
    return this.positionService.openPosition(
      req.user.address,
      BigInt(body.size),
      BigInt(body.entryPrice),
      body.isLong,
    );
  }

  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  async closePosition(
    @Param('id') id: string,
    @Req() req: { user: JwtUserPayload },
  ) {
    const positionResult = await this.positionService.getPosition(id);
    if (!positionResult.success || !positionResult.data) {
      return positionResult;
    }
    if (positionResult.data.userId !== req.user.sub) {
      throw new UnauthorizedException('Position does not belong to authenticated user');
    }
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
