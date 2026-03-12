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
      mockWithdrawalRepository.create.mockReturnValue(withdrawal);
      mockWithdrawalRepository.save.mockResolvedValue(withdrawal);

      const result = await withdrawalService.withdraw(address, amount);

      expect(result).toEqual({
        success: true,
        data: {
          status: 'pending',
          amount,
        },
      });
      expect(mockWithdrawalRepository.create).toHaveBeenCalledWith({
        user,
        amount: BigInt(amount),
        status: 'pending',
      });
      expect(mockWithdrawalRepository.save).toHaveBeenCalledWith(withdrawal);
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
});
