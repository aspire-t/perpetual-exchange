import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OrderService } from './order.service';
import { Order, OrderSide, OrderStatus } from '../entities/Order.entity';
import { User } from '../entities/User.entity';
import { Position } from '../entities/Position.entity';
import { BalanceService } from '../balance/balance.service';
import { PositionService } from '../position/position.service';
import { HedgingService } from '../hedging/hedging.service';
import { PriceService } from '../price/price.service';
import { RiskEngineService } from '../risk/risk-engine.service';

describe('OrderService rollback', () => {
  let orderService: OrderService;
  let orderRepository: Repository<Order>;
  let userRepository: Repository<User>;
  let balanceService: BalanceService;
  let positionService: PositionService;
  let hedgingService: HedgingService;
  let priceService: PriceService;
  let riskEngineService: RiskEngineService;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockPositionRepository = {
    find: jest.fn(),
  };
  const mockBalanceService = {
    lockMargin: jest.fn(),
    deductFee: jest.fn(),
    releaseMargin: jest.fn(),
    refundFee: jest.fn(),
  };
  const mockPositionService = {
    openPosition: jest.fn(),
    increasePosition: jest.fn(),
  };
  const mockHedgingService = {
    executeHedgeOrder: jest.fn(),
    createHedgeRecord: jest.fn(),
  };
  const mockPriceService = {
    getPrice: jest.fn(),
  };
  const mockRiskEngineService = {
    checkNewPositionRisk: jest.fn(),
  };
  const mockTransactionManager = {
    find: jest.fn(),
    create: jest.fn((_: unknown, entity: unknown) => entity),
    save: jest.fn(async (_: unknown, entity: unknown) => entity),
  };
  const mockDataSource = {
    transaction: jest.fn(async (callback) => callback(mockTransactionManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Position), useValue: mockPositionRepository },
        { provide: BalanceService, useValue: mockBalanceService },
        { provide: PositionService, useValue: mockPositionService },
        { provide: HedgingService, useValue: mockHedgingService },
        { provide: PriceService, useValue: mockPriceService },
        { provide: RiskEngineService, useValue: mockRiskEngineService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    orderService = module.get<OrderService>(OrderService);
    orderRepository = module.get(getRepositoryToken(Order));
    userRepository = module.get(getRepositoryToken(User));
    balanceService = module.get(BalanceService);
    positionService = module.get(PositionService);
    hedgingService = module.get(HedgingService);
    priceService = module.get(PriceService);
    riskEngineService = module.get(RiskEngineService);

    jest.clearAllMocks();
    mockUserRepository.findOne.mockResolvedValue({
      id: 'user-1',
      address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    });
    mockPriceService.getPrice.mockResolvedValue({
      success: true,
      data: { price: '2000' },
    });
    mockRiskEngineService.checkNewPositionRisk.mockResolvedValue({ allowed: true });
    mockBalanceService.lockMargin.mockResolvedValue({ success: true });
    mockBalanceService.deductFee.mockResolvedValue({ success: true });
    mockBalanceService.releaseMargin.mockResolvedValue({ success: true });
    mockBalanceService.refundFee.mockResolvedValue({ success: true });
    mockPositionRepository.find.mockResolvedValue([]);
    mockTransactionManager.find.mockResolvedValue([]);
    mockTransactionManager.save.mockImplementation(
      async (_: unknown, entity: unknown) => entity,
    );
    mockOrderRepository.create.mockImplementation(() => ({}));
    mockOrderRepository.save.mockImplementation(async (o: Order) => ({
      id: 'order-rejected',
      ...o,
    }));
  });

  it('should save rejected order when hedge execution fails', async () => {
    mockHedgingService.executeHedgeOrder.mockResolvedValueOnce({
      success: false,
      error: 'hedge down',
    });

    const result = await orderService.executeOrder(
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      'ETH',
      OrderSide.LONG,
      BigInt('1000000000000000000'),
      BigInt('10'),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Hedge execution failed');
    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.REJECTED }),
    );
  });

  it('should compensate hedge and reject order when local position write fails', async () => {
    mockHedgingService.executeHedgeOrder
      .mockResolvedValueOnce({
        success: true,
        data: { orderId: 'hedge-1', fillPrice: '2000' },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { orderId: 'hedge-revert-1', fillPrice: '2001' },
      });
    mockTransactionManager.save.mockRejectedValueOnce(
      new Error('position write failed'),
    );

    const result = await orderService.executeOrder(
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      'ETH',
      OrderSide.LONG,
      BigInt('1000000000000000000'),
      BigInt('10'),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('position write failed');
    expect(hedgingService.executeHedgeOrder).toHaveBeenCalledTimes(2);
    expect(balanceService.releaseMargin).toHaveBeenCalled();
    expect(balanceService.refundFee).toHaveBeenCalled();
    expect(orderRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.REJECTED }),
    );
  });
});
