import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';

@Module({
  imports: [HttpModule],
  providers: [PriceService],
  controllers: [PriceController],
  exports: [PriceService],
})
export class PriceModule {}
