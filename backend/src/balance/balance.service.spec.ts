import { Test, TestingModule } from '@nestjs/testing';
import { BalanceService } from './balance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
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
        {
          provide: DataSource,
          useValue: mockDataSource,
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
      const user = { id: '1', address, balance: '500' } as User;

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
          balance: '500',
        },
      });
    });

    it('should return zero balances when user has no activity', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address, balance: '0' } as User;

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
          balance: '0',
        },
      });
    });

    it('should return zero balances when user not found (auto-creates user)', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await balanceService.getBalance(address);

      expect(result).toEqual({
        success: true,
        data: {
          totalDeposits: '0',
          totalWithdrawals: '0',
          totalInPositions: '0',
          availableBalance: '0',
          balance: '0',
        },
      });
    });

    it('should calculate available balance correctly with pending withdrawals only', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const user = { id: '1', address, balance: '400' } as User;

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
          balance: '400',
        },
      });
    });
  });

  describe('lockMargin', () => {
    const userId = 'user-1';
    const marginAmount = BigInt('1000000000000000000'); // 1 token

    beforeEach(() => {
      mockQueryRunner.connect.mockClear();
      mockQueryRunner.startTransaction.mockClear();
      mockQueryRunner.commitTransaction.mockClear();
      mockQueryRunner.rollbackTransaction.mockClear();
      mockQueryRunner.release.mockClear();
      mockQueryRunner.manager.findOne.mockClear();
      mockQueryRunner.manager.save.mockClear();
    });

    it('should lock margin successfully when user has sufficient balance', async () => {
      const user = { id: userId, balance: '2000000000000000000' } as User; // 2 tokens
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...user,
        balance: '1000000000000000000',
      });

      const result = await balanceService.lockMargin(userId, marginAmount);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        expect.any(Function),
        {
          where: { id: userId },
        },
      );
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should return error when user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      const result = await balanceService.lockMargin(userId, marginAmount);

      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should return error when user has insufficient balance', async () => {
      const user = { id: userId, balance: '500000000000000000' } as User; // 0.5 tokens
      mockQueryRunner.manager.findOne.mockResolvedValue(user);

      const result = await balanceService.lockMargin(userId, marginAmount);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Insufficient balance'),
      });
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const user = { id: userId, balance: '2000000000000000000' } as User;
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await balanceService.lockMargin(userId, marginAmount);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to lock margin');
    });
  });

  describe('releaseMargin', () => {
    const userId = 'user-1';
    const marginAmount = BigInt('1000000000000000000'); // 1 token
    const pnl = BigInt('200000000000000000'); // 0.2 tokens profit

    beforeEach(() => {
      mockQueryRunner.connect.mockClear();
      mockQueryRunner.startTransaction.mockClear();
      mockQueryRunner.commitTransaction.mockClear();
      mockQueryRunner.rollbackTransaction.mockClear();
      mockQueryRunner.release.mockClear();
      mockQueryRunner.manager.findOne.mockClear();
      mockQueryRunner.manager.save.mockClear();
    });

    it('should release margin with PnL successfully', async () => {
      const user = { id: userId, balance: '1000000000000000000' } as User; // 1 token
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...user,
        balance: '2200000000000000000',
      });

      const result = await balanceService.releaseMargin(
        userId,
        marginAmount,
        pnl,
      );

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should release margin with zero PnL', async () => {
      const user = { id: userId, balance: '500000000000000000' } as User;
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...user,
        balance: '1500000000000000000',
      });

      const result = await balanceService.releaseMargin(
        userId,
        marginAmount,
        BigInt(0),
      );

      expect(result).toEqual({ success: true });
    });

    it('should reject release when negative pnl causes negative balance', async () => {
      const user = { id: userId, balance: '100000000000000000' } as User;
      mockQueryRunner.manager.findOne.mockResolvedValue(user);

      const result = await balanceService.releaseMargin(
        userId,
        BigInt(0),
        BigInt('-200000000000000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should return error when user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      const result = await balanceService.releaseMargin(
        userId,
        marginAmount,
        pnl,
      );

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should rollback transaction on error', async () => {
      const user = { id: userId, balance: '1000000000000000000' } as User;
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await balanceService.releaseMargin(
        userId,
        marginAmount,
        pnl,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to release margin');
    });
  });

  describe('refundFee', () => {
    const userId = 'user-1';
    const feeAmount = BigInt('200000000000000000');

    beforeEach(() => {
      mockQueryRunner.connect.mockClear();
      mockQueryRunner.startTransaction.mockClear();
      mockQueryRunner.commitTransaction.mockClear();
      mockQueryRunner.rollbackTransaction.mockClear();
      mockQueryRunner.release.mockClear();
      mockQueryRunner.manager.findOne.mockClear();
      mockQueryRunner.manager.save.mockClear();
    });

    it('should refund fee successfully', async () => {
      const user = { id: userId, balance: '1000000000000000000' } as User;
      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...user,
        balance: '1200000000000000000',
      });

      const result = await balanceService.refundFee(userId, feeAmount);

      expect(result).toEqual({ success: true });
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it('should return error when user not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      const result = await balanceService.refundFee(userId, feeAmount);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });
  });
});
