import { Injectable, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Position } from '../entities/Position.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

/**
 * Balance Service
 *
 * Implements atomic balance locking and margin management:
 * - Lock margin atomically when order executes
 * - Release margin when position closes
 * - Real-time available balance calculation
 */
@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    private dataSource: DataSource,
  ) {}

  async getBalance(address: string): Promise<{
    success: boolean;
    data?: {
      totalDeposits: string;
      totalWithdrawals: string;
      totalInPositions: string;
      availableBalance: string;
      balance: string;
    };
    error?: string;
  }> {
    // Normalize address to lowercase for consistent lookup
    const normalizedAddress = address.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });
    if (!user) {
      // Return zero balances if user not found (no deposits/positions yet)
      return {
        success: true,
        data: {
          totalDeposits: '0',
          totalWithdrawals: '0',
          totalInPositions: '0',
          availableBalance: '0',
          balance: '0',
        },
      };
    }

    // Calculate total deposits
    const depositResult = await this.depositRepository
      .createQueryBuilder('deposit')
      .where('deposit.userId = :userId', { userId: user.id })
      .select('SUM(deposit.amount)', 'total')
      .getRawOne();

    // Calculate total confirmed withdrawals (not counting pending)
    const withdrawalResult = await this.withdrawalRepository
      .createQueryBuilder('withdrawal')
      .where('withdrawal.userId = :userId', { userId: user.id })
      .andWhere('withdrawal.status = :status', { status: 'confirmed' })
      .select('SUM(withdrawal.amount)', 'total')
      .getRawOne();

    // Calculate total size in open positions
    const positionResult = await this.positionRepository
      .createQueryBuilder('position')
      .where('position.userId = :userId', { userId: user.id })
      .andWhere('position.isOpen = :isOpen', { isOpen: true })
      .select('SUM(position.size)', 'total')
      .getRawOne();

    const totalDeposits = depositResult.total || '0';
    const totalWithdrawals = withdrawalResult.total || '0';
    const totalInPositions = positionResult.total || '0';

    // Available balance should be taken directly from user.balance source of truth
    // The previous calculation (deposits - withdrawals - positions) missed Realized PnL
    const availableBalance = user.balance;

    return {
      success: true,
      data: {
        totalDeposits,
        totalWithdrawals,
        totalInPositions,
        availableBalance: availableBalance,
        balance: availableBalance, // Alias for frontend compatibility
      },
    };
  }

  /**
   * Lock margin atomically when order executes
   * Deducts margin from user's available balance using database transaction
   */
  async lockMargin(
    userId: string,
    marginAmount: bigint,
  ): Promise<{ success: boolean; error?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        await queryRunner.release();
        return { success: false, error: 'User not found' };
      }

      const currentBalance = BigInt(user.balance);
      if (currentBalance < marginAmount) {
        await queryRunner.release();
        return {
          success: false,
          error: `Insufficient balance: has ${currentBalance.toString()}, needs ${marginAmount.toString()}`,
        };
      }

      user.balance = (currentBalance - marginAmount).toString();
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Margin locked for user ${userId}: ${marginAmount.toString()}`,
      );

      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to lock margin: ${error.message}`);
      return {
        success: false,
        error: `Failed to lock margin: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Release margin when position closes
   * Returns margin + PnL to user's available balance using database transaction
   */
  async releaseMargin(
    userId: string,
    marginAmount: bigint,
    pnl: bigint = BigInt(0),
  ): Promise<{ success: boolean; error?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        await queryRunner.release();
        return { success: false, error: 'User not found' };
      }

      const currentBalance = BigInt(user.balance);
      const totalRelease = marginAmount + pnl;
      user.balance = (currentBalance + totalRelease).toString();
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Margin released for user ${userId}: margin=${marginAmount.toString()}, pnl=${pnl.toString()}, newBalance=${user.balance}`,
      );

      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to release margin: ${error.message}`);
      return {
        success: false,
        error: `Failed to release margin: ${error.message}`,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
