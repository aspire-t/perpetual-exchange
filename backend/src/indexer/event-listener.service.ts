import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { IndexerService } from './indexer.service';

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
    const contractAddress = this.configService.get<string>(
      'VAULT_CONTRACT_ADDRESS',
      '0x1234567890123456789012345678901234567890',
    );

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(contractAddress, VAULT_ABI, this.provider);
  }

  async onModuleInit() {
    this.logger.log('Starting event listener...');

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
