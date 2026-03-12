import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';

@Injectable()
export class DepositService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
  ) {}

  async deposit(
    address: string,
    amount: string,
    txHash: string,
  ): Promise<{
    success: boolean;
    data?: { txHash: string; status: string; amount: string };
    error?: string;
  }> {
    const user = await this.userRepository.findOne({ where: { address } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if transaction already exists
    const existingDeposit = await this.depositRepository.findOne({
      where: { txHash },
    });
    if (existingDeposit) {
      return { success: false, error: 'Transaction already processed' };
    }

    const deposit = this.depositRepository.create();
    deposit.user = user;
    deposit.amount = amount;
    deposit.txHash = txHash;
    deposit.status = 'confirmed';

    await this.depositRepository.save(deposit);

    return {
      success: true,
      data: {
        txHash,
        status: 'confirmed',
        amount,
      },
    };
  }
}
