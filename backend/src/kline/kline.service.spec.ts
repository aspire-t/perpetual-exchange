import { KlineService } from './kline.service';
import { PriceService } from '../price/price.service';

describe('KlineService', () => {
  let klineService: KlineService;
  let mockPriceService: jest.Mocked<PriceService>;

  beforeEach(() => {
    mockPriceService = {
      getPriceHistory: jest.fn(),
    } as any;
    klineService = new KlineService(mockPriceService);
  });

  describe('aggregateCandle', () => {
    it('should aggregate OHLCV from price data', () => {
      const prices = [
        {
          price: '2000000000',
          volume: '100000000000000000',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          price: '2050000000',
          volume: '150000000000000000',
          timestamp: new Date('2024-01-01T00:00:30Z'),
        },
        {
          price: '1950000000',
          volume: '120000000000000000',
          timestamp: new Date('2024-01-01T00:01:00Z'),
        },
        {
          price: '2030000000',
          volume: '130000000000000000',
          timestamp: new Date('2024-01-01T00:01:30Z'),
        },
      ];

      const candle = klineService.aggregateCandle(prices, '1m');

      expect(candle.open).toBe('2000000000');
      expect(candle.high).toBe('2050000000');
      expect(candle.low).toBe('1950000000');
      expect(candle.close).toBe('2030000000');
      expect(candle.volume).toBe('500000000000000000');
    });

    it('should throw error for empty price data', () => {
      expect(() => klineService.aggregateCandle([], '1m')).toThrow(
        'No price data to aggregate',
      );
    });
  });

  describe('bucketByTimeframe', () => {
    it('should group prices into 1m buckets', () => {
      const prices = [
        {
          price: '2000000000',
          volume: '100000000000000000',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          price: '2010000000',
          volume: '110000000000000000',
          timestamp: new Date('2024-01-01T00:00:30Z'),
        },
        {
          price: '2020000000',
          volume: '120000000000000000',
          timestamp: new Date('2024-01-01T00:01:00Z'),
        },
        {
          price: '2030000000',
          volume: '130000000000000000',
          timestamp: new Date('2024-01-01T00:01:30Z'),
        },
        {
          price: '2040000000',
          volume: '140000000000000000',
          timestamp: new Date('2024-01-01T00:02:00Z'),
        },
      ];

      const buckets = klineService.bucketByTimeframe(prices, '1m');

      expect(buckets.size).toBe(3);
      expect(buckets.get('2024-01-01T00:00:00.000Z')).toHaveLength(2);
      expect(buckets.get('2024-01-01T00:01:00.000Z')).toHaveLength(2);
      expect(buckets.get('2024-01-01T00:02:00.000Z')).toHaveLength(1);
    });

    it('should group prices into 5m buckets', () => {
      const prices = [
        {
          price: '2000000000',
          volume: '100000000000000000',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          price: '2010000000',
          volume: '110000000000000000',
          timestamp: new Date('2024-01-01T00:02:00Z'),
        },
        {
          price: '2020000000',
          volume: '120000000000000000',
          timestamp: new Date('2024-01-01T00:05:00Z'),
        },
        {
          price: '2030000000',
          volume: '130000000000000000',
          timestamp: new Date('2024-01-01T00:07:00Z'),
        },
      ];

      const buckets = klineService.bucketByTimeframe(prices, '5m');

      expect(buckets.size).toBe(2);
      expect(buckets.get('2024-01-01T00:00:00.000Z')).toHaveLength(2);
      expect(buckets.get('2024-01-01T00:05:00.000Z')).toHaveLength(2);
    });
  });

  describe('generateKlines', () => {
    it('should generate k-lines from raw price data', async () => {
      const mockPrices = [
        {
          price: '2000000000',
          volume: '100000000000000000',
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
        {
          price: '2010000000',
          volume: '110000000000000000',
          timestamp: new Date('2024-01-01T00:00:30Z'),
        },
        {
          price: '2020000000',
          volume: '120000000000000000',
          timestamp: new Date('2024-01-01T00:01:00Z'),
        },
        {
          price: '2030000000',
          volume: '130000000000000000',
          timestamp: new Date('2024-01-01T00:01:30Z'),
        },
      ];

      jest
        .spyOn(mockPriceService, 'getPriceHistory')
        .mockResolvedValue(mockPrices);

      const klines = await klineService.generateKlines('ETH', '1m', 2);

      expect(klines.length).toBe(2);
      expect(klines[0].symbol).toBe('ETH');
      expect(klines[0].timeframe).toBe('1m');
      expect(klines[0].open).toBe('2000000000');
      expect(klines[0].close).toBe('2010000000');
      expect(klines[1].open).toBe('2020000000');
      expect(klines[1].close).toBe('2030000000');
    });

    it('should handle empty price data', async () => {
      jest.spyOn(mockPriceService, 'getPriceHistory').mockResolvedValue([]);

      const klines = await klineService.generateKlines('ETH', '1m', 10);

      expect(klines).toEqual([]);
    });
  });
});
