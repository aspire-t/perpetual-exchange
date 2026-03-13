import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/User.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';
import { ethers } from 'ethers';

jest.mock('ethers');

describe('WithdrawalService', () => {
  let withdrawalService: WithdrawalService;
  let userRepository: Repository<User>;
  let withdrawalRepository: Repository<Withdrawal>;
  let dataSource: DataSource;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockWithdrawalRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockConfigService = {
    get: jest.fn((key, defaultValue) => {
      if (key === 'HYPERLIQUID_PRIVATE_KEY')
        return '0x0123456789012345678901234567890123456789012345678901234567890123';
      if (key === 'RPC_URL') return 'http://localhost:8545';
      if (key === 'VAULT_CONTRACT_ADDRESS') return '0xVaultAddress';
      return defaultValue;
    }),
  };

  const mockProvider = {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 31337 }),
  };
  const mockWallet = {
    signTypedData: jest.fn().mockResolvedValue('0xSignature'),
  };
  const mockContract = {
    nonces: jest.fn().mockResolvedValue(0n),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (ethers.JsonRpcProvider as jest.Mock).mockReturnValue(mockProvider);
    (ethers.Wallet as jest.Mock).mockReturnValue(mockWallet);
    (ethers.Contract as jest.Mock).mockReturnValue(mockContract);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Withdrawal),
          useValue: mockWithdrawalRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    withdrawalService = module.get<WithdrawalService>(WithdrawalService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    withdrawalRepository = module.get<Repository<Withdrawal>>(
      getRepositoryToken(Withdrawal),
    );
    dataSource = module.get<DataSource>(DataSource);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('withdraw', () => {
    it('should create a withdrawal request successfully', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '500000000000000000'; // 0.5
      const userId = '1';

      const user = {
        id: userId,
        address,
        balance: '1000000000000000000', // 1.0
        locked: '0',
      } as User;

      const withdrawal = {
        id: '1',
        user,
        amount,
        status: 'pending',
      } as Withdrawal;

      // Mock userRepository.findOne (for initial check in withdraw)
      mockUserRepository.findOne.mockResolvedValue(user);

      // Mock queryRunner.manager calls (for requestWithdrawal)
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.create.mockReturnValue(withdrawal);
      mockQueryRunner.manager.save.mockResolvedValue(withdrawal);

      const result = await withdrawalService.withdraw(address, amount);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.signature).toBe('0xSignature');
      expect(result.data.nonce).toBe(0);
      expect(result.data.amount).toBe(amount);

      // Verify transaction flow
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();

      // Verify balance update
      // user object is mutated in place in the service
      expect(user.balance).toBe('500000000000000000'); // 1.0 - 0.5 = 0.5
      expect(user.locked).toBe('500000000000000000'); // 0 + 0.5 = 0.5
    });

    it('should return error when user not found', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await withdrawalService.withdraw(address, '100');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error when insufficient balance', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const user = {
        id: '1',
        address,
        balance: '0',
        locked: '0',
      } as User;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.findOne.mockResolvedValue(user);

      const result = await withdrawalService.withdraw(address, '100');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
      
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
