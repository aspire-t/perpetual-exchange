import { Position } from './Position.entity';

describe('Position Entity', () => {
  it('should create a valid Position instance with required fields', () => {
    const position = new Position();
    position.id = 'test-uuid';
    position.userId = 'user-uuid';
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.isLong = true;
    position.isOpen = true;
    position.leverage = '10';

    expect(position.size).toBe('1000000000000000000');
    expect(position.entryPrice).toBe('2000000000');
    expect(position.isLong).toBe(true);
    expect(position.isOpen).toBe(true);
    expect(position.leverage).toBe('10');
  });

  it('should initialize size to "0" by default', () => {
    const position = new Position();
    expect(position.size).toBe('0');
  });

  it('should initialize entryPrice to "0" by default', () => {
    const position = new Position();
    expect(position.entryPrice).toBe('0');
  });

  it('should initialize isLong to true by default', () => {
    const position = new Position();
    expect(position.isLong).toBe(true);
  });

  it('should initialize isOpen to true by default', () => {
    const position = new Position();
    expect(position.isOpen).toBe(true);
  });

  it('should initialize leverage to "0" by default', () => {
    const position = new Position();
    expect(position.leverage).toBe('0');
  });

  it('should initialize fundingPaid to "0" by default', () => {
    const position = new Position();
    expect(position.fundingPaid).toBe('0');
  });

  it('should create a long position', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.isLong = true;

    expect(position.isLong).toBe(true);
  });

  it('should create a short position', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.isLong = false;

    expect(position.isLong).toBe(false);
  });

  it('should allow setting exitPrice', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.exitPrice = '2100000000';

    expect(position.exitPrice).toBe('2100000000');
  });

  it('should allow setting pnl', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.pnl = '100000000000000000';

    expect(position.pnl).toBe('100000000000000000');
  });

  it('should allow setting negative pnl (loss)', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.pnl = '-500000000000000000';

    expect(position.pnl).toBe('-500000000000000000');
  });

  it('should allow setting liquidationPrice', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.liquidationPrice = '1800000000';

    expect(position.liquidationPrice).toBe('1800000000');
  });

  it('should allow setting closedAt when position is closed', () => {
    const position = new Position();
    position.size = '1000000000000000000';
    position.entryPrice = '2000000000';
    position.isOpen = false;
    position.closedAt = new Date('2026-03-13T12:00:00Z');
    position.exitPrice = '2100000000';

    expect(position.isOpen).toBe(false);
    expect(position.closedAt).toBeInstanceOf(Date);
    expect(position.exitPrice).toBe('2100000000');
  });

  it('should handle high leverage values', () => {
    const position = new Position();
    position.leverage = '50';

    expect(position.leverage).toBe('50');
  });

  it('should store fundingPaid as string for precision', () => {
    const position = new Position();
    position.fundingPaid = '50000000000000000';

    expect(position.fundingPaid).toBe('50000000000000000');
  });

  it('should handle large size values (18 decimals)', () => {
    const position = new Position();
    position.size = '1000000000000000000000'; // 1000 tokens

    expect(position.size).toBe('1000000000000000000000');
  });

  it('should handle large price values (18 decimals)', () => {
    const position = new Position();
    position.entryPrice = '3500000000000000000000'; // $3500

    expect(position.entryPrice).toBe('3500000000000000000000');
  });
});
