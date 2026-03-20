import { Test, TestingModule } from '@nestjs/testing';
import { EventListenerService } from './event-listener.service';
import { IndexerService } from './indexer.service';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as ethers from 'ethers';

jest.mock('ethers');

describe('EventListenerService', () => {
  let eventListenerService: EventListenerService;
  let indexerService: IndexerService;
  let configService: ConfigService;

  const mockProvider = {
    on: jest.fn(),
    getBlockNumber: jest.fn().mockResolvedValue(200),
  };

  const mockContract = {
    on: jest.fn(),
    queryFilter: jest.fn(),
  };

  const mockIndexerService = {
    processDepositEvent: jest.fn(),
    processWithdrawEvent: jest.fn(),
    getResumeBlock: jest.fn().mockResolvedValue(100),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'RPC_URL') return 'http://localhost:8545';
      if (key === 'VAULT_ADDRESS')
        return '0x1234567890123456789012345678901234567890';
      return defaultValue;
    }),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    // Set up Logger prototype spies before module compilation
    jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);

    (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);
    (ethers.isAddress as jest.Mock).mockReturnValue(true);
    mockContract.queryFilter.mockResolvedValue([]);

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

  // Helper to access private methods
  function getLoggerCalls() {
    return {
      log: mockLogger.log.mock.calls.map((call) => call[0]),
      error: mockLogger.error.mock.calls.map((call) => call[0]),
    };
  }

  describe('onModuleInit', () => {
    it('should log startup messages', async () => {
      await eventListenerService.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith('Starting event listener...');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Event listener started successfully',
      );
    });

    it('should register Deposit event listener', async () => {
      await eventListenerService.onModuleInit();

      expect(mockContract.on).toHaveBeenCalledWith(
        'Deposit',
        expect.any(Function),
      );
    });

    it('should register Withdraw event listener', async () => {
      await eventListenerService.onModuleInit();

      expect(mockContract.on).toHaveBeenCalledWith(
        'Withdraw',
        expect.any(Function),
      );
    });

    it('should handle Deposit event by calling handleDepositEvent', async () => {
      const mockHandleDepositEvent = jest.spyOn(
        eventListenerService as any,
        'handleDepositEvent',
      );
      const mockUser = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const mockAmount = BigInt('1000000000000000000');
      const mockEvent = {
        log: {
          transactionHash: '0xabc123',
          blockNumber: 100,
        },
      };

      await eventListenerService.onModuleInit();

      const depositHandler = mockContract.on.mock.calls.find(
        (call) => call[0] === 'Deposit',
      )?.[1];

      expect(depositHandler).toBeDefined();
      await depositHandler!(mockUser, mockAmount, mockEvent);

      expect(mockHandleDepositEvent).toHaveBeenCalledWith({
        args: {
          user: mockUser,
          amount: mockAmount,
        },
        transactionHash: '0xabc123',
        blockNumber: 100,
      });
    });

    it('should handle Withdraw event by calling handleWithdrawEvent', async () => {
      const mockHandleWithdrawEvent = jest.spyOn(
        eventListenerService as any,
        'handleWithdrawEvent',
      );
      const mockUser = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const mockAmount = BigInt('500000000000000000');
      const mockEvent = {
        log: {
          transactionHash: '0xdef456',
          blockNumber: 101,
        },
      };

      await eventListenerService.onModuleInit();

      const withdrawHandler = mockContract.on.mock.calls.find(
        (call) => call[0] === 'Withdraw',
      )?.[1];

      expect(withdrawHandler).toBeDefined();
      await withdrawHandler!(mockUser, mockAmount, mockEvent);

      expect(mockHandleWithdrawEvent).toHaveBeenCalledWith({
        args: {
          user: mockUser,
          amount: mockAmount,
        },
        transactionHash: '0xdef456',
        blockNumber: 101,
      });
    });

    it('should replay historical events from resume block', async () => {
      mockContract.queryFilter
        .mockResolvedValueOnce([
          {
            args: {
              user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
              amount: BigInt('1000000000000000000'),
            },
            transactionHash: '0xdep1',
            blockNumber: 120,
          },
        ])
        .mockResolvedValueOnce([
          {
            args: {
              user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
              amount: BigInt('500000000000000000'),
            },
            transactionHash: '0xwd1',
            blockNumber: 121,
          },
        ]);

      await eventListenerService.onModuleInit();

      expect(mockIndexerService.getResumeBlock).toHaveBeenCalledWith(0);
      expect(mockContract.queryFilter).toHaveBeenCalledWith('Deposit', 100, 200);
      expect(mockContract.queryFilter).toHaveBeenCalledWith('Withdraw', 100, 200);
      expect(mockIndexerService.processDepositEvent).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        BigInt('1000000000000000000'),
        '0xdep1',
        120,
      );
      expect(mockIndexerService.processWithdrawEvent).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        BigInt('500000000000000000'),
        '0xwd1',
        121,
      );
    });
  });

  describe('constructor', () => {
    it('should throw when vault address is missing', async () => {
      const invalidConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          if (key === 'RPC_URL') return 'http://localhost:8545';
          if (key === 'VAULT_ADDRESS') return undefined;
          return defaultValue;
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            EventListenerService,
            {
              provide: IndexerService,
              useValue: mockIndexerService,
            },
            {
              provide: ConfigService,
              useValue: invalidConfigService,
            },
          ],
        }).compile(),
      ).rejects.toThrow(
        'VAULT_ADDRESS is required',
      );
    });
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Processing Deposit event: ${txHash}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Deposit event processed: ${txHash}`,
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

      await expect(
        (eventListenerService as any).handleDepositEvent(mockEvent),
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error processing Deposit event ${mockEvent.transactionHash}: Processing failed`,
        expect.any(String),
      );
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
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Processing Withdraw event: ${txHash}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Withdraw event processed: ${txHash}`,
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

      await expect(
        (eventListenerService as any).handleWithdrawEvent(mockEvent),
      ).resolves.not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error processing Withdraw event ${mockEvent.transactionHash}: Processing failed`,
        expect.any(String),
      );
    });
  });
});
