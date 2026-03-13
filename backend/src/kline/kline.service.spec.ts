import { KlineService } from './kline.service';

describe('KlineService', () => {
  let klineService: KlineService;

  beforeEach(() => {
    klineService = new KlineService();
  });

  describe('aggregateCandle', () => {
    it('should aggregate OHLCV from price data', () => {
      const prices = [
        { price: '2000000000', volume: '100000000000000000', timestamp: new Date('2024-01-01T00:00:00Z') },
        { price: '2050000000', volume: '150000000000000000', timestamp: new Date('2024-01-01T00:00:30Z') },
        { price: '1950000000', volume: '120000000000000000', timestamp: new Date('2024-01-01T00:01:00Z') },
        { price: '2030000000', volume: '130000000000000000', timestamp: new Date('2024-01-01T00:01:30Z') },
      ];

      const candle = klineService.aggregateCandle(prices, '1m');

      expect(candle.open).toBe('2000000000');
      expect(candle.high).toBe('2050000000');
      expect(candle.low).toBe('1950000000');
      expect(candle.close).toBe('2030000000');
      expect(candle.volume).toBe('500000000000000000');
    });

    it('should throw error for empty price data', () => {
      expect(() => klineService.aggregateCandle([], '1m')).toThrow('No price data to aggregate');
    });
  });
});
