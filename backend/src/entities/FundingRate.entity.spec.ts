import { FundingRate } from './FundingRate.entity';

describe('FundingRate Entity', () => {
  it('should create a valid FundingRate instance with required fields', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '100000000000000';
    fundingRate.price = '2000000000';
    fundingRate.interval = 8;

    expect(fundingRate.symbol).toBe('ETH');
    expect(fundingRate.rate).toBe('100000000000000');
    expect(fundingRate.price).toBe('2000000000');
    expect(fundingRate.interval).toBe(8);
  });

  it('should initialize rate to "0" by default', () => {
    const fundingRate = new FundingRate();
    expect(fundingRate.rate).toBe('0');
  });

  it('should initialize price to "0" by default', () => {
    const fundingRate = new FundingRate();
    expect(fundingRate.price).toBe('0');
  });

  it('should initialize interval to 0 by default', () => {
    const fundingRate = new FundingRate();
    expect(fundingRate.interval).toBe(0);
  });
});

describe('FundingRate Entity - Funding Rate Scenarios', () => {
  it('should create a funding rate for ETH', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '100000000000000'; // 0.01%
    fundingRate.price = '2000000000';
    fundingRate.interval = 8;

    expect(fundingRate.symbol).toBe('ETH');
  });

  it('should create a funding rate for BTC', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'BTC';
    fundingRate.rate = '50000000000000';
    fundingRate.price = '50000000000';
    fundingRate.interval = 8;

    expect(fundingRate.symbol).toBe('BTC');
  });

  it('should store rate as string for precision', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '999999999999999';
    fundingRate.price = '2000000000';
    fundingRate.interval = 8;

    expect(fundingRate.rate).toBe('999999999999999');
  });

  it('should store price as string for precision', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '100000000000000';
    fundingRate.price = '3500000000000000000000'; // $3500
    fundingRate.interval = 8;

    expect(fundingRate.price).toBe('3500000000000000000000');
  });

  it('should handle 8-hour interval', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '100000000000000';
    fundingRate.price = '2000000000';
    fundingRate.interval = 8;

    expect(fundingRate.interval).toBe(8);
  });

  it('should handle different interval values', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '100000000000000';
    fundingRate.price = '2000000000';
    fundingRate.interval = 24;

    expect(fundingRate.interval).toBe(24);
  });

  it('should have timestamp automatically set', () => {
    const fundingRate = new FundingRate();
    fundingRate.symbol = 'ETH';
    fundingRate.rate = '100000000000000';
    fundingRate.price = '2000000000';
    fundingRate.interval = 8;

    expect(fundingRate.timestamp).toBeInstanceOf(Date);
  });
});
