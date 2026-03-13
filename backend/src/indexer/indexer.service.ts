import { Injectable, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { ProcessedEvent } from '../entities/ProcessedEvent.entity';

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(ProcessedEvent)
    private processedEventRepository: Repository<ProcessedEvent>,
    private dataSource: DataSource,
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { address: userAddress },
      });
      if (!user) {
        await queryRunner.release();
        return { success: false, error: 'User not found' };
      }

      // Check if event already processed (idempotency)
      const existingEvent = await queryRunner.manager.findOne(ProcessedEvent, {
        where: { eventTxHash: txHash },
      });
      if (existingEvent) {
        await queryRunner.release();
        return {
          success: true,
          skipped: true,
          reason: 'Event already processed',
        };
      }

      // Check if deposit already exists (idempotency)
      const existingDeposit = await queryRunner.manager.findOne(Deposit, {
        where: { txHash },
      });
      if (existingDeposit) {
        await queryRunner.release();
        return {
          success: true,
          skipped: true,
          reason: 'Deposit already exists',
        };
      }

      const deposit = queryRunner.manager.create(Deposit);
      deposit.user = user;
      deposit.amount = amount.toString();
      deposit.txHash = txHash;
      deposit.status = 'confirmed';

      const processedEvent = queryRunner.manager.create(ProcessedEvent);
      processedEvent.eventTxHash = txHash;
      processedEvent.eventName = 'Deposit';
      processedEvent.blockNumber = blockNumber;
      processedEvent.userId = user.id;
      processedEvent.amount = amount.toString();

      // Update user balance
      const currentBalance = BigInt(user.balance || '0');
      user.balance = (currentBalance + amount).toString();
      await queryRunner.manager.save(user);

      await queryRunner.manager.save(deposit);
      await queryRunner.manager.save(processedEvent);

      await queryRunner.commitTransaction();

      return {
        success: true,
        data: {
          txHash,
          status: 'confirmed',
          amount: amount.toString(),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        error: `Failed to process deposit event: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { address: userAddress },
      });
      if (!user) {
        await queryRunner.release();
        return { success: false, error: 'User not found' };
      }

      // Check if event already processed (idempotency)
      const existingEvent = await queryRunner.manager.findOne(ProcessedEvent, {
        where: { eventTxHash: txHash },
      });
      if (existingEvent) {
        await queryRunner.release();
        return {
          success: true,
          skipped: true,
          reason: 'Event already processed',
        };
      }

      const withdrawal = queryRunner.manager.create(Withdrawal);
      withdrawal.user = user;
      withdrawal.amount = amount.toString();
      withdrawal.status = 'approved';
      withdrawal.txHash = txHash;

      const processedEvent = queryRunner.manager.create(ProcessedEvent);
      processedEvent.eventTxHash = txHash;
      processedEvent.eventName = 'Withdraw';
      processedEvent.blockNumber = blockNumber;
      processedEvent.userId = user.id;
      processedEvent.amount = amount.toString();

      // Update user locked balance (deduct)
      const lockedBalance = BigInt(user.locked || '0');
      if (lockedBalance < amount) {
        this.logger.error(
          `User ${user.address} locked balance ${lockedBalance} is less than withdrawal amount ${amount}`,
        );
      }
      // Deduct anyway as the event happened on chain
      user.locked = (lockedBalance - amount).toString();
      await queryRunner.manager.save(user);

      await queryRunner.manager.save(withdrawal);
      await queryRunner.manager.save(processedEvent);

      await queryRunner.commitTransaction();

      return {
        success: true,
        data: {
          status: 'approved',
          amount: amount.toString(),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return {
        success: false,
        error: `Failed to process withdraw event: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
