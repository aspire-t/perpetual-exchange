import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  IsEthereumAddress,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { OrderService } from './order.service';
import { OrderType, OrderSide, OrderStatus } from '../entities/Order.entity';

export class CreateOrderDto {
  @IsEthereumAddress()
  @IsNotEmpty()
  address: string;

  @IsEnum(OrderType)
  @IsNotEmpty()
  type: OrderType;

  @IsEnum(OrderSide)
  @IsNotEmpty()
  side: OrderSide;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsString()
  @IsOptional()
  limitPrice?: string;

  @IsString()
  @IsOptional()
  leverage?: string;
}

export class OrderResponseDto {
  success: boolean;
  data?: {
    id: string;
    address: string;
    type: OrderType;
    side: OrderSide;
    symbol: string;
    size: string;
    status: OrderStatus;
  };
  error?: string;
}

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() body: CreateOrderDto) {
    return this.orderService.executeOrder(
      body.address,
      body.symbol,
      body.side,
      BigInt(body.size),
      BigInt(body.leverage || '1'),
    );
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }

  @Get('user/:address')
  async getUserOrders(
    @Param('address') address: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.orderService.getUserOrders(address, page || 1, limit || 50);
  }

  @Post(':id/cancel')
  async cancelOrder(@Param('id') id: string) {
    return this.orderService.cancelOrder(id);
  }
}
