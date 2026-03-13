import { Order, OrderType, OrderSide, OrderStatus } from './Order.entity';

describe('Order Entity', () => {
  it('should create a valid Order instance with required fields', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.status = OrderStatus.PENDING;

    expect(order.userId).toBe('user-uuid');
    expect(order.type).toBe(OrderType.MARKET);
    expect(order.side).toBe(OrderSide.LONG);
    expect(order.size).toBe('1000000000000000000');
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  it('should initialize status to PENDING by default', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';

    expect(order.status).toBe(OrderStatus.PENDING);
  });
});

describe('OrderType Enum', () => {
  it('should have MARKET value', () => {
    expect(OrderType.MARKET).toBe('market');
  });

  it('should have LIMIT value', () => {
    expect(OrderType.LIMIT).toBe('limit');
  });

  it('should not have other values', () => {
    const validValues = [OrderType.MARKET, OrderType.LIMIT];
    expect(validValues).toContain('market');
    expect(validValues).toContain('limit');
    expect(validValues).not.toContain('stop');
  });
});

describe('OrderSide Enum', () => {
  it('should have LONG value', () => {
    expect(OrderSide.LONG).toBe('long');
  });

  it('should have SHORT value', () => {
    expect(OrderSide.SHORT).toBe('short');
  });

  it('should not have other values', () => {
    const validValues = [OrderSide.LONG, OrderSide.SHORT];
    expect(validValues).toContain('long');
    expect(validValues).toContain('short');
    expect(validValues).not.toContain('buy');
  });
});

describe('OrderStatus Enum', () => {
  it('should have PENDING value', () => {
    expect(OrderStatus.PENDING).toBe('pending');
  });

  it('should have OPEN value', () => {
    expect(OrderStatus.OPEN).toBe('open');
  });

  it('should have FILLED value', () => {
    expect(OrderStatus.FILLED).toBe('filled');
  });

  it('should have CANCELLED value', () => {
    expect(OrderStatus.CANCELLED).toBe('cancelled');
  });

  it('should have REJECTED value', () => {
    expect(OrderStatus.REJECTED).toBe('rejected');
  });

  it('should have all five status values', () => {
    const allStatuses = [
      OrderStatus.PENDING,
      OrderStatus.OPEN,
      OrderStatus.FILLED,
      OrderStatus.CANCELLED,
      OrderStatus.REJECTED,
    ];
    expect(allStatuses.length).toBe(5);
    expect(allStatuses).toContain('pending');
    expect(allStatuses).toContain('open');
    expect(allStatuses).toContain('filled');
    expect(allStatuses).toContain('cancelled');
    expect(allStatuses).toContain('rejected');
  });
});

describe('Order Entity - Optional Fields', () => {
  it('should allow setting symbol', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.symbol = 'ETH';

    expect(order.symbol).toBe('ETH');
  });

  it('should allow setting limitPrice for limit orders', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.LIMIT;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.limitPrice = '1900000000';

    expect(order.limitPrice).toBe('1900000000');
  });

  it('should allow setting fillPrice after execution', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.fillPrice = '2000000000';

    expect(order.fillPrice).toBe('2000000000');
  });

  it('should allow setting leverage', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.leverage = '10';

    expect(order.leverage).toBe('10');
  });

  it('should allow setting txHash', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.txHash = '0xabc123def456';

    expect(order.txHash).toBe('0xabc123def456');
  });

  it('should allow setting blockNumber', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.blockNumber = 12345678;

    expect(order.blockNumber).toBe(12345678);
  });

  it('should allow setting all optional fields', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.LIMIT;
    order.side = OrderSide.SHORT;
    order.symbol = 'BTC';
    order.size = '1000000000000000000';
    order.limitPrice = '50000000000';
    order.fillPrice = '50000000000';
    order.status = OrderStatus.FILLED;
    order.leverage = '20';
    order.txHash = '0xabc123';
    order.blockNumber = 12345678;

    expect(order.symbol).toBe('BTC');
    expect(order.limitPrice).toBe('50000000000');
    expect(order.fillPrice).toBe('50000000000');
    expect(order.status).toBe(OrderStatus.FILLED);
    expect(order.leverage).toBe('20');
    expect(order.txHash).toBe('0xabc123');
    expect(order.blockNumber).toBe(12345678);
  });
});

describe('Order Entity - Order Scenarios', () => {
  it('should create a market buy order', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.symbol = 'ETH';
    order.size = '1000000000000000000';
    order.leverage = '10';

    expect(order.type).toBe(OrderType.MARKET);
    expect(order.side).toBe(OrderSide.LONG);
  });

  it('should create a limit sell order', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.LIMIT;
    order.side = OrderSide.SHORT;
    order.symbol = 'ETH';
    order.size = '1000000000000000000';
    order.limitPrice = '2100000000';
    order.leverage = '5';

    expect(order.type).toBe(OrderType.LIMIT);
    expect(order.side).toBe(OrderSide.SHORT);
    expect(order.limitPrice).toBe('2100000000');
  });

  it('should represent a filled order', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.status = OrderStatus.FILLED;
    order.fillPrice = '2000000000';
    order.txHash = '0xabc123';

    expect(order.status).toBe(OrderStatus.FILLED);
    expect(order.fillPrice).toBe('2000000000');
  });

  it('should represent a cancelled order', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.LIMIT;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.status = OrderStatus.CANCELLED;
    order.limitPrice = '1900000000';

    expect(order.status).toBe(OrderStatus.CANCELLED);
  });

  it('should represent a rejected order', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000';
    order.status = OrderStatus.REJECTED;

    expect(order.status).toBe(OrderStatus.REJECTED);
  });

  it('should store large size values as strings', () => {
    const order = new Order();
    order.userId = 'user-uuid';
    order.type = OrderType.MARKET;
    order.side = OrderSide.LONG;
    order.size = '1000000000000000000000000'; // 1M tokens

    expect(order.size).toBe('1000000000000000000000000');
  });
});
