import { Controller, Get, Param, Query } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get(':coin')
  async getPrice(@Param('coin') coin: string) {
    return this.priceService.getPrice(coin);
  }

  @Get()
  async getPrices(@Query('coin') coin?: string) {
    // Default to ETH for frontend compatibility when no coin specified
    const targetCoin = coin || 'ETH';
    return this.priceService.getPrice(targetCoin);
  }
}
