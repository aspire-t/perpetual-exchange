import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from './balance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { Position } from '../entities/Position.entity';
import { Deposit } from '../entities/Deposit.entity';
import { Withdrawal } from '../entities/Withdrawal.entity';

describe('BalanceService', () => {
  let balanceService: BalanceService;
  let userRepository: Repository<User>;
  let depositRepository: Repository<Deposit>;
  let withdrawalRepository: Repository<Withdrawal>;
  let positionRepository: Repository<Position>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockDepositRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockWithdrawalRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockPositionRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
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
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository,
        },
      ],
    }).compile();

    balanceService = module.get<BalanceService>(BalanceService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    depositRepository = module.get<Repository<Deposit>>(
      getRepositoryToken(Deposit),
    );
    withdrawalRepository = module.get<Repository<Withdrawal>>(
      getRepositoryToken(Withdrawal),
    );
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('should return balance for user with deposits', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address } as User;

      mockUserRepository.findOne.mockResolvedValue(user);

      // Mock deposits: total 1000 tokens
      const depositQueryBuilderMock = {
        where: jest.fn().mockImplementation(() => depositQueryBuilderMock),
        select: jest.fn().mockImplementation(() => depositQueryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: '1000' }),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(
        depositQueryBuilderMock,
      );

      // Mock withdrawals: total 200 tokens
      const withdrawalQueryBuilderMock = {
        where: jest.fn().mockImplementation(() => withdrawalQueryBuilderMock),
        andWhere: jest
          .fn()
          .mockImplementation(() => withdrawalQueryBuilderMock),
        select: jest.fn().mockImplementation(() => withdrawalQueryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: '200' }),
      };
      mockWithdrawalRepository.createQueryBuilder.mockReturnValue(
        withdrawalQueryBuilderMock,
      );

      // Mock positions: total size 300 tokens
      const positionQueryBuilderMock = {
        where: jest.fn().mockImplementation(() => positionQueryBuilderMock),
        andWhere: jest.fn().mockImplementation(() => positionQueryBuilderMock),
        select: jest.fn().mockImplementation(() => positionQueryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: '300' }),
      };
      mockPositionRepository.createQueryBuilder.mockReturnValue(
        positionQueryBuilderMock,
      );

      const result = await balanceService.getBalance(address);

      expect(result).toEqual({
        success: true,
        data: {
          totalDeposits: '1000',
          totalWithdrawals: '200',
          totalInPositions: '300',
          availableBalance: '500',
        },
      });
    });

    it('should return zero balances when user has no activity', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address } as User;

      mockUserRepository.findOne.mockResolvedValue(user);

      const queryBuilderMock = {
        where: jest.fn().mockImplementation(() => queryBuilderMock),
        andWhere: jest.fn().mockImplementation(() => queryBuilderMock),
        select: jest.fn().mockImplementation(() => queryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      mockDepositRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockWithdrawalRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );
      mockPositionRepository.createQueryBuilder.mockReturnValue(
        queryBuilderMock,
      );

      const result = await balanceService.getBalance(address);

      expect(result).toEqual({
        success: true,
        data: {
          totalDeposits: '0',
          totalWithdrawals: '0',
          totalInPositions: '0',
          availableBalance: '0',
        },
      });
    });

    it('should return error when user not found', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await balanceService.getBalance(address);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should calculate available balance correctly with pending withdrawals only', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address } as User;

      mockUserRepository.findOne.mockResolvedValue(user);

      // Mock deposits: total 500 tokens
      const depositQueryBuilderMock = {
        where: jest.fn().mockImplementation(() => depositQueryBuilderMock),
        select: jest.fn().mockImplementation(() => depositQueryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: '500' }),
      };
      mockDepositRepository.createQueryBuilder.mockReturnValue(
        depositQueryBuilderMock,
      );

      // Mock withdrawals: total 100 tokens (only pending count against balance)
      const withdrawalQueryBuilderMock = {
        where: jest.fn().mockImplementation(() => withdrawalQueryBuilderMock),
        andWhere: jest
          .fn()
          .mockImplementation(() => withdrawalQueryBuilderMock),
        select: jest.fn().mockImplementation(() => withdrawalQueryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: '100' }),
      };
      mockWithdrawalRepository.createQueryBuilder.mockReturnValue(
        withdrawalQueryBuilderMock,
      );

      // No positions
      const positionQueryBuilderMock = {
        where: jest.fn().mockImplementation(() => positionQueryBuilderMock),
        andWhere: jest.fn().mockImplementation(() => positionQueryBuilderMock),
        select: jest.fn().mockImplementation(() => positionQueryBuilderMock),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };
      mockPositionRepository.createQueryBuilder.mockReturnValue(
        positionQueryBuilderMock,
      );

      const result = await balanceService.getBalance(address);

      expect(result).toEqual({
        success: true,
        data: {
          totalDeposits: '500',
          totalWithdrawals: '100',
          totalInPositions: '0',
          availableBalance: '400',
        },
      });
    });
  });
});
