import { Controller, Get, Post, Param, Body, Logger } from '@nestjs/common';
import { HedgingService } from './hedging.service';

/**
 * Hedging Controller
 *
 * Endpoints for managing hedges on Hyperliquid:
 * - POST /hedging/:positionId/open - Open a hedge for a position
 * - POST /hedging/:hedgeId/close - Close an existing hedge
 * - GET /hedging/:hedgeId - Get hedge details
 * - GET /hedging/position/:positionId - Get all hedges for a position
 * - POST /hedging/auto/:positionId - Auto-hedge a position
 * - GET /hedging/sync/:hedgeId - Sync hedge status with Hyperliquid
 * - GET /hedging/volume - Get total hedged volume
 */
@Controller('hedging')
export class HedgingController {
  private readonly logger = new Logger(HedgingController.name);

  constructor(private readonly hedgingService: HedgingService) {}

  @Post(':positionId/open')
  async openHedge(@Param('positionId') positionId: string) {
    this.logger.log(`Opening hedge for position: ${positionId}`);
    return this.hedgingService.openHedge(positionId);
  }

  @Post(':hedgeId/close')
  async closeHedge(@Param('hedgeId') hedgeId: string) {
    this.logger.log(`Closing hedge: ${hedgeId}`);
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

  @Post('auto/:positionId')
  async autoHedge(@Param('positionId') positionId: string) {
    this.logger.log(`Auto-hedge triggered for position: ${positionId}`);
    return this.hedgingService.autoHedge(positionId);
  }

  @Post('sync/:hedgeId')
  async syncHedgeStatus(@Param('hedgeId') hedgeId: string) {
    this.logger.log(`Syncing hedge status: ${hedgeId}`);
    return this.hedgingService.syncHedgeStatus(hedgeId);
  }

  @Get('volume/total')
  async getTotalHedgedVolume() {
    return this.hedgingService.getTotalHedgedVolume();
  }
}
