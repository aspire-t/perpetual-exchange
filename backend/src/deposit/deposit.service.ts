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

    // Update user's balance
    const currentBalance = BigInt(user.balance || '0');
    user.balance = (currentBalance + BigInt(amount)).toString();

    await this.depositRepository.save(deposit);
    await this.userRepository.save(user);

    return {
      success: true,
      data: {
        txHash,
        status: 'confirmed',
        amount,
      },
    };
  }

  async getUserDeposits(
    userAddress: string,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const normalizedAddress = userAddress.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      return { success: true, data: [] };
    }

    const deposits = await this.depositRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: deposits.map((deposit) => ({
        id: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount,
        status: deposit.status,
        txHash: deposit.txHash,
        createdAt: deposit.createdAt,
      })),
    };
  }

  /**
   * Dev faucet - fund wallet with test USDC for development
   * Creates user if not exists and adds balance directly
   */
  async faucet(
    address: string,
    amount: string,
  ): Promise<{
    success: boolean;
    data?: { address: string; amount: string; newBalance: string };
    error?: string;
  }> {
    const normalizedAddress = address.toLowerCase();

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({
        address: normalizedAddress,
        balance: '0',
      });
      await this.userRepository.save(user);
    }

    // Add balance directly
    const currentBalance = BigInt(user.balance || '0');
    const newBalance = currentBalance + BigInt(amount);
    user.balance = newBalance.toString();
    await this.userRepository.save(user);

    // Create a faucet deposit record for tracking
    const deposit = this.depositRepository.create();
    deposit.user = user;
    deposit.amount = amount;
    deposit.txHash = `faucet-${Date.now()}`;
    deposit.status = 'confirmed';
    await this.depositRepository.save(deposit);

    return {
      success: true,
      data: {
        address: normalizedAddress,
        amount,
        newBalance: newBalance.toString(),
      },
    };
  }
}
