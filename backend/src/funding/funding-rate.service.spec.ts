import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FundingRateService } from './funding-rate.service';
import { FundingRate } from '../entities/FundingRate.entity';
import { Position } from '../entities/Position.entity';
import { PriceService } from '../price/price.service';

jest.useFakeTimers();

describe('FundingRateService', () => {
  let fundingRateService: FundingRateService;
  let fundingRateRepository: Repository<FundingRate>;
  let positionRepository: Repository<Position>;
  let now: number;

  const mockFundingRateRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  });

  const mockPositionRepository = () => ({
    find: jest.fn(),
    save: jest.fn(),
  });

  const mockPriceService = {
    getPrice: jest.fn(),
  };

  beforeEach(async () => {
    now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundingRateService,
        {
          provide: getRepositoryToken(FundingRate),
          useValue: mockFundingRateRepository(),
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

    fundingRateService = module.get<FundingRateService>(FundingRateService);
    fundingRateRepository = module.get<Repository<FundingRate>>(
      getRepositoryToken(FundingRate),
    );
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getCurrentFundingRate', () => {
    it('should return latest funding rate from database', async () => {
      const mockRate = { symbol: 'ETH', rate: '0.00015' } as FundingRate;
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(mockRate);

      const result = await fundingRateService.getCurrentFundingRate('ETH');

      expect(result).toBe('0.00015');
      expect(fundingRateRepository.findOne).toHaveBeenCalledWith({
        where: { symbol: 'ETH' },
        order: { timestamp: 'DESC' },
      });
    });

    it('should return default rate when no rate exists in database', async () => {
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(null);

      const result = await fundingRateService.getCurrentFundingRate('ETH');

      expect(result).toBe('0.0001');
    });

    it('should cache the funding rate and return cached value on subsequent calls within TTL', async () => {
      const mockRate = { symbol: 'ETH', rate: '0.00015' } as FundingRate;
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(mockRate);

      const firstResult = await fundingRateService.getCurrentFundingRate('ETH');
      expect(firstResult).toBe('0.00015');

      const secondResult =
        await fundingRateService.getCurrentFundingRate('ETH');
      expect(secondResult).toBe('0.00015');

      expect(fundingRateRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should refetch funding rate after TTL expires', async () => {
      const mockRate = { symbol: 'ETH', rate: '0.00015' } as FundingRate;
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(mockRate);

      await fundingRateService.getCurrentFundingRate('ETH');

      // Advance time by 61 seconds (TTL is 60 seconds)
      now += 61000;
      jest.advanceTimersByTime(61000);

      const mockRate2 = { symbol: 'ETH', rate: '0.00020' } as FundingRate;
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(mockRate2);

      const result = await fundingRateService.getCurrentFundingRate('ETH');

      expect(result).toBe('0.00020');
      expect(fundingRateRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should cache different symbols separately', async () => {
      const mockEthRate = { symbol: 'ETH', rate: '0.00015' } as FundingRate;
      const mockBtcRate = { symbol: 'BTC', rate: '0.00010' } as FundingRate;

      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValueOnce(mockEthRate);
      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValueOnce(mockBtcRate);

      await fundingRateService.getCurrentFundingRate('ETH');
      await fundingRateService.getCurrentFundingRate('BTC');

      expect(fundingRateRepository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should cache different symbols separately and reuse cached values', async () => {
      const mockEthRate = { symbol: 'ETH', rate: '0.00015' } as FundingRate;
      const mockBtcRate = { symbol: 'BTC', rate: '0.00010' } as FundingRate;

      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValueOnce(mockEthRate);
      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValueOnce(mockBtcRate);

      await fundingRateService.getCurrentFundingRate('ETH');
      await fundingRateService.getCurrentFundingRate('BTC');
      await fundingRateService.getCurrentFundingRate('ETH');
      await fundingRateService.getCurrentFundingRate('BTC');

      expect(fundingRateRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateFundingRate', () => {
    it('should return default rate when index price is zero', () => {
      const result = fundingRateService.calculateFundingRate(
        'ETH',
        BigInt('2000000000'),
        BigInt('0'),
      );

      expect(result).toBe('0.0001');
    });

    it('should calculate positive rate when mark price > index price', () => {
      const markPrice = BigInt('2002000000'); // 2002
      const indexPrice = BigInt('2000000000'); // 2000

      const result = fundingRateService.calculateFundingRate(
        'ETH',
        markPrice,
        indexPrice,
      );

      const expectedRate = (2002 - 2000) / 2000; // 0.001
      expect(parseFloat(result)).toBeCloseTo(expectedRate, 4);
    });

    it('should calculate negative rate when mark price < index price', () => {
      const markPrice = BigInt('1998000000'); // 1998
      const indexPrice = BigInt('2000000000'); // 2000

      const result = fundingRateService.calculateFundingRate(
        'ETH',
        markPrice,
        indexPrice,
      );

      const expectedRate = (1998 - 2000) / 2000; // -0.001
      expect(parseFloat(result)).toBeCloseTo(expectedRate, 4);
    });

    it('should clamp rate to maximum 0.1%', () => {
      const markPrice = BigInt('3000000000'); // Large premium
      const indexPrice = BigInt('2000000000');

      const result = fundingRateService.calculateFundingRate(
        'ETH',
        markPrice,
        indexPrice,
      );

      expect(result).toBe('0.001'); // Clamped to 0.1%
    });

    it('should clamp rate to minimum -0.1%', () => {
      const markPrice = BigInt('1000000000'); // Large discount
      const indexPrice = BigInt('2000000000');

      const result = fundingRateService.calculateFundingRate(
        'ETH',
        markPrice,
        indexPrice,
      );

      expect(result).toBe('-0.001'); // Clamped to -0.1%
    });
  });

  describe('applyFundingToPositions', () => {
    const mockOpenPositions = [
      {
        id: 'position-1',
        size: '1000000000000000000',
        isLong: true,
        fundingPaid: '0',
        isOpen: true,
      } as Position,
      {
        id: 'position-2',
        size: '500000000000000000',
        isLong: false,
        fundingPaid: '0',
        isOpen: true,
      } as Position,
    ];

    it('should apply funding to all open positions', async () => {
      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValue({ rate: '0.0001' } as FundingRate);
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue(mockOpenPositions);
      jest
        .spyOn(positionRepository, 'save')
        .mockImplementation(async (position) => position as Position);

      const result = await fundingRateService.applyFundingToPositions();

      expect(result.success).toBe(true);
      expect(result.data?.positionsUpdated).toBe(2);
      expect(positionRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should increase funding paid for long positions when rate is positive', async () => {
      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValue({ rate: '0.0001' } as FundingRate);
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue([mockOpenPositions[0]]);
      const saveSpy = jest
        .spyOn(positionRepository, 'save')
        .mockImplementation(async (position) => position as Position);

      await fundingRateService.applyFundingToPositions();

      const savedPosition = saveSpy.mock.calls[0][0];
      expect(savedPosition.fundingPaid).toBe('200000000000000');
    });

    it('should decrease funding paid for short positions when rate is positive', async () => {
      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockResolvedValue({ rate: '0.0001' } as FundingRate);
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue([mockOpenPositions[1]]);
      const saveSpy = jest
        .spyOn(positionRepository, 'save')
        .mockImplementation(async (position) => position as Position);

      await fundingRateService.applyFundingToPositions();

      const savedPosition = saveSpy.mock.calls[0][0];
      expect(savedPosition.fundingPaid).toBe('-100000000000000');
    });

    it('should handle error when funding application fails', async () => {
      jest
        .spyOn(fundingRateRepository, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      const result = await fundingRateService.applyFundingToPositions();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('calculatePositionFunding', () => {
    const mockPosition = {
      size: '1000000000000000000',
      isLong: true,
    } as Position;

    it('should calculate positive funding for long position with positive rate', () => {
      const result = fundingRateService.calculatePositionFunding(
        mockPosition,
        '0.0001',
      );

      expect(result).toBe(BigInt('100000000000000'));
    });

    it('should calculate negative funding for long position with negative rate', () => {
      const result = fundingRateService.calculatePositionFunding(
        mockPosition,
        '-0.0001',
      );

      expect(result).toBe(BigInt('-100000000000000'));
    });

    it('should invert funding direction for short positions', () => {
      const shortPosition = { ...mockPosition, isLong: false } as Position;

      const result = fundingRateService.calculatePositionFunding(
        shortPosition,
        '0.0001',
      );

      expect(result).toBe(BigInt('-100000000000000'));
    });
  });

  describe('saveFundingRate', () => {
    it('should save funding rate to database', async () => {
      const mockFundingRate = {
        symbol: 'ETH',
        rate: '0.00015',
        price: '2000000000',
      } as FundingRate;

      jest
        .spyOn(fundingRateRepository, 'create')
        .mockReturnValue(mockFundingRate);
      jest
        .spyOn(fundingRateRepository, 'save')
        .mockResolvedValue(mockFundingRate);

      const result = await fundingRateService.saveFundingRate(
        'ETH',
        '0.00015',
        '2000000000',
      );

      expect(fundingRateRepository.create).toHaveBeenCalledWith({
        symbol: 'ETH',
        rate: '0.00015',
        price: '2000000000',
        interval: 28800,
      });
      expect(fundingRateRepository.save).toHaveBeenCalledWith(mockFundingRate);
      expect(result).toEqual(mockFundingRate);
    });

    it('should invalidate cache when saving a new funding rate', async () => {
      const mockRate = { symbol: 'ETH', rate: '0.00015' } as FundingRate;
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(mockRate);

      // First call caches the rate
      await fundingRateService.getCurrentFundingRate('ETH');

      // Save a new rate (should invalidate cache)
      const newRate = {
        symbol: 'ETH',
        rate: '0.00020',
        price: '2000000000',
      } as FundingRate;
      jest.spyOn(fundingRateRepository, 'create').mockReturnValue(newRate);
      jest.spyOn(fundingRateRepository, 'save').mockResolvedValue(newRate);

      await fundingRateService.saveFundingRate('ETH', '0.00020', '2000000000');

      // Set up mock for next fetch
      jest.spyOn(fundingRateRepository, 'findOne').mockResolvedValue(newRate);

      // Next call should fetch from DB (cache was invalidated)
      const result = await fundingRateService.getCurrentFundingRate('ETH');

      expect(result).toBe('0.00020');
      expect(fundingRateRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFundingRateHistory', () => {
    const mockHistory = [
      { symbol: 'ETH', rate: '0.00015', timestamp: new Date() },
      { symbol: 'ETH', rate: '0.00012', timestamp: new Date() },
      { symbol: 'ETH', rate: '0.00010', timestamp: new Date() },
    ] as FundingRate[];

    it('should return funding rate history', async () => {
      jest.spyOn(fundingRateRepository, 'find').mockResolvedValue(mockHistory);

      const result = await fundingRateService.getFundingRateHistory('ETH');

      expect(result).toEqual(mockHistory);
      expect(fundingRateRepository.find).toHaveBeenCalledWith({
        where: { symbol: 'ETH' },
        order: { timestamp: 'DESC' },
        take: 100,
      });
    });

    it('should accept custom limit parameter', async () => {
      jest.spyOn(fundingRateRepository, 'find').mockResolvedValue(mockHistory);

      await fundingRateService.getFundingRateHistory('ETH', 50);

      expect(fundingRateRepository.find).toHaveBeenCalledWith({
        where: { symbol: 'ETH' },
        order: { timestamp: 'DESC' },
        take: 50,
      });
    });

    it('should return empty array when no history exists', async () => {
      jest.spyOn(fundingRateRepository, 'find').mockResolvedValue([]);

      const result = await fundingRateService.getFundingRateHistory('ETH');

      expect(result).toEqual([]);
    });
  });
});
