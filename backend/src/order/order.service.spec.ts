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

describe('OrderService', () => {
  let orderService: OrderService;
  let orderRepository: Repository<Order>;
  let userRepository: Repository<User>;

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
      ],
    }).compile();

    orderService = module.get<OrderService>(OrderService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
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
      expect(orderRepository.create).toHaveBeenCalledWith({
        userId: mockUser.id,
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size,
        status: OrderStatus.PENDING,
      });
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

    it('should return error when user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      const result = await orderService.getUserOrders(userAddress);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
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
  });
});
