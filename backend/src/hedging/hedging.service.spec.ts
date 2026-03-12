import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HedgingService } from './hedging.service';
import { Hedge, HedgeStatus } from '../entities/Hedge.entity';
import { Position } from '../entities/Position.entity';
import { PriceService } from '../price/price.service';

describe('HedgingService', () => {
  let hedgingService: HedgingService;
  let hedgeRepository: Repository<Hedge>;
  let positionRepository: Repository<Position>;
  let priceService: PriceService;

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

  beforeEach(async () => {
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
      ],
    }).compile();

    hedgingService = module.get<HedgingService>(HedgingService);
    hedgeRepository = module.get<Repository<Hedge>>(getRepositoryToken(Hedge));
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
    priceService = module.get<PriceService>(PriceService);
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

    it('should open a short hedge for a long position', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(hedgeRepository, 'create').mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.positionId = mockPosition.id;
        hedge.size = mockPosition.size;
        hedge.entryPrice = mockPosition.entryPrice;
        hedge.isShort = mockPosition.isLong;
        hedge.status = HedgeStatus.OPEN;
        return hedge;
      });
      jest.spyOn(hedgeRepository, 'save').mockResolvedValue({
        id: 'hedge-1',
        positionId: mockPosition.id,
        size: mockPosition.size,
        entryPrice: mockPosition.entryPrice,
        isShort: true,
        status: HedgeStatus.OPEN,
        createdAt: new Date(),
      } as Hedge);

      const result = await hedgingService.openHedge(mockPosition.id);

      expect(result.success).toBe(true);
      expect(result.data?.isShort).toBe(true);
      expect(result.data?.size).toBe(mockPosition.size.toString());
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

      jest
        .spyOn(positionRepository, 'findOne')
        .mockResolvedValue(shortPosition);
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(hedgeRepository, 'create').mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.positionId = shortPosition.id;
        hedge.size = shortPosition.size;
        hedge.entryPrice = shortPosition.entryPrice;
        hedge.isShort = shortPosition.isLong;
        hedge.status = HedgeStatus.OPEN;
        return hedge;
      });
      jest.spyOn(hedgeRepository, 'save').mockResolvedValue({
        id: 'hedge-2',
        positionId: shortPosition.id,
        size: shortPosition.size,
        entryPrice: shortPosition.entryPrice,
        isShort: false,
        status: HedgeStatus.OPEN,
        createdAt: new Date(),
      } as Hedge);

      const result = await hedgingService.openHedge(shortPosition.id);

      expect(result.success).toBe(true);
      expect(result.data?.isShort).toBe(false);
    });

    it('should return error when position not found', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(null);

      const result = await hedgingService.openHedge('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Position not found');
    });

    it('should return error when hedge already exists for position', async () => {
      const existingHedge = {
        id: 'hedge-1',
        positionId: 'position-1',
        status: HedgeStatus.OPEN,
      } as Hedge;

      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(existingHedge);

      const result = await hedgingService.openHedge(mockPosition.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Hedge already exists');
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

    it('should close a hedge with profit', async () => {
      const exitPrice = BigInt('1900000000'); // Price went down, short hedge profits

      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(mockOpenHedge);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { coin: 'ETH', price: exitPrice.toString() },
      });
      jest.spyOn(hedgeRepository, 'save').mockResolvedValue({
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
    });

    it('should return error when hedge not found', async () => {
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(null);

      const result = await hedgingService.closeHedge('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hedge not found');
    });

    it('should return error when hedge is already closed', async () => {
      const closedHedge = {
        ...mockOpenHedge,
        status: HedgeStatus.CLOSED,
      } as Hedge;

      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(closedHedge);

      const result = await hedgingService.closeHedge('hedge-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hedge is already closed');
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

    it('should automatically open hedge when position is opened', async () => {
      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(hedgeRepository, 'create').mockImplementation(() => {
        const hedge = {} as Hedge;
        hedge.positionId = mockPosition.id;
        hedge.size = mockPosition.size;
        hedge.entryPrice = mockPosition.entryPrice;
        hedge.isShort = mockPosition.isLong;
        hedge.status = HedgeStatus.OPEN;
        return hedge;
      });
      jest.spyOn(hedgeRepository, 'save').mockResolvedValue({
        id: 'hedge-1',
        positionId: mockPosition.id,
        size: mockPosition.size,
        entryPrice: mockPosition.entryPrice,
        isShort: true,
        status: HedgeStatus.OPEN,
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

      jest.spyOn(positionRepository, 'findOne').mockResolvedValue(mockPosition);
      jest.spyOn(hedgeRepository, 'findOne').mockResolvedValue(existingHedge);

      const result = await hedgingService.autoHedge(mockPosition.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Hedge already exists');
      expect(hedgeRepository.create).not.toHaveBeenCalled();
      expect(hedgeRepository.save).not.toHaveBeenCalled();
    });
  });
});
