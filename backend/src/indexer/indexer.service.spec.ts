import { Test, TestingModule } from '@nestjs/testing';
import { IndexerService } from './indexer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { ProcessedEvent } from '../entities/ProcessedEvent.entity';

describe('IndexerService', () => {
  let indexerService: IndexerService;
  let userRepository: Repository<User>;
  let depositRepository: Repository<Deposit>;
  let withdrawalRepository: Repository<Withdrawal>;
  let processedEventRepository: Repository<ProcessedEvent>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDepositRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWithdrawalRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProcessedEventRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndexerService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
        {
          provide: getRepositoryToken(Withdrawal),
          useValue: mockWithdrawalRepository,
        },
        {
          provide: getRepositoryToken(ProcessedEvent),
          useValue: mockProcessedEventRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    indexerService = module.get<IndexerService>(IndexerService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    depositRepository = module.get<Repository<Deposit>>(
      getRepositoryToken(Deposit),
    );
    withdrawalRepository = module.get<Repository<Withdrawal>>(
      getRepositoryToken(Withdrawal),
    );
    processedEventRepository = module.get<Repository<ProcessedEvent>>(
      getRepositoryToken(ProcessedEvent),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDepositEvent', () => {
    it('should process a deposit event and create deposit record', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('1000000000000000000');
      const txHash = '0xabc123';
      const blockNumber = 100;

      const user = { id: '1', address: userAddress } as User;
      const deposit = {
        id: '1',
        user,
        amount,
        txHash,
        status: 'confirmed',
      } as Deposit;
      const processedEvent = {
        eventTxHash: txHash,
        eventName: 'Deposit',
        blockNumber,
        userId: user.id,
        amount,
      } as ProcessedEvent;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve({ ...user });
        }
        if (typeof entity === 'function' && entity.name === 'ProcessedEvent') {
          return Promise.resolve(null);
        }
        if (typeof entity === 'function' && entity.name === 'Deposit') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      mockQueryRunner.manager.create.mockImplementation((entity, data) => {
        const obj = { ...data };
        if (typeof entity === 'function' && entity.name === 'Deposit') {
          obj.user = user;
          obj.amount = amount.toString();
          obj.txHash = txHash;
          obj.status = 'confirmed';
        } else if (
          typeof entity === 'function' &&
          entity.name === 'ProcessedEvent'
        ) {
          obj.eventTxHash = txHash;
          obj.eventName = 'Deposit';
          obj.blockNumber = blockNumber;
          obj.userId = user.id;
          obj.amount = amount.toString();
        }
        return obj;
      });
      mockQueryRunner.manager.save.mockImplementation(async (obj) => ({
        ...obj,
      }));

      const result = await indexerService.processDepositEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: true,
        data: {
          txHash,
          status: 'confirmed',
          amount: amount.toString(),
        },
      });
      expect(mockQueryRunner.manager.create).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
    });

    it('should return error when user not found', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('1000000000000000000');
      const txHash = '0xabc123';
      const blockNumber = 100;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const result = await indexerService.processDepositEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should skip processing when event already processed', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('1000000000000000000');
      const txHash = '0xabc123';
      const blockNumber = 100;

      const user = { id: '1', address: userAddress } as User;
      const existingEvent = {
        eventTxHash: txHash,
        eventName: 'Deposit',
        blockNumber,
      } as ProcessedEvent;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve({ ...user });
        }
        if (typeof entity === 'function' && entity.name === 'ProcessedEvent') {
          return Promise.resolve({ ...existingEvent });
        }
        return Promise.resolve(null);
      });

      const result = await indexerService.processDepositEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: 'Event already processed',
      });
      expect(mockQueryRunner.manager.create).not.toHaveBeenCalled();
    });

    it('should skip processing when deposit already exists', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('1000000000000000000');
      const txHash = '0xabc123';
      const blockNumber = 100;

      const user = { id: '1', address: userAddress } as User;
      const existingDeposit = {
        id: '1',
        user,
        amount,
        txHash,
        status: 'confirmed',
      } as Deposit;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve({ ...user });
        }
        if (typeof entity === 'function' && entity.name === 'ProcessedEvent') {
          return Promise.resolve(null);
        }
        if (typeof entity === 'function' && entity.name === 'Deposit') {
          return Promise.resolve({ ...existingDeposit });
        }
        return Promise.resolve(null);
      });

      const result = await indexerService.processDepositEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: 'Deposit already exists',
      });
    });
  });

  describe('processWithdrawEvent', () => {
    it('should process a withdraw event and create withdrawal record', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('500000000000000000');
      const txHash = '0xdef456';
      const blockNumber = 101;

      const user = { id: '1', address: userAddress } as User;
      const withdrawal = {
        id: '1',
        user,
        amount,
        status: 'confirmed',
        txHash,
      } as Withdrawal;
      const processedEvent = {
        eventTxHash: txHash,
        eventName: 'Withdraw',
        blockNumber,
        userId: user.id,
        amount,
      } as ProcessedEvent;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve({ ...user });
        }
        if (typeof entity === 'function' && entity.name === 'ProcessedEvent') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });
      mockQueryRunner.manager.create.mockImplementation((entity, data) => {
        const obj = { ...data };
        if (typeof entity === 'function' && entity.name === 'Withdrawal') {
          obj.user = user;
          obj.amount = amount.toString();
          obj.status = 'approved';
          obj.txHash = txHash;
        } else if (
          typeof entity === 'function' &&
          entity.name === 'ProcessedEvent'
        ) {
          obj.eventTxHash = txHash;
          obj.eventName = 'Withdraw';
          obj.blockNumber = blockNumber;
          obj.userId = user.id;
          obj.amount = amount.toString();
        }
        return obj;
      });
      mockQueryRunner.manager.save.mockImplementation(async (obj) => ({
        ...obj,
      }));

      const result = await indexerService.processWithdrawEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: true,
        data: {
          status: 'approved',
          amount: amount.toString(),
        },
      });
      expect(mockQueryRunner.manager.create).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(2);
    });

    it('should return error when user not found', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('500000000000000000');
      const txHash = '0xdef456';
      const blockNumber = 101;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      });

      const result = await indexerService.processWithdrawEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should skip processing when event already processed', async () => {
      const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = BigInt('500000000000000000');
      const txHash = '0xdef456';
      const blockNumber = 101;

      const user = { id: '1', address: userAddress } as User;
      const existingEvent = {
        eventTxHash: txHash,
        eventName: 'Withdraw',
        blockNumber,
      } as ProcessedEvent;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (typeof entity === 'function' && entity.name === 'User') {
          return Promise.resolve({ ...user });
        }
        if (typeof entity === 'function' && entity.name === 'ProcessedEvent') {
          return Promise.resolve({ ...existingEvent });
        }
        return Promise.resolve(null);
      });

      const result = await indexerService.processWithdrawEvent(
        userAddress,
        amount,
        txHash,
        blockNumber,
      );

      expect(result).toEqual({
        success: true,
        skipped: true,
        reason: 'Event already processed',
      });
      expect(mockQueryRunner.manager.create).not.toHaveBeenCalled();
    });
  });
});
