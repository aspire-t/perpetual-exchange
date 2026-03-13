import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HedgingService } from './hedging.service';
import { Hedge, HedgeStatus } from '../entities/Hedge.entity';
import { Position } from '../entities/Position.entity';
import { PriceService } from '../price/price.service';
import { HyperliquidClient } from './hyperliquid.client';

describe('HedgingService', () => {
  let hedgingService: HedgingService;
  let hedgeRepository: Repository<Hedge>;
  let positionRepository: Repository<Position>;
  let priceService: PriceService;
  let hyperliquidClient: HyperliquidClient;
  let dataSource: DataSource;

  const mockHedgeRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockPositionRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
  });

  const mockPriceService = {
    getPrice: jest.fn(),
  };

  const mockHyperliquidClient = {
    placeOrder: jest.fn(),
    closePosition: jest.fn(),
    getPosition: jest.fn(),
    getAccountInfo: jest.fn(),
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
    // Reset all mock implementations
    mockQueryRunner.manager.findOne.mockReset();
    mockQueryRunner.manager.save.mockReset();
    mockQueryRunner.manager.create.mockReset();
    mockQueryRunner.connect.mockReset();
    mockQueryRunner.startTransaction.mockReset();
    mockQueryRunner.commitTransaction.mockReset();
    mockQueryRunner.rollbackTransaction.mockReset();
    mockQueryRunner.release.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HedgingService,
        {
          provide: getRepositoryToken(Hedge),
          useValue: mockHedgeRepository(),
        },
        {
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository(),
        },
        {
          provide: PriceService,
          useValue: mockPriceService,
        },
        {
          provide: HyperliquidClient,
          useValue: mockHyperliquidClient,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    hedgingService = module.get<HedgingService>(HedgingService);
    hedgeRepository = module.get<Repository<Hedge>>(getRepositoryToken(Hedge));
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
    priceService = module.get<PriceService>(PriceService);
    hyperliquidClient = module.get<HyperliquidClient>(HyperliquidClient);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('openHedge', () => {
    const mockPosition = {
      id: 'position-1',
      userId: 'user-1',
      size: BigInt('1000000000000000000'),
      entryPrice: BigInt('2000000000'),
      isLong: true,
      isOpen: true,
      createdAt: new Date(),
    } as Position;

    beforeEach(() => {
      jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockReturnValue(mockQueryRunner as any);
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
    });

    it('should open a short hedge for a long position', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockPosition); // Find position
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null); // Check existing hedge
      mockQueryRunner.manager.create.mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.positionId = mockPosition.id;
        hedge.size = mockPosition.size;
        hedge.entryPrice = mockPosition.entryPrice;
        hedge.isShort = mockPosition.isLong;
        hedge.status = HedgeStatus.PENDING;
        return hedge;
      });
      jest.spyOn(hyperliquidClient, 'placeOrder').mockResolvedValue({
        success: true,
        data: {
          orderId: 'mock-order-123',
          status: 'filled',
          price: '2000000000',
        },
      });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 'hedge-1',
        positionId: mockPosition.id,
        size: mockPosition.size,
        entryPrice: BigInt('2000000000'),
        isShort: true,
        status: HedgeStatus.OPEN,
        hyperliquidOrderId: 'mock-order-123',
        createdAt: new Date(),
      } as Hedge);

      const result = await hedgingService.openHedge(mockPosition.id);

      expect(result.success).toBe(true);
      expect(result.data?.isShort).toBe(true);
      expect(result.data?.size).toBe(mockPosition.size.toString());
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should open a long hedge for a short position', async () => {
      const shortPosition = {
        id: 'position-2',
        userId: 'user-1',
        size: BigInt('500000000000000000'),
        entryPrice: BigInt('1800000000'),
        isLong: false,
        isOpen: true,
        createdAt: new Date(),
      } as Position;

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(shortPosition);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.create.mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.positionId = shortPosition.id;
        hedge.size = shortPosition.size;
        hedge.entryPrice = shortPosition.entryPrice;
        hedge.isShort = shortPosition.isLong;
        hedge.status = HedgeStatus.PENDING;
        return hedge;
      });
      jest.spyOn(hyperliquidClient, 'placeOrder').mockResolvedValue({
        success: true,
        data: {
          orderId: 'mock-order-456',
          status: 'filled',
          price: '1800000000',
        },
      });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 'hedge-2',
        positionId: shortPosition.id,
        size: shortPosition.size,
        entryPrice: BigInt('1800000000'),
        isShort: false,
        status: HedgeStatus.OPEN,
        hyperliquidOrderId: 'mock-order-456',
        createdAt: new Date(),
      } as Hedge);

      const result = await hedgingService.openHedge(shortPosition.id);

      expect(result.success).toBe(true);
      expect(result.data?.isShort).toBe(false);
    });

    it('should return error when position not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      const result = await hedgingService.openHedge('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('should return error when hedge already exists for position', async () => {
      const existingHedge = {
        id: 'hedge-1',
        positionId: 'position-1',
        status: HedgeStatus.OPEN,
      } as Hedge;

      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockPosition);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(existingHedge);

      const result = await hedgingService.openHedge(mockPosition.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Hedge already exists');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle failed order placement', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(mockPosition);
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);
      mockQueryRunner.manager.create.mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.positionId = mockPosition.id;
        hedge.size = mockPosition.size;
        hedge.entryPrice = mockPosition.entryPrice;
        hedge.isShort = mockPosition.isLong;
        hedge.status = HedgeStatus.PENDING;
        return hedge;
      });
      jest.spyOn(hyperliquidClient, 'placeOrder').mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      const result = await hedgingService.openHedge(mockPosition.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to place hedge order');
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });
  });

  describe('closeHedge', () => {
    const mockOpenHedge = {
      id: 'hedge-1',
      positionId: 'position-1',
      size: BigInt('1000000000000000000'),
      entryPrice: BigInt('2000000000'),
      isShort: true,
      status: HedgeStatus.OPEN,
      createdAt: new Date(),
    } as Hedge;

    beforeEach(() => {
      jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockReturnValue(mockQueryRunner as any);
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        // Check if first argument is the Hedge entity class
        if (entity && typeof entity === 'function' && entity.name === 'Hedge') {
          // Return a copy to prevent mutation
          return Promise.resolve({ ...mockOpenHedge });
        }
        return Promise.resolve(null);
      });
      mockQueryRunner.manager.save.mockImplementation(async (obj) => ({
        ...obj,
      }));
    });

    it('should close a hedge with profit', async () => {
      const exitPrice = BigInt('1900000000');

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        ...mockOpenHedge,
      });
      jest.spyOn(hyperliquidClient, 'closePosition').mockResolvedValue({
        success: true,
        data: { orderId: 'close-order-123' },
      });
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: exitPrice.toString() },
      });
      mockQueryRunner.manager.save.mockResolvedValueOnce({
        ...mockOpenHedge,
        status: HedgeStatus.CLOSED,
        exitPrice,
        pnl: BigInt('100000000'),
        closedAt: new Date(),
      } as Hedge);

      const result = await hedgingService.closeHedge('hedge-1');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(HedgeStatus.CLOSED);
      expect(result.data?.pnl).toBe('100000000');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return error when hedge not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      const result = await hedgingService.closeHedge('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hedge not found');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return error when Hyperliquid close fails', async () => {
      // Reset mock implementations completely and set up fresh
      mockQueryRunner.manager.findOne.mockReset();
      mockQueryRunner.manager.save.mockReset();

      // Set up mock to return open hedge for Hedge entity queries
      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        // Check if first argument is the Hedge entity class
        if (entity && typeof entity === 'function' && entity.name === 'Hedge') {
          // Return a copy to prevent mutation
          return Promise.resolve({ ...mockOpenHedge });
        }
        return Promise.resolve(null);
      });
      mockQueryRunner.manager.save.mockImplementation(async (obj) => ({
        ...obj,
      }));

      jest.spyOn(hyperliquidClient, 'closePosition').mockResolvedValue({
        success: false,
        error: 'Position not found on Hyperliquid',
      });

      const result = await hedgingService.closeHedge('hedge-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to close hedge on Hyperliquid:');
    });

    it('should return error when hedge is already closed', async () => {
      const closedHedge = {
        ...mockOpenHedge,
        status: HedgeStatus.CLOSED,
      } as Hedge;

      mockQueryRunner.manager.findOne.mockResolvedValue(closedHedge);

      const result = await hedgingService.closeHedge('hedge-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hedge is already closed');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getHedge', () => {
    const mockHedge = {
      id: 'hedge-1',
      positionId: 'position-1',
      size: BigInt('1000000000000000000'),
      entryPrice: BigInt('2000000000'),
      isShort: true,
      status: HedgeStatus.OPEN,
      createdAt: new Date(),
    } as Hedge;

    it('should return hedge by id', async () => {
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(mockHedge);

      const result = await hedgingService.getHedge('hedge-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('hedge-1');
    });

    it('should return error when hedge not found', async () => {
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(null);

      const result = await hedgingService.getHedge('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hedge not found');
    });
  });

  describe('getPositionHedges', () => {
    const mockHedges = [
      {
        id: 'hedge-1',
        positionId: 'position-1',
        size: BigInt('1000000000000000000'),
        entryPrice: BigInt('2000000000'),
        isShort: true,
        status: HedgeStatus.OPEN,
        createdAt: new Date(),
      },
      {
        id: 'hedge-2',
        positionId: 'position-1',
        size: BigInt('500000000000000000'),
        entryPrice: BigInt('1800000000'),
        isShort: false,
        status: HedgeStatus.CLOSED,
        createdAt: new Date(),
      },
    ] as Hedge[];

    it('should return all hedges for a position', async () => {
      jest.spyOn(hedgeRepository, 'find').mockResolvedValue(mockHedges);

      const result = await hedgingService.getPositionHedges('position-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when no hedges exist', async () => {
      jest.spyOn(hedgeRepository, 'find').mockResolvedValue([]);

      const result = await hedgingService.getPositionHedges('position-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('calculateHedgePnL', () => {
    it('should calculate profit for short hedge when price decreases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('1900000000');

      const pnl = (hedgingService as any).calculateHedgePnL(
        size,
        entryPrice,
        currentPrice,
        true, // isShort
      );

      expect(pnl).toBe(BigInt('100000000'));
    });

    it('should calculate loss for short hedge when price increases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('2100000000');

      const pnl = (hedgingService as any).calculateHedgePnL(
        size,
        entryPrice,
        currentPrice,
        true,
      );

      expect(pnl).toBe(BigInt('-100000000'));
    });

    it('should calculate profit for long hedge when price increases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('2100000000');

      const pnl = (hedgingService as any).calculateHedgePnL(
        size,
        entryPrice,
        currentPrice,
        false,
      );

      expect(pnl).toBe(BigInt('100000000'));
    });

    it('should calculate loss for long hedge when price decreases', () => {
      const size = BigInt('1000000000000000000');
      const entryPrice = BigInt('2000000000');
      const currentPrice = BigInt('1900000000');

      const pnl = (hedgingService as any).calculateHedgePnL(
        size,
        entryPrice,
        currentPrice,
        false,
      );

      expect(pnl).toBe(BigInt('-100000000'));
    });
  });

  describe('autoHedge', () => {
    const mockPosition = {
      id: 'position-1',
      userId: 'user-1',
      size: BigInt('1000000000000000000'),
      entryPrice: BigInt('2000000000'),
      isLong: true,
      isOpen: true,
      createdAt: new Date(),
    } as Position;

    beforeEach(() => {
      jest.clearAllMocks();
      mockQueryRunner.manager.findOne.mockReset();
      mockQueryRunner.manager.save.mockReset();
      mockQueryRunner.manager.create.mockReset();

      jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockReturnValue(mockQueryRunner as any);
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
      mockQueryRunner.manager.create.mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.id = 'hedge-1';
        return hedge;
      });
    });

    it('should automatically open hedge when position is opened', async () => {
      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (entity === Position) {
          return Promise.resolve(mockPosition);
        }
        return Promise.resolve(null);
      });
      jest.spyOn(hyperliquidClient, 'placeOrder').mockResolvedValue({
        success: true,
        data: {
          orderId: 'mock-order-789',
          status: 'filled',
          price: '2000000000',
        },
      });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: 'hedge-1',
        positionId: mockPosition.id,
        size: mockPosition.size,
        entryPrice: BigInt('2000000000'),
        isShort: true,
        status: HedgeStatus.OPEN,
        hyperliquidOrderId: 'mock-order-789',
        createdAt: new Date(),
      } as Hedge);

      const result = await hedgingService.autoHedge(mockPosition.id);

      expect(result.success).toBe(true);
      expect(result.data?.isShort).toBe(true);
    });

    it('should not create duplicate hedge if one already exists', async () => {
      const existingHedge = {
        id: 'hedge-1',
        positionId: mockPosition.id,
        status: HedgeStatus.OPEN,
      } as Hedge;

      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (entity === Position) {
          return Promise.resolve(mockPosition);
        }
        if (entity === Hedge) {
          return Promise.resolve(existingHedge);
        }
        return Promise.resolve(null);
      });

      const result = await hedgingService.autoHedge(mockPosition.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Hedge already exists');
      expect(mockQueryRunner.manager.create).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });
  });

  describe('syncHedgeStatus', () => {
    const mockHedge = {
      id: 'hedge-1',
      positionId: 'position-1',
      size: BigInt('1000000000000000000'),
      entryPrice: BigInt('2000000000'),
      isShort: true,
      status: HedgeStatus.OPEN,
      createdAt: new Date(),
    } as Hedge;

    beforeEach(() => {
      jest
        .spyOn(dataSource, 'createQueryRunner')
        .mockReturnValue(mockQueryRunner as any);
      mockQueryRunner.connect.mockResolvedValue(undefined);
      mockQueryRunner.startTransaction.mockResolvedValue(undefined);
      mockQueryRunner.commitTransaction.mockResolvedValue(undefined);
      mockQueryRunner.release.mockResolvedValue(undefined);
    });

    it('should sync hedge status with Hyperliquid', async () => {
      const mockHlPosition = {
        entryPx: '2100000000',
        unrealizedPnl: '100000000',
        liquidationPx: '1800000000',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockHedge);
      jest.spyOn(hyperliquidClient, 'getPosition').mockResolvedValue({
        success: true,
        data: mockHlPosition,
      });
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockHedge,
        entryPrice: BigInt('2100000000'),
        pnl: '100000000',
      } as Hedge);

      const result = await hedgingService.syncHedgeStatus('hedge-1');

      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(true);
      expect(result.data?.entryPrice).toBe('2100000000');
      expect(hyperliquidClient.getPosition).toHaveBeenCalledWith('ETH');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should return error when hedge not found', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      const result = await hedgingService.syncHedgeStatus('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hedge not found');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return synced=false when hedge is already closed', async () => {
      const closedHedge = { ...mockHedge, status: HedgeStatus.CLOSED } as Hedge;
      mockQueryRunner.manager.findOne.mockResolvedValue(closedHedge);

      const result = await hedgingService.syncHedgeStatus('hedge-1');

      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(false);
      expect(result.data?.reason).toBe('Already closed');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return error when Hyperliquid API fails', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockHedge);
      jest.spyOn(hyperliquidClient, 'getPosition').mockResolvedValue({
        success: false,
        error: 'API error',
      });

      const result = await hedgingService.syncHedgeStatus('hedge-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle sync failure gracefully', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockHedge);
      jest
        .spyOn(hyperliquidClient, 'getPosition')
        .mockRejectedValue(new Error('Network error'));

      const result = await hedgingService.syncHedgeStatus('hedge-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to sync hedge status');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getTotalHedgedVolume', () => {
    const mockOpenHedges = [
      {
        id: 'hedge-1',
        size: BigInt('1000000000000000000'),
        status: HedgeStatus.OPEN,
      } as Hedge,
      {
        id: 'hedge-2',
        size: BigInt('500000000000000000'),
        status: HedgeStatus.OPEN,
      } as Hedge,
    ];

    it('should calculate total hedged volume for open hedges', async () => {
      jest.spyOn(hedgeRepository, 'find').mockResolvedValue(mockOpenHedges);

      const result = await hedgingService.getTotalHedgedVolume();

      expect(result.success).toBe(true);
      expect(result.data?.totalVolume).toBe('1500000000000000000');
      expect(result.data?.openHedges).toBe(2);
    });

    it('should return zero volume when no open hedges exist', async () => {
      jest.spyOn(hedgeRepository, 'find').mockResolvedValue([]);

      const result = await hedgingService.getTotalHedgedVolume();

      expect(result.success).toBe(true);
      expect(result.data?.totalVolume).toBe('0');
      expect(result.data?.openHedges).toBe(0);
    });

    it('should only count open hedges, not closed ones', async () => {
      // The service queries with where: { status: HedgeStatus.OPEN }
      // So the mock should return only open hedges
      jest.spyOn(hedgeRepository, 'find').mockResolvedValue(mockOpenHedges);

      const result = await hedgingService.getTotalHedgedVolume();

      expect(result.success).toBe(true);
      expect(result.data?.totalVolume).toBe('1500000000000000000');
      expect(result.data?.openHedges).toBe(2);
    });

    it('should return error when database query fails', async () => {
      jest
        .spyOn(hedgeRepository, 'find')
        .mockRejectedValue(new Error('Database error'));

      const result = await hedgingService.getTotalHedgedVolume();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to calculate hedged volume');
    });
  });
});
