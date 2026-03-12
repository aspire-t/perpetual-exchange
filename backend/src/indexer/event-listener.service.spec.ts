import { Test, TestingModule } from '@nestjs/testing';
import { EventListenerService } from './event-listener.service';
import { IndexerService } from './indexer.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

describe('EventListenerService', () => {
  let eventListenerService: EventListenerService;
  let indexerService: IndexerService;
  let configService: ConfigService;

  const mockIndexerService = {
    processDepositEvent: jest.fn(),
    processWithdrawEvent: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'RPC_URL') return 'http://localhost:8545';
      if (key === 'VAULT_CONTRACT_ADDRESS')
        return '0x1234567890123456789012345678901234567890';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventListenerService,
        {
          provide: IndexerService,
          useValue: mockIndexerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    eventListenerService =
      module.get<EventListenerService>(EventListenerService);
    indexerService = module.get<IndexerService>(IndexerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDepositEvent', () => {
    it('should call indexerService.processDepositEvent with correct parameters', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('1000000000000000000');
      const txHash = '0xabc123';
      const blockNumber = 100;

      const mockEvent = {
        args: {
          user: userAddress,
          amount,
        },
        transactionHash: txHash,
        blockNumber,
      };

      mockIndexerService.processDepositEvent.mockResolvedValue({
        success: true,
        data: {
          txHash,
          status: 'confirmed',
          amount: amount.toString(),
        },
      });

      await (eventListenerService as any).handleDepositEvent(mockEvent);

      expect(mockIndexerService.processDepositEvent).toHaveBeenCalledWith(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );
    });

    it('should handle processing errors gracefully', async () => {
      const mockEvent = {
        args: {
          user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          amount: BigInt('1000000000000000000'),
        },
        transactionHash: '0xabc123',
        blockNumber: 100,
      };

      mockIndexerService.processDepositEvent.mockRejectedValue(
        new Error('Processing failed'),
      );

      // Should not throw - errors are logged
      await expect(
        (eventListenerService as any).handleDepositEvent(mockEvent),
      ).resolves.not.toThrow();
    });
  });

  describe('handleWithdrawEvent', () => {
    it('should call indexerService.processWithdrawEvent with correct parameters', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('500000000000000000');
      const txHash = '0xdef456';
      const blockNumber = 101;

      const mockEvent = {
        args: {
          user: userAddress,
          amount,
        },
        transactionHash: txHash,
        blockNumber,
      };

      mockIndexerService.processWithdrawEvent.mockResolvedValue({
        success: true,
        data: {
          status: 'confirmed',
          amount: amount.toString(),
        },
      });

      await (eventListenerService as any).handleWithdrawEvent(mockEvent);

      expect(mockIndexerService.processWithdrawEvent).toHaveBeenCalledWith(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );
    });

    it('should handle processing errors gracefully', async () => {
      const mockEvent = {
        args: {
          user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          amount: BigInt('500000000000000000'),
        },
        transactionHash: '0xdef456',
        blockNumber: 101,
      };

      mockIndexerService.processWithdrawEvent.mockRejectedValue(
        new Error('Processing failed'),
      );

      // Should not throw - errors are logged
      await expect(
        (eventListenerService as any).handleWithdrawEvent(mockEvent),
      ).resolves.not.toThrow();
    });
  });
});
