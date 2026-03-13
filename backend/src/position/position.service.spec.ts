import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionService } from './position.service';
import { Position } from '../entities/Position.entity';
import { User } from '../entities/User.entity';
import { PriceService } from '../price/price.service';

describe('PositionService', () => {
  let positionService: PositionService;
  let positionRepository: Repository<Position>;
  let userRepository: Repository<User>;
  let priceService: PriceService;

  const mockPositionRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockUserRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockPriceService = {
    getPrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionService,
        {
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository(),
        },
        {
          provide: PriceService,
          useValue: mockPriceService,
        },
      ],
    }).compile();

    positionService = module.get<PositionService>(PositionService);
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    priceService = module.get<PriceService>(PriceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('openPosition', () => {
    const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const mockUser = { id: 'user-1', address: userAddress };

    it('should open a long position successfully', async () => {
      const size = BigInt('1000000000000000000'); // 1 token
      const entryPrice = BigInt('2000000000'); // $2000
      const normalizedAddress = userAddress.toLowerCase();

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(positionRepository, 'create').mockReturnValue({
        id: 'position-1',
        userId: mockUser.id,
        size,
        entryPrice,
        isLong: true,
        isOpen: true,
        createdAt: new Date(),
      } as Position);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        id: 'position-1',
        userId: mockUser.id,
        size,
        entryPrice,
        isLong: true,
        isOpen: true,
        createdAt: new Date(),
      } as Position);

      const result = await positionService.openPosition(
        userAddress,
        size,
        entryPrice,
        true,
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('position-1');
      expect(result.data?.isOpen).toBe(true);
    });

    it('should open a short position successfully', async () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(positionRepository, 'create').mockReturnValue({
        id: 'position-2',
        userId: mockUser.id,
        size,
        entryPrice,
        isLong: false,
        isOpen: true,
        createdAt: new Date(),
      } as Position);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        id: 'position-2',
        userId: mockUser.id,
        size,
        entryPrice,
        isLong: false,
        isOpen: true,
        createdAt: new Date(),
      } as Position);

      const result = await positionService.openPosition(
        userAddress,
        size,
        entryPrice,
        false,
      );

      expect(result.success).toBe(true);
      expect(result.data?.isLong).toBe(false);
    });

    it('should auto-create user when not found', async () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const normalizedAddress = userAddress.toLowerCase();

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue({
        id: 'user-new',
        address: normalizedAddress,
      } as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        id: 'user-new',
        address: normalizedAddress,
      } as User);
      jest.spyOn(positionRepository, 'create').mockReturnValue({
        id: 'position-new',
        userId: 'user-new',
        size,
        entryPrice,
        isLong: true,
        isOpen: true,
        createdAt: new Date(),
      } as Position);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        id: 'position-new',
        userId: 'user-new',
        size,
        entryPrice,
        isLong: true,
        isOpen: true,
        createdAt: new Date(),
      } as Position);

      const result = await positionService.openPosition(
        userAddress,
        size,
        entryPrice,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('position-new');
    });

    it('should return error when size is invalid', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await positionService.openPosition(
        userAddress,
        BigInt('0'),
        BigInt('2000000000'),
        true,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid size');
    });
  });

  describe('closePosition', () => {
    const mockOpenPosition = {
      id: 'position-1',
      userId: 'user-1',
      size: BigInt('1000000000000000000'),
      entryPrice: BigInt('2000000000'),
      isLong: true,
      isOpen: true,
      createdAt: new Date(),
    } as Position;

    it('should close a position with long side', async () => {
      const exitPrice = BigInt('2100000000'); // $2100, price went up

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(mockOpenPosition);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: exitPrice.toString() },
      });
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        ...mockOpenPosition,
        isOpen: false,
        exitPrice,
        pnl: BigInt('100000000'), // Profit
        closedAt: new Date(),
      } as Position);

      const result = await positionService.closePosition('position-1');

      expect(result.success).toBe(true);
      expect(result.data?.isOpen).toBe(false);
      expect(result.data?.pnl).toBe('100000000');
    });

    it('should close a position with short side', async () => {
      const shortPosition = {
        id: 'position-1',
        userId: 'user-1',
        size: BigInt('1000000000000000000'),
        entryPrice: BigInt('2000000000'),
        isLong: false,
        isOpen: true,
        createdAt: new Date(),
      } as Position;

      const exitPrice = BigInt('1900000000'); // $1900, price went down

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(shortPosition);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: exitPrice.toString() },
      });
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        ...shortPosition,
        isOpen: false,
        exitPrice,
        pnl: BigInt('100000000'), // Profit on short
        closedAt: new Date(),
      } as Position);

      const result = await positionService.closePosition('position-1');

      expect(result.success).toBe(true);
      expect(result.data?.isOpen).toBe(false);
      expect(result.data?.pnl).toBe('100000000');
    });

    it('should return error when position not found', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(null);

      const result = await positionService.closePosition('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error when position is already closed', async () => {
      const closedPosition = {
        ...mockOpenPosition,
        isOpen: false,
      } as Position;

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(closedPosition);

      const result = await positionService.closePosition('position-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position is already closed');
    });
  });

  describe('getPosition', () => {
    it('should return position by id', async () => {
      const mockPosition = {
        id: 'position-1',
        userId: 'user-1',
        size: BigInt('1000000000000000000'),
        entryPrice: BigInt('2000000000'),
        isLong: true,
        isOpen: true,
        createdAt: new Date(),
      } as Position;

      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);

      const result = await positionService.getPosition('position-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('position-1');
    });

    it('should return error when position not found', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(null);

      const result = await positionService.getPosition('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });
  });

  describe('getUserPositions', () => {
    const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const mockUser = { id: 'user-1', address: userAddress };

    it('should return all positions for a user', async () => {
      const mockPositions = [
        {
          id: 'position-1',
          userId: 'user-1',
          size: BigInt('1000000000000000000'),
          entryPrice: BigInt('2000000000'),
          isLong: true,
          isOpen: true,
          createdAt: new Date(),
        },
        {
          id: 'position-2',
          userId: 'user-1',
          size: BigInt('500000000000000000'),
          entryPrice: BigInt('1800000000'),
          isLong: false,
          isOpen: false,
          createdAt: new Date(),
        },
      ] as Position[];

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(positionRepository, 'find').mockResolvedValue(mockPositions);

      const result = await positionService.getUserPositions(userAddress);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when user has no positions', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(positionRepository, 'find').mockResolvedValue([]);

      const result = await positionService.getUserPositions(userAddress);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('calculatePnL', () => {
    it('should calculate profit for long position when price increases', () => {
      const size = BigInt('1000000000000000000'); // 1 token
      const entryPrice = BigInt('2000000000'); // $2000
      const currentPrice = BigInt('2100000000'); // $2100

      const pnl = (positionService as any).calculatePnL(
        size,
        entryPrice,
        currentPrice,
        true,
      );

      expect(pnl).toBe(BigInt('100000000')); // $100 profit
    });

    it('should calculate loss for long position when price decreases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('1900000000');

      const pnl = (positionService as any).calculatePnL(
        size,
        entryPrice,
        currentPrice,
        true,
      );

      expect(pnl).toBe(BigInt('-100000000')); // $100 loss
    });

    it('should calculate profit for short position when price decreases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('1900000000');

      const pnl = (positionService as any).calculatePnL(
        size,
        entryPrice,
        currentPrice,
        false,
      );

      expect(pnl).toBe(BigInt('100000000')); // $100 profit on short
    });

    it('should calculate loss for short position when price increases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('2100000000');

      const pnl = (positionService as any).calculatePnL(
        size,
        entryPrice,
        currentPrice,
        false,
      );

      expect(pnl).toBe(BigInt('-100000000')); // $100 loss on short
    });
  });

  describe('increasePosition', () => {
    const mockPosition = {
      id: 'position-1',
      userId: 'user-1',
      size: BigInt('1000000000000000000'), // 1 token
      entryPrice: BigInt('2000000000'), // $2000
      isLong: true,
      isOpen: true,
      createdAt: new Date(),
    } as Position;

    it('should increase position size and recalculate average entry price', async () => {
      const additionalSize = BigInt('500000000000000000'); // 0.5 token
      const newEntryPrice = BigInt('2200000000'); // $2200

      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        ...mockPosition,
        size: BigInt('1500000000000000000'),
        entryPrice: BigInt('2066666666'),
      } as Position);

      const result = await positionService.increasePosition(
        'position-1',
        additionalSize,
        newEntryPrice,
      );

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe('1500000000000000000');
      // Weighted average: (1*2000 + 0.5*2200) / 1.5 = 2066.67
      expect(result.data?.entryPrice).toBe('2066666666');
      expect(result.data?.averageEntryPrice).toBe('2066666666');
    });

    it('should return error when position not found', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(null);

      const result = await positionService.increasePosition(
        'non-existent-id',
        BigInt('500000000000000000'),
        BigInt('2200000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error when position is closed', async () => {
      const closedPosition = { ...mockPosition, isOpen: false } as Position;

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(closedPosition);

      const result = await positionService.increasePosition(
        'position-1',
        BigInt('500000000000000000'),
        BigInt('2200000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position is not open');
    });

    it('should return error when additional size is invalid (zero)', async () => {
      const result = await positionService.increasePosition(
        'position-1',
        BigInt('0'),
        BigInt('2200000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid size');
    });

    it('should return error when additional size is negative', async () => {
      const result = await positionService.increasePosition(
        'position-1',
        BigInt('-100'),
        BigInt('2200000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid size');
    });
  });

  describe('reducePosition', () => {
    const mockOpenPosition = {
      id: 'position-1',
      userId: 'user-1',
      size: BigInt('1000000000000000000'), // 1 token
      entryPrice: BigInt('2000000000'), // $2000
      isLong: true,
      isOpen: true,
      createdAt: new Date(),
    } as Position;

    it('should reduce position size and calculate realized PnL', async () => {
      const reduceSize = BigInt('300000000000000000'); // 0.3 token
      const currentPrice = BigInt('2100000000'); // $2100

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(mockOpenPosition);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        ...mockOpenPosition,
        size: BigInt('700000000000000000'),
      } as Position);

      const result = await positionService.reducePosition(
        'position-1',
        reduceSize,
        currentPrice,
      );

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe('700000000000000000');
      expect(result.data?.isOpen).toBe(true);
      // PnL for 0.3 token: (2100 - 2000) * 0.3 = 30, but in wei: (100000000 * 3e17) / 1e18 = 30000000
      expect(result.data?.realizedPnl).toBe('30000000');
    });

    it('should close position when reduced to zero', async () => {
      const reduceSize = BigInt('1000000000000000000'); // Full size
      const currentPrice = BigInt('2100000000');

      // Fresh mock with full size
      const fullPosition = {
        id: 'position-1',
        userId: 'user-1',
        size: BigInt('1000000000000000000'), // 1 token (full size)
        entryPrice: BigInt('2000000000'),
        isLong: true,
        isOpen: true,
        createdAt: new Date(),
      } as Position;

      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(fullPosition);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        ...fullPosition,
        size: '0',
        isOpen: false,
        exitPrice: currentPrice.toString(),
        closedAt: new Date(),
      } as Position);

      const result = await positionService.reducePosition(
        'position-1',
        reduceSize,
        currentPrice,
      );

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe('0');
      expect(result.data?.isOpen).toBe(false);
      // Full PnL: (2100 - 2000) * 1 = 100, in wei: (100000000 * 1e18) / 1e18 = 100000000
      expect(result.data?.realizedPnl).toBe('100000000');
    });

    it('should return error when reduce size exceeds position size', async () => {
      const reduceSize = BigInt('2000000000000000000'); // 2 tokens, more than position

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(mockOpenPosition);

      const result = await positionService.reducePosition(
        'position-1',
        reduceSize,
        BigInt('2100000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds position size');
    });

    it('should return error when position not found', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(null);

      const result = await positionService.reducePosition(
        'non-existent-id',
        BigInt('300000000000000000'),
        BigInt('2100000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error when position is closed', async () => {
      const closedPosition = { ...mockOpenPosition, isOpen: false } as Position;

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(closedPosition);

      const result = await positionService.reducePosition(
        'position-1',
        BigInt('300000000000000000'),
        BigInt('2100000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position is not open');
    });

    it('should return error when reduce size is invalid (zero)', async () => {
      const result = await positionService.reducePosition(
        'position-1',
        BigInt('0'),
        BigInt('2100000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid size');
    });

    it('should calculate realized loss correctly for long position', async () => {
      const reduceSize = BigInt('500000000000000000'); // 0.5 token
      const currentPrice = BigInt('1900000000'); // $1900, price went down

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(mockOpenPosition);
      jest.spyOn(positionRepository, 'save').mockResolvedValue({
        ...mockOpenPosition,
        size: BigInt('500000000000000000'),
      } as Position);

      const result = await positionService.reducePosition(
        'position-1',
        reduceSize,
        currentPrice,
      );

      expect(result.success).toBe(true);
      // Loss for 0.5 token: (1900 - 2000) * 0.5 = -50, in wei: (-100000000 * 5e17) / 1e18 = -50000000
      expect(result.data?.realizedPnl).toBe('-50000000');
    });
  });
});
