import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Position } from '../entities/Position.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

  async getBalance(
    address: string,
  ): Promise<{ success: boolean; data?: { totalDeposits: string; totalWithdrawals: string; totalInPositions: string; availableBalance: string }; error?: string }> {
    const user = await this.userRepository.findOne({ where: { address } });
    if (!user) {
      return { success: false, error: 'User not found' };
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

    // Available balance = deposits - withdrawals - positions
    const availableBalance = BigInt(totalDeposits) - BigInt(totalWithdrawals) - BigInt(totalInPositions);

    return {
      success: true,
      data: {
        totalDeposits,
        totalWithdrawals,
        totalInPositions,
        availableBalance: availableBalance.toString(),
      },
    };
  }
}
