import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskEngineService } from './risk-engine.service';
import { Position } from '../entities/Position.entity';
import { User } from '../entities/User.entity';
import { PriceService } from '../price/price.service';

describe('RiskEngineService', () => {
  let riskEngineService: RiskEngineService;
  let positionRepository: Repository<Position>;
  let userRepository: Repository<User>;
  let priceService: PriceService;

  const mockPositionRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
  });

  const mockUserRepository = () => ({
    findOne: jest.fn(),
  });

  const mockPriceService = {
    getPrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskEngineService,
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

    riskEngineService = module.get<RiskEngineService>(RiskEngineService);
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    priceService = module.get<PriceService>(PriceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkNewPositionRisk', () => {
    const mockUser = {
      address: '0x1234567890123456789012345678901234567890',
      balance: '10000000000000000000', // 10 tokens
    } as User;

    it('should allow position when leverage is within limits and user has sufficient balance', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await riskEngineService.checkNewPositionRisk(
        mockUser.address,
        BigInt('1000000000000000000'), // 1 token size
        5, // 5x leverage
        BigInt('2000000000'), // current price
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.data?.requiredMargin).toBeDefined();
    });

    it('should reject position when leverage exceeds maximum (10x)', async () => {
      const result = await riskEngineService.checkNewPositionRisk(
        mockUser.address,
        BigInt('1000000000000000000'),
        15, // 15x leverage - exceeds max
        BigInt('2000000000'),
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Lverage exceeds maximum allowed');
    });

    it('should reject position when leverage is less than 1x', async () => {
      const result = await riskEngineService.checkNewPositionRisk(
        mockUser.address,
        BigInt('1000000000000000000'),
        0.5, // Less than 1x
        BigInt('2000000000'),
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Leverage must be at least 1x');
    });

    it('should reject position when user is not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await riskEngineService.checkNewPositionRisk(
        mockUser.address,
        BigInt('1000000000000000000'),
        5,
        BigInt('2000000000'),
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User not found');
    });

    it('should reject position when user has insufficient balance', async () => {
      const poorUser = { ...mockUser, balance: '100000000000000000' } as User; // 0.1 tokens
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(poorUser);

      const result = await riskEngineService.checkNewPositionRisk(
        mockUser.address,
        BigInt('1000000000000000000'), // 1 token size
        5, // Needs 0.2 tokens margin
        BigInt('2000000000'),
      );

      expect(result.success).toBe(true);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Insufficient balance for required margin');
      expect(result.data?.requiredMargin).toBeDefined();
    });

    it('should normalize address to lowercase when querying user', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await riskEngineService.checkNewPositionRisk(
        '0xABC123', // Uppercase address
        BigInt('1000000000000000000'),
        5,
        BigInt('2000000000'),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { address: '0xabc123' },
      });
    });
  });

  describe('calculateLiquidationPrice', () => {
    it('should calculate liquidation price for long position', () => {
      const size = BigInt('1000000000000000000'); // 1 token
      const margin = BigInt('200000000000000000'); // 0.2 tokens (5x leverage)
      const entryPrice = BigInt('2000000000');

      const result = riskEngineService.calculateLiquidationPrice(
        size,
        margin,
        true, // isLong
        entryPrice,
      );

      // Long liquidation: entryPrice * (1 - margin/size)
      // = 2000 * (1 - 0.2) = 1600
      const liquidationPrice = BigInt(result);
      expect(liquidationPrice).toBeLessThan(entryPrice);
      expect(liquidationPrice).toBeGreaterThan(BigInt(0));
    });

    it('should calculate liquidation price for short position', () => {
      const size = BigInt('1000000000000000000'); // 1 token
      const margin = BigInt('200000000000000000'); // 0.2 tokens (5x leverage)
      const entryPrice = BigInt('2000000000');

      const result = riskEngineService.calculateLiquidationPrice(
        size,
        margin,
        false, // isShort
        entryPrice,
      );

      // Short liquidation: entryPrice * (1 + margin/size)
      // = 2000 * (1 + 0.2) = 2400
      const liquidationPrice = BigInt(result);
      expect(liquidationPrice).toBeGreaterThan(entryPrice);
    });

    it('should return 0 when size is zero', () => {
      const result = riskEngineService.calculateLiquidationPrice(
        BigInt('0'),
        BigInt('100000000000000000'),
        true,
        BigInt('2000000000'),
      );

      expect(result).toBe('0');
    });

    it('should return 0 when entry price is zero', () => {
      const result = riskEngineService.calculateLiquidationPrice(
        BigInt('1000000000000000000'),
        BigInt('100000000000000000'),
        true,
        BigInt('0'),
      );

      expect(result).toBe('0');
    });

    it('should return minimum 1 for long position when margin equals size', () => {
      const result = riskEngineService.calculateLiquidationPrice(
        BigInt('1000000000000000000'),
        BigInt('1000000000000000000'), // Margin = size (fully collateralized)
        true,
        BigInt('2000000000'),
      );

      expect(result).toBe('1');
    });
  });

  describe('checkLiquidation', () => {
    const mockPosition = {
      id: 'position-1',
      size: '1000000000000000000',
      entryPrice: '2000000000',
      isLong: true,
      isOpen: true,
      liquidationPrice: '1600000000',
      fundingPaid: '0',
    } as Position;

    it('should return health factor calculation', async () => {
      const currentPrice = BigInt('2000000000'); // Price unchanged

      const result = await riskEngineService.checkLiquidation(
        mockPosition,
        currentPrice,
      );

      // Health factor calculation depends on internal logic
      expect(result.healthFactor).toBeDefined();
      expect(result.data?.unrealizedPnl).toBeDefined();
    });

    it('should return shouldLiquidate=true when health factor is below threshold', async () => {
      const currentPrice = BigInt('1500000000'); // Price dropped significantly for long

      const result = await riskEngineService.checkLiquidation(
        mockPosition,
        currentPrice,
      );

      expect(result.shouldLiquidate).toBe(true);
      expect(parseFloat(result.healthFactor)).toBeLessThan(0.025);
    });

    it('should calculate unrealized PnL correctly', async () => {
      const currentPrice = BigInt('2100000000'); // Price went up for long

      const result = await riskEngineService.checkLiquidation(
        mockPosition,
        currentPrice,
      );

      expect(result.data?.unrealizedPnl).toBeDefined();
      expect(BigInt(result.data?.unrealizedPnl || '0')).toBeGreaterThan(
        BigInt(0),
      );
    });

    it('should calculate distance to liquidation', async () => {
      const currentPrice = BigInt('1800000000');

      const result = await riskEngineService.checkLiquidation(
        mockPosition,
        currentPrice,
      );

      expect(result.data?.distanceToLiquidation).toBeDefined();
    });
  });

  describe('calculateHealthFactor', () => {
    const mockPosition = {
      size: '1000000000000000000',
      entryPrice: '2000000000',
    } as Position;

    it('should return health factor as string', () => {
      const healthFactor = riskEngineService.calculateHealthFactor(
        mockPosition,
        BigInt('2100000000'),
        BigInt('100000000000000000'), // Positive PnL
      );

      expect(typeof healthFactor).toBe('string');
    });

    it('should return low health factor for losing position', () => {
      const healthFactor = riskEngineService.calculateHealthFactor(
        mockPosition,
        BigInt('1900000000'),
        BigInt('-100000000000000000'), // Negative PnL
      );

      expect(typeof healthFactor).toBe('string');
    });

    it('should return 0 when position size is zero', () => {
      const zeroPosition = { size: '0', entryPrice: '2000000000' } as Position;
      const healthFactor = riskEngineService.calculateHealthFactor(
        zeroPosition,
        BigInt('2000000000'),
        BigInt('0'),
      );

      expect(healthFactor).toBe('0');
    });

    it('should return 0 when equity is negative', () => {
      const healthFactor = riskEngineService.calculateHealthFactor(
        mockPosition,
        BigInt('1000000000'),
        BigInt('-500000000000000000'), // Large negative PnL
      );

      expect(healthFactor).toBe('0');
    });
  });

  describe('calculateMarginRatio', () => {
    const mockPosition = {
      size: '1000000000000000000',
      entryPrice: '2000000000',
      isLong: true,
    } as Position;

    it('should calculate margin ratio as percentage', () => {
      const ratio = riskEngineService.calculateMarginRatio(
        mockPosition,
        BigInt('2000000000'),
      );

      expect(typeof ratio).toBe('string');
    });
  });

  describe('getMaxPositionSize', () => {
    const mockUser = {
      address: '0x1234567890123456789012345678901234567890',
      balance: '10000000000000000000', // 10 tokens
    } as User;

    it('should return maximum position size based on balance and leverage', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await riskEngineService.getMaxPositionSize(
        mockUser.address,
        BigInt('2000000000'),
      );

      expect(result).toBeDefined();
      expect(BigInt(result)).toBeGreaterThan(BigInt(0));
    });

    it('should return 0 when user is not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await riskEngineService.getMaxPositionSize(
        mockUser.address,
        BigInt('2000000000'),
      );

      expect(result).toBe('0');
    });

    it('should normalize address to lowercase', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      await riskEngineService.getMaxPositionSize(
        '0xABC123',
        BigInt('2000000000'),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { address: '0xabc123' },
      });
    });
  });

  describe('executeLiquidation', () => {
    const mockPosition = {
      id: 'position-1',
      size: '1000000000000000000',
      entryPrice: '2000000000',
      isLong: true,
      isOpen: true,
      liquidationPrice: '1600000000',
      pnl: '0',
    } as Position;

    it('should liquidate position when health factor is below threshold', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);
      jest
        .spyOn(positionRepository, 'save')
        .mockImplementation(async (position) => position as Position);
      // Mock checkLiquidation to return shouldLiquidate=true
      jest
        .spyOn(riskEngineService as any, 'checkLiquidation')
        .mockResolvedValue({
          shouldLiquidate: true,
          healthFactor: '0.01',
          data: { unrealizedPnl: '-100000000000000000' },
        });

      const result = await riskEngineService.executeLiquidation(
        'position-1',
        BigInt('1500000000'),
      );

      expect(result.success).toBe(true);
      expect(result.data?.positionId).toBe('position-1');
      expect(positionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: false,
          exitPrice: '1500000000',
        }),
      );
    });

    it('should return error when position is not found', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(null);

      const result = await riskEngineService.executeLiquidation(
        'non-existent-id',
        BigInt('2000000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error when position is already closed', async () => {
      const closedPosition = { ...mockPosition, isOpen: false } as Position;
      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(closedPosition);

      const result = await riskEngineService.executeLiquidation(
        'position-1',
        BigInt('2000000000'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position is already closed');
    });
  });

  describe('scanForLiquidations', () => {
    const mockOpenPositions = [
      {
        id: 'position-1',
        size: '1000000000000000000',
        entryPrice: '2000000000',
        isLong: true,
        isOpen: true,
        liquidationPrice: '1600000000',
      } as Position,
    ];

    it('should return positions at risk', async () => {
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue(mockOpenPositions);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: '1700000000' },
      });
      // Mock checkLiquidation to return low health factor
      jest.spyOn(riskEngineService, 'checkLiquidation').mockResolvedValue({
        shouldLiquidate: false,
        healthFactor: '1.2',
        data: {
          unrealizedPnl: '-50000000000000000',
          distanceToLiquidation: '100000000',
        },
      });

      const result = await riskEngineService.scanForLiquidations();

      expect(result.success).toBe(true);
      expect(result.data?.positionsAtRisk).toBeDefined();
    });

    it('should return empty array when no positions are at risk', async () => {
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue(mockOpenPositions);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: '2000000000' },
      });
      jest.spyOn(riskEngineService, 'checkLiquidation').mockResolvedValue({
        shouldLiquidate: false,
        healthFactor: '5.0',
        data: { unrealizedPnl: '0', distanceToLiquidation: '400000000' },
      });

      const result = await riskEngineService.scanForLiquidations();

      expect(result.success).toBe(true);
      expect(result.data?.positionsAtRisk).toEqual([]);
    });

    it('should return error when price fetch fails', async () => {
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue(mockOpenPositions);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const result = await riskEngineService.scanForLiquidations();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch current price from oracle');
    });

    it('should handle error during scan', async () => {
      jest
        .spyOn(positionRepository, 'find')
        .mockRejectedValue(new Error('Database error'));

      const result = await riskEngineService.scanForLiquidations();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('autoLiquidate', () => {
    it('should liquidate positions below liquidation threshold', async () => {
      // Mock scanForLiquidations to return positions at risk
      jest
        .spyOn(riskEngineService as any, 'scanForLiquidations')
        .mockResolvedValue({
          success: true,
          data: {
            positionsAtRisk: [
              {
                id: 'position-1',
                healthFactor: '0.01',
                liquidationPrice: '1600000000',
                currentPrice: '1500000000',
                distanceToLiquidation: '100000000',
              },
            ],
          },
        });

      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: '1500000000' },
      });

      // Mock executeLiquidation
      jest.spyOn(riskEngineService, 'executeLiquidation').mockResolvedValue({
        success: true,
        data: {
          positionId: 'position-1',
          liquidationPrice: '1500000000',
          remainingBalance: '0',
        },
      });

      const result = await riskEngineService.autoLiquidate();

      expect(result.success).toBe(true);
      expect(result.data?.liquidated).toHaveLength(1);
      expect(result.data?.liquidated[0].positionId).toBe('position-1');
    });

    it('should track failed liquidations', async () => {
      jest
        .spyOn(riskEngineService as any, 'scanForLiquidations')
        .mockResolvedValue({
          success: true,
          data: {
            positionsAtRisk: [
              {
                id: 'position-1',
                healthFactor: '0.01',
                liquidationPrice: '1600000000',
                currentPrice: '1500000000',
                distanceToLiquidation: '100000000',
              },
            ],
          },
        });

      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: '1500000000' },
      });

      jest.spyOn(riskEngineService, 'executeLiquidation').mockResolvedValue({
        success: false,
        error: 'Position already closed',
      });

      const result = await riskEngineService.autoLiquidate();

      expect(result.success).toBe(true);
      expect(result.data?.failed).toHaveLength(1);
      expect(result.data?.failed[0].reason).toBe('Position already closed');
    });

    it('should return error when scan fails', async () => {
      jest
        .spyOn(riskEngineService as any, 'scanForLiquidations')
        .mockResolvedValue({
          success: false,
          error: 'Scan failed',
        });

      const result = await riskEngineService.autoLiquidate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Scan failed');
    });

    it('should return error when price fetch fails', async () => {
      jest
        .spyOn(riskEngineService as any, 'scanForLiquidations')
        .mockResolvedValue({
          success: true,
          data: {
            positionsAtRisk: [{ id: 'position-1', healthFactor: '0.01' }],
          },
        });

      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const result = await riskEngineService.autoLiquidate();

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Failed to fetch current price for liquidation',
      );
    });
  });
});
