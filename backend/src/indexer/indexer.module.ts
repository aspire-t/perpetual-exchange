import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndexerController } from './indexer.controller';
import { IndexerService } from './indexer.service';
import { EventListenerService } from './event-listener.service';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { ProcessedEvent } from '../entities/ProcessedEvent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Deposit, Withdrawal, ProcessedEvent]),
  ],
  controllers: [IndexerController],
  providers: [IndexerService, EventListenerService],
  exports: [IndexerService],
})
export class IndexerModule {}
