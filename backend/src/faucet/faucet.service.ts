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
    const user = await this.userRepository.findOne({ where: { address } });
    if (!user) {
      return { success: false, error: 'User not found' };
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

    // Create a deposit record (mock minting)
    const deposit = this.depositRepository.create({
      user,
      amount: BigInt(amount),
      txHash: `0x faucet-mint-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: 'confirmed',
    });

    await this.depositRepository.save(deposit);

    return { success: true, txHash: deposit.txHash };
  }
}
