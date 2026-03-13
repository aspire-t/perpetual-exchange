import { Controller, Get, Query } from '@nestjs/common';
import { KlineService } from './kline.service';

const VALID_TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

@Controller('klines')
export class KlineController {
  constructor(private klineService: KlineService) {}

  @Get()
  async getKlines(
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: string,
    @Query('count') count: number = 100,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!VALID_TIMEFRAMES.includes(timeframe)) {
      return {
        success: false,
        error: `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`,
      };
    }

    const klines = await this.klineService.generateKlines(symbol, timeframe, count);

    return {
      success: true,
      data: klines,
    };
  }
}
