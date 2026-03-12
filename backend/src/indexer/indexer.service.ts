import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { ProcessedEvent } from '../entities/ProcessedEvent.entity';

@Injectable()
export class IndexerService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(ProcessedEvent)
    private processedEventRepository: Repository<ProcessedEvent>,
  ) {}

  async processDepositEvent(
    userAddress: string,
    amount: bigint,
    txHash: string,
    blockNumber: number,
  ): Promise<{
    success: boolean;
    data?: { txHash: string; status: string; amount: string };
    error?: string;
    skipped?: boolean;
    reason?: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { address: userAddress },
    });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if event already processed (idempotency)
    const existingEvent = await this.processedEventRepository.findOne({
      where: { eventTxHash: txHash },
    });
    if (existingEvent) {
      return {
        success: true,
        skipped: true,
        reason: 'Event already processed',
      };
    }

    // Check if deposit already exists (idempotency)
    const existingDeposit = await this.depositRepository.findOne({
      where: { txHash },
    });
    if (existingDeposit) {
      return {
        success: true,
        skipped: true,
        reason: 'Deposit already exists',
      };
    }

    const deposit = this.depositRepository.create();
    deposit.user = user;
    deposit.amount = amount.toString();
    deposit.txHash = txHash;
    deposit.status = 'confirmed';

    const processedEvent = this.processedEventRepository.create();
    processedEvent.eventTxHash = txHash;
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = blockNumber;
    processedEvent.userId = user.id;
    processedEvent.amount = amount.toString();

    await this.depositRepository.save(deposit);
    await this.processedEventRepository.save(processedEvent);

    return {
      success: true,
      data: {
        txHash,
        status: 'confirmed',
        amount: amount.toString(),
      },
    };
  }

  async processWithdrawEvent(
    userAddress: string,
    amount: bigint,
    txHash: string,
    blockNumber: number,
  ): Promise<{
    success: boolean;
    data?: { status: string; amount: string };
    error?: string;
    skipped?: boolean;
    reason?: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { address: userAddress },
    });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if event already processed (idempotency)
    const existingEvent = await this.processedEventRepository.findOne({
      where: { eventTxHash: txHash },
    });
    if (existingEvent) {
      return {
        success: true,
        skipped: true,
        reason: 'Event already processed',
      };
    }

    const withdrawal = this.withdrawalRepository.create();
    withdrawal.user = user;
    withdrawal.amount = amount.toString();
    withdrawal.status = 'approved';
    withdrawal.txHash = txHash;

    const processedEvent = this.processedEventRepository.create();
    processedEvent.eventTxHash = txHash;
    processedEvent.eventName = 'Withdraw';
    processedEvent.blockNumber = blockNumber;
    processedEvent.userId = user.id;
    processedEvent.amount = amount.toString();

    await this.withdrawalRepository.save(withdrawal);
    await this.processedEventRepository.save(processedEvent);

    return {
      success: true,
      data: {
        status: 'approved',
        amount: amount.toString(),
      },
    };
  }
}
