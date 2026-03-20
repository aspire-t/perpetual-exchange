import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderSide, OrderStatus, OrderType } from '../entities/Order.entity';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;

  const mockOrderService = {
    executeOrder: jest.fn(),
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
        {
          provide: JwtAuthGuard,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
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
    it('should require JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        OrderController.prototype.createOrder,
      );

      expect(guards).toContain(JwtAuthGuard);
    });

    it('should create order with authenticated address', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'order-1', status: OrderStatus.PENDING },
      };

      mockOrderService.executeOrder.mockResolvedValue(mockResponse);

      const result = await controller.createOrder(
        {
          address: '0x1111111111111111111111111111111111111111',
          type: OrderType.MARKET,
          side: OrderSide.LONG,
          symbol: 'ETH',
          size: '1000000000000000000',
          leverage: '3',
        },
        { user: { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } as any,
      );

      expect(result).toEqual(mockResponse);
      expect(orderService.executeOrder).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        'ETH',
        OrderSide.LONG,
        BigInt('1000000000000000000'),
        BigInt('3'),
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
        1,
        50,
      );
    });
  });

  describe('cancelOrder', () => {
    it('should require JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        OrderController.prototype.cancelOrder,
      );

      expect(guards).toContain(JwtAuthGuard);
    });

    it('should cancel an order', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'order-1', status: OrderStatus.CANCELLED },
      };

      mockOrderService.cancelOrder.mockResolvedValue(mockResponse);

      const result = await controller.cancelOrder('order-1', {
        user: { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
      } as any);

      expect(result).toEqual(mockResponse);
      expect(orderService.cancelOrder).toHaveBeenCalledWith(
        'order-1',
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      );
    });
  });
});
