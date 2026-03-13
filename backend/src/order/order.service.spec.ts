import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import {
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
} from '../entities/Order.entity';
import { User } from '../entities/User.entity';
import { BalanceService } from '../balance/balance.service';
import { PositionService } from '../position/position.service';
import { HedgingService } from '../hedging/hedging.service';
import { PriceService } from '../price/price.service';
import { RiskEngineService } from '../risk/risk-engine.service';
import { Position } from '../entities/Position.entity';

describe('OrderService', () => {
  let orderService: OrderService;
  let orderRepository: Repository<Order>;
  let userRepository: Repository<User>;
  let positionRepository: Repository<Position>;
  let balanceService: BalanceService;
  let positionService: PositionService;
  let hedgingService: HedgingService;
  let priceService: PriceService;
  let riskEngineService: RiskEngineService;

  const mockOrderRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const mockUserRepository = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  });

  const mockPositionRepository = () => ({
    find: jest.fn().mockResolvedValue([]),
  });

  const mockBalanceService = () => ({
    lockMargin: jest.fn(),
    releaseMargin: jest.fn(),
    getBalance: jest.fn(),
  });

  const mockPositionService = () => ({
    openPosition: jest.fn(),
    closePosition: jest.fn(),
    increasePosition: jest.fn(),
    reducePosition: jest.fn(),
    getPosition: jest.fn(),
    getUserPositions: jest.fn(),
  });

  const mockHedgingService = () => ({
    openHedge: jest.fn(),
    closeHedge: jest.fn(),
    getHedge: jest.fn(),
    getPositionHedges: jest.fn(),
    autoHedge: jest.fn(),
    syncHedgeStatus: jest.fn(),
    getTotalHedgedVolume: jest.fn(),
  });

  const mockPriceService = () => ({
    getPrice: jest.fn(),
  });

  const mockRiskEngineService = () => ({
    checkNewPositionRisk: jest.fn(),
    calculateLiquidationPrice: jest.fn(),
    checkLiquidation: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository(),
        },
        {
          provide: getRepositoryToken(Position),
          useValue: mockPositionRepository(),
        },
        {
          provide: BalanceService,
          useValue: mockBalanceService(),
        },
        {
          provide: PositionService,
          useValue: mockPositionService(),
        },
        {
          provide: HedgingService,
          useValue: mockHedgingService(),
        },
        {
          provide: PriceService,
          useValue: mockPriceService(),
        },
        {
          provide: RiskEngineService,
          useValue: mockRiskEngineService(),
        },
      ],
    }).compile();

    orderService = module.get<OrderService>(OrderService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    positionRepository = module.get<Repository<Position>>(
      getRepositoryToken(Position),
    );
    balanceService = module.get<BalanceService>(BalanceService);
    positionService = module.get<PositionService>(PositionService);
    hedgingService = module.get<HedgingService>(HedgingService);
    priceService = module.get<PriceService>(PriceService);
    riskEngineService = module.get<RiskEngineService>(RiskEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const mockUser = { id: 'user-1', address: userAddress };

    it('should create a market order successfully', async () => {
      const size = BigInt('1000000000000000000'); // 1 token with 18 decimals
      const normalizedAddress = userAddress.toLowerCase();

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-1',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-1',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.createOrder(
        userAddress,
        OrderType.MARKET,
        OrderSide.LONG,
        size,
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { address: normalizedAddress },
      });
      expect(orderRepository.create).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('order-1');
    });

    it('should create a limit order with limit price', async () => {
      const size = BigInt('1000000000000000000');
      const limitPrice = BigInt('2000000000'); // $2000

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-2',
        userId: mockUser.id,
        type: OrderType.LIMIT,
        side: OrderSide.SHORT,
        size,
        limitPrice,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-2',
        userId: mockUser.id,
        type: OrderType.LIMIT,
        side: OrderSide.SHORT,
        size,
        limitPrice,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.createOrder(
        userAddress,
        OrderType.LIMIT,
        OrderSide.SHORT,
        size,
        limitPrice,
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe(OrderType.LIMIT);
      expect(result.data?.limitPrice).toBe(limitPrice.toString());
    });

    it('should auto-create user when not found', async () => {
      const normalizedAddress = userAddress.toLowerCase();

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue({
        id: 'user-new',
        address: normalizedAddress,
      } as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({
        id: 'user-new',
        address: normalizedAddress,
      } as User);
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-new',
        userId: 'user-new',
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size: BigInt('1000000000000000000'),
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-new',
        userId: 'user-new',
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size: BigInt('1000000000000000000'),
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.createOrder(
        userAddress,
        OrderType.MARKET,
        OrderSide.LONG,
        BigInt('1000000000000000000'),
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('order-new');
    });

    it('should return error when size is invalid (zero or negative)', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      const result = await orderService.createOrder(
        userAddress,
        OrderType.MARKET,
        OrderSide.LONG,
        BigInt('0'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid size');
    });
  });

  describe('getOrder', () => {
    it('should return order by id', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size: BigInt('1000000000000000000'),
        status: OrderStatus.OPEN,
        createdAt: new Date(),
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await orderService.getOrder('order-1');

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
      });
      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('order-1');
    });

    it('should return error when order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      const result = await orderService.getOrder('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });
  });

  describe('getUserOrders', () => {
    const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const mockOrders = [
      {
        id: 'order-1',
        userId: 'user-1',
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size: BigInt('1000000000000000000'),
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      },
      {
        id: 'order-2',
        userId: 'user-1',
        type: OrderType.LIMIT,
        side: OrderSide.SHORT,
        size: BigInt('500000000000000000'),
        status: OrderStatus.OPEN,
        createdAt: new Date(),
      },
    ] as Order[];

    it('should return all orders for a user', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 'user-1' } as User);
      jest.spyOn(orderRepository, 'find').mockResolvedValue(mockOrders);

      const result = await orderService.getUserOrders(userAddress);

      expect(orderRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 50,
        skip: 0,
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when user has no orders', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ id: 'user-1' } as User);
      jest.spyOn(orderRepository, 'find').mockResolvedValue([]);

      const result = await orderService.getUserOrders(userAddress);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty array when user not found (no orders yet)', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await orderService.getUserOrders(userAddress);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a pending order', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        type: OrderType.LIMIT,
        side: OrderSide.LONG,
        size: BigInt('1000000000000000000'),
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      const result = await orderService.cancelOrder('order-1');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(OrderStatus.CANCELLED);
    });

    it('should not allow cancelling a filled order', async () => {
      const mockOrder = {
        id: 'order-1',
        status: OrderStatus.FILLED,
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await orderService.cancelOrder('order-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot cancel order that is already filled');
    });

    it('should not allow cancelling an already cancelled order', async () => {
      const mockOrder = {
        id: 'order-1',
        userId: 'user-1',
        type: OrderType.LIMIT,
        side: OrderSide.LONG,
        size: BigInt('1000000000000000000'),
        status: OrderStatus.CANCELLED,
        createdAt: new Date(),
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await orderService.cancelOrder('order-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order is already cancelled');
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('should return error when order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      const result = await orderService.cancelOrder('order-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Order not found');
    });
  });

  describe('executeOrder', () => {
    const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const normalizedAddress = userAddress.toLowerCase();
    const mockUser = {
      id: 'user-1',
      address: normalizedAddress,
      balance: '10000000000000000000',
    } as User;
    const size = BigInt('1000000000000000000'); // 1 token
    const leverage = BigInt('10'); // 10x leverage
    const mockEntryPrice = BigInt('2000000000'); // $2000

    beforeEach(() => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(priceService, 'getPrice').mockResolvedValue({
        success: true,
        data: { price: mockEntryPrice.toString() },
      });
      jest.spyOn(riskEngineService, 'checkNewPositionRisk').mockResolvedValue({
        allowed: true,
      });
    });

    it('should execute a long market order successfully', async () => {
      const marginRequired = BigInt('100000000000000000'); // size / leverage = 0.1 token

      // Mock services
      jest
        .spyOn(balanceService, 'lockMargin')
        .mockResolvedValue({ success: true });
      jest.spyOn(positionService, 'openPosition').mockResolvedValue({
        success: true,
        data: {
          id: 'position-1',
          size: size.toString(),
          entryPrice: mockEntryPrice.toString(),
          isLong: true,
          isOpen: true,
        },
      });
      jest.spyOn(hedgingService, 'autoHedge').mockResolvedValue({
        success: true,
        data: { id: 'hedge-1' },
      });
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-1',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-1',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        size,
        leverage,
      );

      expect(result.success).toBe(true);
      expect(result.data?.orderId).toBe('order-1');
      expect(result.data?.positionId).toBe('position-1');
      expect(balanceService.lockMargin).toHaveBeenCalledWith(
        mockUser.id,
        marginRequired,
      );
      expect(positionService.openPosition).toHaveBeenCalledWith(
        userAddress,
        size,
        mockEntryPrice,
        true,
      );
      expect(hedgingService.autoHedge).toHaveBeenCalledWith('position-1');
    });

    it('should execute a short market order successfully', async () => {
      const marginRequired = BigInt('100000000000000000');

      jest
        .spyOn(balanceService, 'lockMargin')
        .mockResolvedValue({ success: true });
      jest.spyOn(positionService, 'openPosition').mockResolvedValue({
        success: true,
        data: {
          id: 'position-2',
          size: size.toString(),
          entryPrice: mockEntryPrice.toString(),
          isLong: false,
          isOpen: true,
        },
      });
      jest.spyOn(hedgingService, 'autoHedge').mockResolvedValue({
        success: true,
        data: { id: 'hedge-2' },
      });
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-2',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.SHORT,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-2',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.SHORT,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.SHORT,
        size,
        leverage,
      );

      expect(result.success).toBe(true);
      expect(result.data?.positionId).toBe('position-2');
      expect(positionService.openPosition).toHaveBeenCalledWith(
        userAddress,
        size,
        mockEntryPrice,
        false,
      );
    });

    it('should return error when insufficient balance', async () => {
      const marginRequired = BigInt('100000000000000000');

      jest.spyOn(balanceService, 'lockMargin').mockResolvedValue({
        success: false,
        error: 'Insufficient balance',
      });

      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        size,
        leverage,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient balance');
      expect(positionService.openPosition).not.toHaveBeenCalled();
      expect(hedgingService.autoHedge).not.toHaveBeenCalled();
    });

    it('should return error when leverage is invalid', async () => {
      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        size,
        BigInt('0'),
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid leverage');
    });

    it('should return error when size is invalid', async () => {
      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        BigInt('0'),
        leverage,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid size');
    });

    it('should increase existing position when same direction', async () => {
      const existingPosition = {
        id: 'position-existing',
        userId: mockUser.id,
        size: BigInt('500000000000000000'),
        entryPrice: BigInt('1900000000'),
        isLong: true,
        isOpen: true,
      } as Position;

      jest
        .spyOn(balanceService, 'lockMargin')
        .mockResolvedValue({ success: true });
      jest
        .spyOn(positionRepository, 'find')
        .mockResolvedValue([existingPosition]);
      jest.spyOn(positionService, 'increasePosition').mockResolvedValue({
        success: true,
        data: {
          id: 'position-existing',
          size: BigInt('1500000000000000000').toString(),
          entryPrice: BigInt('1966666666').toString(),
          averageEntryPrice: BigInt('1966666666').toString(),
        },
      });
      jest.spyOn(hedgingService, 'autoHedge').mockResolvedValue({
        success: true,
        data: { id: 'hedge-3' },
      });
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-3',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-3',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        size,
        leverage,
      );

      expect(result.success).toBe(true);
      expect(positionService.increasePosition).toHaveBeenCalled();
    });

    it('should open new position when opposite direction or no existing position', async () => {
      jest
        .spyOn(balanceService, 'lockMargin')
        .mockResolvedValue({ success: true });
      jest.spyOn(positionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(positionService, 'openPosition').mockResolvedValue({
        success: true,
        data: { id: 'position-new' },
      });
      jest.spyOn(hedgingService, 'autoHedge').mockResolvedValue({
        success: true,
        data: { id: 'hedge-4' },
      });
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-4',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-4',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        size,
        leverage,
      );

      expect(result.success).toBe(true);
      expect(positionService.openPosition).toHaveBeenCalled();
    });

    it('should handle hedge failure gracefully', async () => {
      jest
        .spyOn(balanceService, 'lockMargin')
        .mockResolvedValue({ success: true });
      jest.spyOn(positionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(positionService, 'openPosition').mockResolvedValue({
        success: true,
        data: { id: 'position-5' },
      });
      jest.spyOn(hedgingService, 'autoHedge').mockResolvedValue({
        success: false,
        error: 'Hedge failed',
      });
      jest.spyOn(orderRepository, 'create').mockReturnValue({
        id: 'order-5',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({
        id: 'order-5',
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.FILLED,
        createdAt: new Date(),
      } as Order);

      const result = await orderService.executeOrder(
        userAddress,
        OrderSide.LONG,
        size,
        leverage,
      );

      // Order should still succeed even if hedge fails (hedge is best-effort)
      expect(result.success).toBe(true);
      expect(result.data?.hedgeError).toBe('Hedge failed');
    });
  });
});
