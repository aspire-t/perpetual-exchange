import { Hedge, HedgeStatus } from './Hedge.entity';

describe('Hedge Entity', () => {
  it('should create a valid Hedge instance with required fields', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';

    expect(hedge.positionId).toBe('position-uuid');
    expect(hedge.size).toBe('1000000000000000000');
    expect(hedge.entryPrice).toBe('2000000000');
  });

  it('should initialize status to PENDING by default', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';

    expect(hedge.status).toBe(HedgeStatus.PENDING);
  });

  it('should initialize isShort to false by default', () => {
    const hedge = new Hedge();
    expect(hedge.isShort).toBe(false);
  });
});

describe('HedgeStatus Enum', () => {
  it('should have PENDING value', () => {
    expect(HedgeStatus.PENDING).toBe('pending');
  });

  it('should have OPEN value', () => {
    expect(HedgeStatus.OPEN).toBe('open');
  });

  it('should have CLOSED value', () => {
    expect(HedgeStatus.CLOSED).toBe('closed');
  });

  it('should have FAILED value', () => {
    expect(HedgeStatus.FAILED).toBe('failed');
  });

  it('should have all four status values', () => {
    const allStatuses = [
      HedgeStatus.PENDING,
      HedgeStatus.OPEN,
      HedgeStatus.CLOSED,
      HedgeStatus.FAILED,
    ];
    expect(allStatuses.length).toBe(4);
    expect(allStatuses).toEqual(['pending', 'open', 'closed', 'failed']);
  });
});

describe('Hedge Entity - Optional Fields', () => {
  it('should allow setting exitPrice', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.exitPrice = '2100000000';

    expect(hedge.exitPrice).toBe('2100000000');
  });

  it('should allow setting pnl', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.pnl = '100000000000000000';

    expect(hedge.pnl).toBe('100000000000000000');
  });

  it('should allow setting negative pnl (loss)', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.pnl = '-500000000000000000';

    expect(hedge.pnl).toBe('-500000000000000000');
  });

  it('should allow setting hyperliquidOrderId', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.hyperliquidOrderId = 'hl-order-123';

    expect(hedge.hyperliquidOrderId).toBe('hl-order-123');
  });

  it('should allow setting blockNumber', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.blockNumber = 12345678;

    expect(hedge.blockNumber).toBe(12345678);
  });

  it('should allow setting closedAt', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.status = HedgeStatus.CLOSED;
    hedge.closedAt = new Date('2026-03-13T12:00:00Z');

    expect(hedge.status).toBe(HedgeStatus.CLOSED);
    expect(hedge.closedAt).toBeInstanceOf(Date);
  });
});

describe('Hedge Entity - Hedge Scenarios', () => {
  it('should create a pending hedge', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.status = HedgeStatus.PENDING;

    expect(hedge.status).toBe(HedgeStatus.PENDING);
  });

  it('should create an open hedge with hyperliquid order', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.status = HedgeStatus.OPEN;
    hedge.hyperliquidOrderId = 'hl-order-456';
    hedge.isShort = true;

    expect(hedge.status).toBe(HedgeStatus.OPEN);
    expect(hedge.hyperliquidOrderId).toBe('hl-order-456');
    expect(hedge.isShort).toBe(true);
  });

  it('should create a closed hedge with exit price', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.exitPrice = '2100000000';
    hedge.status = HedgeStatus.CLOSED;
    hedge.pnl = '100000000000000000';
    hedge.closedAt = new Date('2026-03-13T12:00:00Z');

    expect(hedge.status).toBe(HedgeStatus.CLOSED);
    expect(hedge.exitPrice).toBe('2100000000');
    expect(hedge.pnl).toBe('100000000000000000');
  });

  it('should create a failed hedge', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.status = HedgeStatus.FAILED;

    expect(hedge.status).toBe(HedgeStatus.FAILED);
  });

  it('should create a short hedge', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000';
    hedge.entryPrice = '2000000000';
    hedge.isShort = true;

    expect(hedge.isShort).toBe(true);
  });

  it('should store large values as strings', () => {
    const hedge = new Hedge();
    hedge.positionId = 'position-uuid';
    hedge.size = '1000000000000000000000'; // 1000 tokens
    hedge.entryPrice = '3500000000000000000000'; // $3500

    expect(hedge.size).toBe('1000000000000000000000');
    expect(hedge.entryPrice).toBe('3500000000000000000000');
  });
});
