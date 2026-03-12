import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

@Injectable()
export class WithdrawalService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
  ) {}

  async withdraw(
    address: string,
    amount: string,
  ): Promise<{
    success: boolean;
    data?: { status: string; amount: string };
    error?: string;
  }> {
    const user = await this.userRepository.findOne({ where: { address } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if user already has a pending withdrawal
    const existingWithdrawal = await this.withdrawalRepository.findOne({
      where: { user: { id: user.id }, status: 'pending' },
    });
    if (existingWithdrawal) {
      return {
        success: false,
        error: 'You already have a pending withdrawal',
      };
    }

    const withdrawal = this.withdrawalRepository.create();
    withdrawal.user = user;
    withdrawal.amount = amount;
    withdrawal.status = 'pending';

    await this.withdrawalRepository.save(withdrawal);

    return {
      success: true,
      data: {
        status: 'pending',
        amount,
      },
    };
  }
}
