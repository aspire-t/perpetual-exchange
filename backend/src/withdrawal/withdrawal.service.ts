import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { User } from '../entities/User.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);
  private wallet: ethers.Wallet;
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private vaultAddress: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    const rpcUrl = this.configService.get<string>('RPC_URL', 'http://localhost:8545');
    this.vaultAddress = this.configService.get<string>(
      'VAULT_CONTRACT_ADDRESS',
      '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Default Hardhat deployment address
    );
    const privateKey = this.configService.get<string>('HYPERLIQUID_PRIVATE_KEY') || this.configService.get<string>('OPERATOR_PRIVATE_KEY');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    } else {
      this.logger.warn('No private key found for withdrawal signing. Withdrawals will fail.');
    }

    // Minimal ABI for Nonces and Withdraw
    const abi = [
      'function nonces(address owner) view returns (uint256)',
      'function withdrawWithSignature(address user, uint256 amount, uint256 deadline, bytes calldata signature)',
    ];
    this.contract = new ethers.Contract(this.vaultAddress, abi, this.provider);
  }

  async generateWithdrawalSignature(
    userAddress: string,
    amount: string,
    nonce: number,
  ): Promise<{ signature: string; expiry: number }> {
    if (!this.wallet) {
      throw new Error('Operator wallet not configured');
    }

    const chainId = (await this.provider.getNetwork()).chainId;
    const domain = {
      name: 'PerpetualExchange',
      version: '1',
      chainId: Number(chainId),
      verifyingContract: this.vaultAddress,
    };

    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour expiry

    const types = {
      Withdraw: [
        { name: 'user', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const value = {
      user: userAddress,
      amount: amount,
      nonce: nonce,
      deadline: expiry,
    };

    const signature = await this.wallet.signTypedData(domain, types, value);
    return { signature, expiry };
  }

  async requestWithdrawal(
    userId: string,
    amount: string,
  ): Promise<{
    signature: string;
    nonce: number;
    expiry: number;
    amount: string;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const balanceBigInt = BigInt(user.balance);
      const amountBigInt = BigInt(amount);

      if (balanceBigInt < amountBigInt) {
        throw new BadRequestException('Insufficient balance');
      }

      // Update balances
      user.balance = (balanceBigInt - amountBigInt).toString();
      user.locked = (BigInt(user.locked || '0') + amountBigInt).toString();

      await queryRunner.manager.save(user);

      // Create withdrawal record
      const withdrawal = queryRunner.manager.create(Withdrawal);
      withdrawal.user = user;
      withdrawal.amount = amount;
      withdrawal.status = 'pending'; // Waiting for user to submit transaction
      await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();

      // Get nonce from contract
      let nonce = 0;
      try {
        nonce = await this.contract.nonces(user.address);
        nonce = Number(nonce);
      } catch (error) {
        this.logger.error(`Failed to fetch nonce from contract: ${error.message}`);
        // Fallback or fail? If contract fetch fails, signature will be invalid if nonce is wrong.
        // We should probably fail or assume 0 if dev/mock.
        // For now, let's proceed but log error.
        // If it fails, maybe we can't generate a valid signature.
        // But if it's a mock environment without contract deployed, we might want to allow testing?
        // No, requirement says "Secure withdrawal".
        throw new Error('Failed to fetch nonce from contract');
      }

      // Generate signature
      const { signature, expiry } = await this.generateWithdrawalSignature(
        user.address,
        amount,
        nonce,
      );

      // Update withdrawal with signature details if needed? 
      // We don't have columns for signature/nonce/expiry in Withdrawal entity usually, but maybe we should?
      // For now, just return it.

      return {
        signature,
        nonce,
        expiry,
        amount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Legacy/Simple withdraw method - updated to use requestWithdrawal logic or kept for backward compatibility?
  // The user requirement says "Implement requestWithdrawal".
  // The existing controller uses `withdraw`. I should probably update `withdraw` to call `requestWithdrawal`.
  
  async withdraw(
    address: string,
    amount: string,
  ): Promise<{
    success: boolean;
    data?: { status: string; amount: string; signature?: string; nonce?: number; expiry?: number };
    error?: string;
  }> {
    try {
      const user = await this.userRepository.findOne({ where: { address } });
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const result = await this.requestWithdrawal(user.id, amount);
      
      return {
        success: true,
        data: {
          status: 'pending',
          amount: result.amount,
          signature: result.signature,
          nonce: result.nonce,
          expiry: result.expiry
        },
      };
    } catch (error) {
      this.logger.error(`Withdrawal failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getUserWithdrawals(
    userAddress: string,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const normalizedAddress = userAddress.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      return { success: true, data: [] };
    }

    const withdrawals = await this.withdrawalRepository.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: withdrawals.map((withdrawal) => ({
        id: withdrawal.id,
        userId: withdrawal.userId,
        amount: withdrawal.amount,
        status: withdrawal.status,
        txHash: withdrawal.txHash,
        createdAt: withdrawal.createdAt,
      })),
    };
  }
}
