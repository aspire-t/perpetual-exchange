import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

describe('WithdrawalService', () => {
  let withdrawalService: WithdrawalService;
  let userRepository: Repository<User>;
  let withdrawalRepository: Repository<Withdrawal>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockWithdrawalRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
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
      ],
    }).compile();

    withdrawalService = module.get<WithdrawalService>(WithdrawalService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    withdrawalRepository = module.get<Repository<Withdrawal>>(
      getRepositoryToken(Withdrawal),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withdraw', () => {
    it('should create a withdrawal request successfully', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '500000000000000000';

      const user = { id: '1', address } as User;
      const withdrawal = {
        id: '1',
        user,
        amount,
        status: 'pending',
        txHash: null,
      } as Withdrawal;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockWithdrawalRepository.create.mockImplementation(() => {
        const w = {} as Withdrawal;
        w.user = user;
        w.amount = amount;
        w.status = 'pending';
        return w;
      });
      mockWithdrawalRepository.save.mockResolvedValue(withdrawal);

      const result = await withdrawalService.withdraw(address, amount);

      expect(result).toEqual({
        success: true,
        data: {
          status: 'pending',
          amount,
        },
      });
      expect(mockWithdrawalRepository.create).toHaveBeenCalled();
      expect(mockWithdrawalRepository.save).toHaveBeenCalled();
    });

    it('should return error when user not found', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '500000000000000000';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await withdrawalService.withdraw(address, amount);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should return error when there is a pending withdrawal', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '500000000000000000';

      const user = { id: '1', address } as User;
      const pendingWithdrawal = {
        id: '1',
        user,
        amount: '100',
        status: 'pending',
      } as Withdrawal;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockWithdrawalRepository.findOne.mockResolvedValue(pendingWithdrawal);

      const result = await withdrawalService.withdraw(address, amount);

      expect(result).toEqual({
        success: false,
        error: 'You already have a pending withdrawal',
      });
    });
  });

  describe('getUserWithdrawals', () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const normalizedAddress = address.toLowerCase();

    it('should return withdrawals for user with existing withdrawals', async () => {
      const user = { id: '1', address: normalizedAddress } as User;
      const mockWithdrawals = [
        {
          id: '1',
          userId: user.id,
          amount: '500000000000000000',
          status: 'pending',
          txHash: null,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          userId: user.id,
          amount: '300000000000000000',
          status: 'completed',
          txHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          createdAt: new Date('2024-01-02'),
        },
      ] as Withdrawal[];

      mockUserRepository.findOne.mockResolvedValue(user);
      mockWithdrawalRepository.find.mockResolvedValue(mockWithdrawals);

      const result = await withdrawalService.getUserWithdrawals(address);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).toEqual({
        id: '1',
        userId: user.id,
        amount: '500000000000000000',
        status: 'pending',
        txHash: null,
        createdAt: expect.any(Date),
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
      expect(mockWithdrawalRepository.find).toHaveBeenCalledWith({
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array for user with no withdrawals', async () => {
      const user = { id: '1', address: normalizedAddress } as User;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockWithdrawalRepository.find.mockResolvedValue([]);

      const result = await withdrawalService.getUserWithdrawals(address);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockWithdrawalRepository.find).toHaveBeenCalledWith({
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await withdrawalService.getUserWithdrawals(address);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
      expect(mockWithdrawalRepository.find).not.toHaveBeenCalled();
    });

    it('should normalize address to lowercase before query', async () => {
      const mixedCaseAddress = '0xF39Fd6e51AAD88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address: normalizedAddress } as User;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockWithdrawalRepository.find.mockResolvedValue([]);

      await withdrawalService.getUserWithdrawals(mixedCaseAddress);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
    });
  });
});
