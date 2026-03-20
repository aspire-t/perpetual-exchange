import { Test, TestingModule } from '@nestjs/testing';
import { DepositService } from './deposit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';
import { ConfigService } from '@nestjs/config';

describe('DepositService', () => {
  let depositService: DepositService;
  let userRepository: Repository<User>;
  let depositRepository: Repository<Deposit>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDepositRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'ENABLE_FAUCET') return 'true';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    depositService = module.get<DepositService>(DepositService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    depositRepository = module.get<Repository<Deposit>>(
      getRepositoryToken(Deposit),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    it('should create a deposit successfully', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '1000000000000000000';
      const txHash =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const user = { id: '1', address } as User;
      const deposit = {
        id: '1',
        user,
        amount,
        txHash,
        status: 'confirmed',
      } as Deposit;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.findOne.mockResolvedValue(null);
      mockDepositRepository.create.mockImplementation(() => {
        const d = {} as Deposit;
        d.user = user;
        d.amount = amount;
        d.txHash = txHash;
        d.status = 'confirmed';
        return d;
      });
      mockDepositRepository.save.mockResolvedValue(deposit);

      const result = await depositService.deposit(address, amount, txHash);

      expect(result).toEqual({
        success: true,
        data: {
          txHash,
          status: 'confirmed',
          amount,
        },
      });
      expect(mockDepositRepository.create).toHaveBeenCalled();
      expect(mockDepositRepository.save).toHaveBeenCalled();
    });

    it('should return error when user not found', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '1000000000000000000';
      const txHash = '0x1234567890abcdef';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await depositService.deposit(address, amount, txHash);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should return error when txHash already exists', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '1000000000000000000';
      const txHash = '0xexistingtx';

      const user = { id: '1', address } as User;
      const existingDeposit = {
        id: '1',
        user,
        amount,
        txHash,
        status: 'confirmed',
      } as Deposit;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.findOne = jest
        .fn()
        .mockResolvedValue(existingDeposit);
      mockDepositRepository.create.mockReturnValue(existingDeposit);
      mockDepositRepository.save.mockResolvedValue(existingDeposit);

      const result = await depositService.deposit(address, amount, txHash);

      expect(result).toEqual({
        success: false,
        error: 'Transaction already processed',
      });
    });
  });

  describe('getUserDeposits', () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const normalizedAddress = address.toLowerCase();

    it('should return deposits for user with existing deposits', async () => {
      const user = { id: '1', address: normalizedAddress } as User;
      const mockDeposits = [
        {
          id: '1',
          userId: user.id,
          amount: '1000000000000000000',
          status: 'confirmed',
          txHash:
            '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          userId: user.id,
          amount: '500000000000000000',
          status: 'confirmed',
          txHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          createdAt: new Date('2024-01-02'),
        },
      ] as Deposit[];

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.find.mockResolvedValue(mockDeposits);

      const result = await depositService.getUserDeposits(address);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({
        id: '1',
        userId: user.id,
        amount: '1000000000000000000',
        status: 'confirmed',
        txHash:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        createdAt: expect.any(Date),
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
      expect(mockDepositRepository.find).toHaveBeenCalledWith({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array for user with no deposits', async () => {
      const user = { id: '1', address: normalizedAddress } as User;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.find.mockResolvedValue([]);

      const result = await depositService.getUserDeposits(address);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockDepositRepository.find).toHaveBeenCalledWith({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await depositService.getUserDeposits(address);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
      expect(mockDepositRepository.find).not.toHaveBeenCalled();
    });

    it('should normalize address to lowercase before query', async () => {
      const mixedCaseAddress = '0xF39Fd6e51AAD88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address: normalizedAddress } as User;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.find.mockResolvedValue([]);

      await depositService.getUserDeposits(mixedCaseAddress);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
    });
  });

  describe('faucet', () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

    it('should reject when faucet is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_FAUCET') return 'false';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = await depositService.faucet(address, '100000000');

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });
});
