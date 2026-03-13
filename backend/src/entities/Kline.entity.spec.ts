import { Kline } from './Kline.entity';

describe('Kline Entity', () => {
  it('should create a valid Kline instance', () => {
    const kline = new Kline();
    kline.symbol = 'ETH';
    kline.timeframe = '1m';
    kline.timestamp = new Date('2024-01-01T00:00:00Z');
    kline.open = '2000000000';
    kline.high = '2050000000';
    kline.low = '1950000000';
    kline.close = '2030000000';
    kline.volume = '1000000000000000000';

    expect(kline.symbol).toBe('ETH');
    expect(kline.timeframe).toBe('1m');
    expect(kline.open).toBe('2000000000');
    expect(kline.high).toBe('2050000000');
    expect(kline.low).toBe('1950000000');
    expect(kline.close).toBe('2030000000');
  });
});
