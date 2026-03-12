import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { HedgingService } from './hedging.service';

@Controller('hedging')
export class HedgingController {
  constructor(private readonly hedgingService: HedgingService) {}

  @Post(':positionId/open')
  async openHedge(@Param('positionId') positionId: string) {
    return this.hedgingService.openHedge(positionId);
  }

  @Post(':hedgeId/close')
  async closeHedge(@Param('hedgeId') hedgeId: string) {
    return this.hedgingService.closeHedge(hedgeId);
  }

  @Get(':hedgeId')
  async getHedge(@Param('hedgeId') hedgeId: string) {
    return this.hedgingService.getHedge(hedgeId);
  }

  @Get('position/:positionId')
  async getPositionHedges(@Param('positionId') positionId: string) {
    return this.hedgingService.getPositionHedges(positionId);
  }
}
