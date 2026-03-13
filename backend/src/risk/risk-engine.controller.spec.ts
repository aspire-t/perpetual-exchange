import { Test, TestingModule } from '@nestjs/testing';
import { RiskEngineController } from './risk-engine.controller';
import { RiskEngineService } from './risk-engine.service';

describe('RiskEngineController', () => {
  let riskEngineController: RiskEngineController;
  let riskEngineService: RiskEngineService;

  const mockRiskEngineService = {
    checkNewPositionRisk: jest.fn(),
    checkLiquidation: jest.fn(),
    scanForLiquidations: jest.fn(),
    executeLiquidation: jest.fn(),
    autoLiquidate: jest.fn(),
    getMaxPositionSize: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RiskEngineController],
      providers: [
        {
          provide: RiskEngineService,
          useValue: mockRiskEngineService,
        },
      ],
    }).compile();

    riskEngineController =
      module.get<RiskEngineController>(RiskEngineController);
    riskEngineService = module.get<RiskEngineService>(RiskEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkPositionRisk', () => {
    it('should return error when size is missing', async () => {
      const result = await riskEngineController.checkPositionRisk(
        '0x123',
        undefined,
        '5',
      );

      expect(result).toEqual({
        success: false,
        error: 'Size and leverage are required',
      });
    });

    it('should return error when leverage is missing', async () => {
      const result = await riskEngineController.checkPositionRisk(
        '0x123',
        '1000',
        undefined,
      );

      expect(result).toEqual({
        success: false,
        error: 'Size and leverage are required',
      });
    });

    it('should check position risk and return result', async () => {
      const mockResult = {
        success: true,
        data: {
          allowed: true,
          healthFactor: '1.5',
          maxLeverage: 10,
        },
      };
      mockRiskEngineService.checkNewPositionRisk.mockResolvedValue(mockResult);

      const result = await riskEngineController.checkPositionRisk(
        '0x123',
        '1000',
        '5',
      );

      expect(result).toEqual(mockResult);
      expect(riskEngineService.checkNewPositionRisk).toHaveBeenCalledWith(
        '0x123',
        BigInt('1000'),
        5,
        BigInt(0),
      );
    });
  });

  describe('checkLiquidation', () => {
    const mockPosition = {
      id: 'position-1',
      size: BigInt('1000'),
      entryPrice: BigInt('2000'),
      isLong: true,
      isOpen: true,
    };

    it('should return error when position not found', async () => {
      // Mock the private property access in controller
      const mockRepository = { findOne: jest.fn().mockResolvedValue(null) };
      Object.defineProperty(riskEngineService, 'positionRepository', {
        get: () => mockRepository,
        configurable: true,
      });

      const result = await riskEngineController.checkLiquidation('invalid-id');

      expect(result).toEqual({
        success: false,
        error: 'Position not found',
      });
    });

    it('should return error when price fetch fails', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockPosition),
      };
      const mockPriceService = {
        getPrice: jest.fn().mockResolvedValue({ success: false }),
      };
      Object.defineProperty(riskEngineService, 'positionRepository', {
        get: () => mockRepository,
        configurable: true,
      });
      Object.defineProperty(riskEngineService, 'priceService', {
        get: () => mockPriceService,
        configurable: true,
      });

      const result = await riskEngineController.checkLiquidation('position-1');

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch price from oracle',
      });
    });

    it('should check liquidation status and return result', async () => {
      const mockRepository = {
        findOne: jest.fn().mockResolvedValue(mockPosition),
      };
      const mockPriceService = {
        getPrice: jest.fn().mockResolvedValue({
          success: true,
          data: { price: '2000' },
        }),
      };
      Object.defineProperty(riskEngineService, 'positionRepository', {
        get: () => mockRepository,
        configurable: true,
      });
      Object.defineProperty(riskEngineService, 'priceService', {
        get: () => mockPriceService,
        configurable: true,
      });
      mockRiskEngineService.checkLiquidation.mockResolvedValue({
        shouldLiquidate: false,
        healthFactor: '1.2',
        data: {
          unrealizedPnl: '100',
          marginRatio: '0.1',
          distanceToLiquidation: '200',
        },
      });

      const result = await riskEngineController.checkLiquidation('position-1');

      expect(result).toEqual({
        success: true,
        data: {
          positionId: 'position-1',
          shouldLiquidate: false,
          healthFactor: '1.2',
          unrealizedPnl: '100',
          marginRatio: '0.1',
          distanceToLiquidation: '200',
          currentPrice: '2000',
        },
      });
    });
  });

  describe('scanLiquidations', () => {
    it('should scan for liquidations and return result', async () => {
      const mockResult = {
        success: true,
        data: {
          positionsScanned: 10,
          liquidationsFound: 2,
          liquidations: ['position-1', 'position-2'],
        },
      };
      mockRiskEngineService.scanForLiquidations.mockResolvedValue(mockResult);

      const result = await riskEngineController.scanLiquidations();

      expect(result).toEqual(mockResult);
      expect(riskEngineService.scanForLiquidations).toHaveBeenCalled();
    });
  });

  describe('executeLiquidation', () => {
    it('should return error when price fetch fails', async () => {
      const mockPriceService = {
        getPrice: jest.fn().mockResolvedValue({ success: false }),
      };
      Object.defineProperty(riskEngineService, 'priceService', {
        get: () => mockPriceService,
        configurable: true,
      });

      const result =
        await riskEngineController.executeLiquidation('position-1');

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch price from oracle',
      });
    });

    it('should execute liquidation and return result', async () => {
      const mockPriceService = {
        getPrice: jest.fn().mockResolvedValue({
          success: true,
          data: { price: '2000' },
        }),
      };
      Object.defineProperty(riskEngineService, 'priceService', {
        get: () => mockPriceService,
        configurable: true,
      });
      mockRiskEngineService.executeLiquidation.mockResolvedValue({
        success: true,
        data: { liquidatedPositionId: 'position-1' },
      });

      const result =
        await riskEngineController.executeLiquidation('position-1');

      expect(result).toEqual({
        success: true,
        data: { liquidatedPositionId: 'position-1' },
      });
      expect(riskEngineService.executeLiquidation).toHaveBeenCalledWith(
        'position-1',
        BigInt('2000'),
      );
    });
  });

  describe('autoLiquidate', () => {
    it('should auto-liquidate all breaching positions', async () => {
      const mockResult = {
        success: true,
        data: {
          positionsLiquidated: 3,
          liquidatedPositions: ['position-1', 'position-2', 'position-3'],
        },
      };
      mockRiskEngineService.autoLiquidate.mockResolvedValue(mockResult);

      const result = await riskEngineController.autoLiquidate();

      expect(result).toEqual(mockResult);
      expect(riskEngineService.autoLiquidate).toHaveBeenCalled();
    });
  });

  describe('getMaxPositionSize', () => {
    it('should get maximum position size for user', async () => {
      mockRiskEngineService.getMaxPositionSize.mockResolvedValue(
        BigInt('5000'),
      );

      const result = await riskEngineController.getMaxPositionSize('0x123');

      expect(result).toEqual({
        success: true,
        data: { maxSize: BigInt('5000') },
      });
      expect(riskEngineService.getMaxPositionSize).toHaveBeenCalledWith(
        '0x123',
        BigInt(0),
      );
    });
  });
});
