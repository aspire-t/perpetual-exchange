import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { IndexerService } from './indexer.service';
import { getRequiredVaultAddress } from '../common/vault-address.config';

// Vault contract ABI - only the events we need
const VAULT_ABI = [
  'event Deposit(address indexed user, uint256 amount)',
  'event Withdraw(address indexed user, uint256 amount)',
];

@Injectable()
export class EventListenerService implements OnModuleInit {
  private readonly logger = new Logger(EventListenerService.name);
  private provider: ethers.Provider;
  private contract: ethers.Contract;

  constructor(
    private readonly configService: ConfigService,
    private readonly indexerService: IndexerService,
  ) {
    const rpcUrl = this.configService.get<string>('RPC_URL', 'http://localhost:8545');
    const contractAddress = getRequiredVaultAddress(this.configService);

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, VAULT_ABI, this.provider);
  }

  async onModuleInit() {
    this.logger.log('Starting event listener...');

    const configuredStartBlock = Number(
      this.configService.get<string>('START_BLOCK', '0'),
    );
    const resumeBlock =
      await this.indexerService.getResumeBlock(configuredStartBlock);
    const latestBlock = await this.provider.getBlockNumber();
    if (resumeBlock <= latestBlock) {
      const historicalDeposits = await this.contract.queryFilter(
        'Deposit',
        resumeBlock,
        latestBlock,
      );
      for (const event of historicalDeposits) {
        await this.handleDepositEvent({
          args: {
            user: event.args.user as string,
            amount: event.args.amount as bigint,
          },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      }

      const historicalWithdrawals = await this.contract.queryFilter(
        'Withdraw',
        resumeBlock,
        latestBlock,
      );
      for (const event of historicalWithdrawals) {
        await this.handleWithdrawEvent({
          args: {
            user: event.args.user as string,
            amount: event.args.amount as bigint,
          },
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      }
    }

    // Listen for Deposit events
    this.contract.on('Deposit', async (user, amount, event) => {
      await this.handleDepositEvent({
        args: {
          user: user as string,
          amount: amount as bigint,
        },
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
      });
    });

    // Listen for Withdraw events
    this.contract.on('Withdraw', async (user, amount, event) => {
      await this.handleWithdrawEvent({
        args: {
          user: user as string,
          amount: amount as bigint,
        },
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber,
      });
    });

    this.logger.log('Event listener started successfully');
  }

  async handleDepositEvent(event: {
    args: {
      user: string;
      amount: bigint;
    };
    transactionHash: string;
    blockNumber: number;
  }) {
    try {
      this.logger.log(`Processing Deposit event: ${event.transactionHash}`);

      await this.indexerService.processDepositEvent(
        event.args.user,
        event.args.amount,
        event.transactionHash,
        event.blockNumber,
      );

      this.logger.log(`Deposit event processed: ${event.transactionHash}`);
    } catch (error) {
      this.logger.error(
        `Error processing Deposit event ${event.transactionHash}: ${error.message}`,
        error.stack,
      );
    }
  }

  async handleWithdrawEvent(event: {
    args: {
      user: string;
      amount: bigint;
    };
    transactionHash: string;
    blockNumber: number;
  }) {
    try {
      this.logger.log(`Processing Withdraw event: ${event.transactionHash}`);

      await this.indexerService.processWithdrawEvent(
        event.args.user,
        event.args.amount,
        event.transactionHash,
        event.blockNumber,
      );

      this.logger.log(`Withdraw event processed: ${event.transactionHash}`);
    } catch (error) {
      this.logger.error(
        `Error processing Withdraw event ${event.transactionHash}: ${error.message}`,
        error.stack,
      );
    }
  }
}
