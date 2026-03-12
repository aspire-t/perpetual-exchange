import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderType, OrderSide, OrderStatus } from '../entities/Order.entity';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;

  const mockOrderService = {
    createOrder: jest.fn(),
    getOrder: jest.fn(),
    getUserOrders: jest.fn(),
    cancelOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create an order', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'order-1', status: OrderStatus.PENDING },
      };

      mockOrderService.createOrder.mockResolvedValue(mockResponse);

      const result = await controller.createOrder({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        type: OrderType.MARKET,
        side: OrderSide.LONG,
        size: '1000000000000000000',
      });

      expect(result).toEqual(mockResponse);
      expect(orderService.createOrder).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        OrderType.MARKET,
        OrderSide.LONG,
        BigInt('1000000000000000000'),
        undefined,
      );
    });

    it('should create a limit order with limit price', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'order-1', status: OrderStatus.PENDING },
      };

      mockOrderService.createOrder.mockResolvedValue(mockResponse);

      await controller.createOrder({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        type: OrderType.LIMIT,
        side: OrderSide.SHORT,
        size: '1000000000000000000',
        limitPrice: '2000000000',
      });

      expect(orderService.createOrder).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        OrderType.LIMIT,
        OrderSide.SHORT,
        BigInt('1000000000000000000'),
        BigInt('2000000000'),
      );
    });
  });

  describe('getOrder', () => {
    it('should get an order by id', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'order-1', status: OrderStatus.OPEN },
      };

      mockOrderService.getOrder.mockResolvedValue(mockResponse);

      const result = await controller.getOrder('order-1');

      expect(result).toEqual(mockResponse);
      expect(orderService.getOrder).toHaveBeenCalledWith('order-1');
    });
  });

  describe('getUserOrders', () => {
    it('should get all orders for a user', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'order-1', status: OrderStatus.FILLED },
          { id: 'order-2', status: OrderStatus.OPEN },
        ],
      };

      mockOrderService.getUserOrders.mockResolvedValue(mockResponse);

      const result = await controller.getUserOrders(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      );

      expect(result).toEqual(mockResponse);
      expect(orderService.getUserOrders).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'order-1', status: OrderStatus.CANCELLED },
      };

      mockOrderService.cancelOrder.mockResolvedValue(mockResponse);

      const result = await controller.cancelOrder('order-1');

      expect(result).toEqual(mockResponse);
      expect(orderService.cancelOrder).toHaveBeenCalledWith('order-1');
    });
  });
});
