import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';

@Injectable()
export class FaucetService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
  ) {}

  async mint(
    address: string,
    amount: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
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

    // Check if user has minted in the last 24 hours
    const recentDeposit = await this.depositRepository.findOne({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });

    if (recentDeposit) {
      const now = new Date();
      const lastMint = new Date(recentDeposit.createdAt);
      const hoursSinceLastMint =
        (now.getTime() - lastMint.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastMint < 24) {
        return {
          success: false,
          error: `Please wait ${Math.ceil(
            24 - hoursSinceLastMint,
          )} hours before minting again`,
        };
      }
    }

    const deposit = this.depositRepository.create();
    deposit.user = user;
    deposit.amount = amount;
    deposit.txHash = `0x faucet-mint-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    deposit.status = 'confirmed';

    // Update user's balance
    const currentBalance = BigInt(user.balance || '0');
    user.balance = (currentBalance + BigInt(amount)).toString();

    await this.depositRepository.save(deposit);
    await this.userRepository.save(user);

    return { success: true, txHash: deposit.txHash };
  }
}
