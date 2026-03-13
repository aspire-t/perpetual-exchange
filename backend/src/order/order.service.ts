import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    private balanceService: BalanceService,
    private positionService: PositionService,
    private hedgingService: HedgingService,
    private priceService: PriceService,
    private riskEngineService: RiskEngineService,
  ) {}

  async createOrder(
    userAddress: string,
    type: OrderType,
    side: OrderSide,
    symbol: string,
    size: bigint,
    limitPrice?: bigint,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Validate size
    if (size <= BigInt(0)) {
      return { success: false, error: 'Invalid size: must be greater than 0' };
    }

    // Normalize address to lowercase for consistent lookup
    const normalizedAddress = userAddress.toLowerCase();

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      // Auto-create user if not exists
      user = this.userRepository.create({ address: normalizedAddress });
      await this.userRepository.save(user);
    }

    // Create order - use strings for SQLite bigint compatibility
    const order = this.orderRepository.create();
    order.userId = user.id;
    order.type = type;
    order.side = side;
    order.symbol = symbol;
    order.size = size.toString();
    order.limitPrice = limitPrice?.toString();
    order.status = OrderStatus.PENDING;

    await this.orderRepository.save(order);

    return {
      success: true,
      data: {
        id: order.id,
        userId: order.userId,
        type: order.type,
        side: order.side,
        symbol: order.symbol,
        size: order.size.toString(),
        limitPrice: order.limitPrice?.toString(),
        status: order.status,
        createdAt: order.createdAt,
      },
    };
  }

  async getOrder(
    orderId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    return {
      success: true,
      data: {
        id: order.id,
        userId: order.userId,
        type: order.type,
        side: order.side,
        symbol: order.symbol,
        size: order.size.toString(),
        limitPrice: order.limitPrice?.toString(),
        fillPrice: order.fillPrice?.toString(),
        leverage: order.leverage?.toString(),
        status: order.status,
        txHash: order.txHash,
        blockNumber: order.blockNumber,
        createdAt: order.createdAt,
      },
    };
  }

  /**
   * Get all orders for a user with pagination
   * @param userAddress - The user address to filter orders
   * @param page - Page number (default: 1)
   * @param pageSize - Number of records per page (default: 50)
   */
  async getUserOrders(
    userAddress: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
    totalPages?: number;
    currentPage?: number;
    total?: number;
  }> {
    // Normalize address to lowercase for consistent lookup
    const normalizedAddress = userAddress.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      // Return empty array if user not found (no orders yet)
      return {
        success: true,
        data: [],
        totalPages: 0,
        currentPage: page || 1,
        total: 0,
      };
    }

    // Get total count for pagination
    const total = await this.orderRepository.count({
      where: { userId: user.id },
    });

    const orders = await this.orderRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        userId: order.userId,
        type: order.type,
        side: order.side,
        symbol: order.symbol,
        size: order.size.toString(),
        limitPrice: order.limitPrice?.toString(),
        fillPrice: order.fillPrice?.toString(),
        leverage: order.leverage?.toString(),
        status: order.status,
        txHash: order.txHash,
        blockNumber: order.blockNumber,
        createdAt: order.createdAt,
      })),
      totalPages,
      currentPage: page,
      total,
    };
  }

  async cancelOrder(
    orderId: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status === OrderStatus.FILLED) {
      return {
        success: false,
        error: 'Cannot cancel order that is already filled',
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      return { success: false, error: 'Order is already cancelled' };
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return {
      success: true,
      data: {
        id: order.id,
        status: order.status,
      },
    };
  }

  /**
   * Execute pending limit orders that have been triggered by price movement
   * Call this method periodically or when price updates occur
   * @param symbol - The symbol to check for triggerable orders (e.g., 'ETH')
   * @returns Result with executed and failed orders
   */
  async executePendingLimitOrders(symbol: string): Promise<{
    success: boolean;
    data?: {
      executed: Array<{ orderId: string; userId: string; side: string }>;
      failed: Array<{ orderId: string; reason: string }>;
    };
    error?: string;
  }> {
    try {
      // Get current market price
      const priceResult = await this.priceService.getPrice(symbol);
      if (!priceResult.success || !priceResult.data) {
        return {
          success: false,
          error: 'Failed to get current price for limit order execution',
        };
      }

      // Convert decimal price to wei (18 decimals) for internal use
      const priceDecimal = parseFloat(priceResult.data.price);
      const currentPrice = BigInt(Math.floor(priceDecimal * 1e18));

      // Get all pending limit orders
      const pendingOrders = await this.orderRepository.find({
        where: {
          type: OrderType.LIMIT,
          status: OrderStatus.PENDING,
        },
        relations: ['user'],
      });

      const executed: Array<{
        orderId: string;
        userId: string;
        side: string;
      }> = [];
      const failed: Array<{ orderId: string; reason: string }> = [];

      for (const order of pendingOrders) {
        const limitPrice = BigInt(order.limitPrice || '0');
        if (limitPrice === BigInt(0)) {
          failed.push({
            orderId: order.id,
            reason: 'Invalid limit price',
          });
          continue;
        }

        const orderSize = BigInt(order.size);
        const leverage = BigInt(order.leverage || '1');

        // Check if limit order should be triggered
        // Long: trigger when current price <= limit price
        // Short: trigger when current price >= limit price
        const shouldTrigger =
          (order.side === OrderSide.LONG && currentPrice <= limitPrice) ||
          (order.side === OrderSide.SHORT && currentPrice >= limitPrice);

        if (!shouldTrigger) {
          continue; // Price hasn't reached limit yet
        }

        // Execute the triggered order
        const userAddress = order.user.address;
        const executionResult = await this.executeOrder(
          userAddress,
          symbol,
          order.side,
          orderSize,
          leverage,
        );

        if (executionResult.success) {
          // Update order status to filled
          order.status = OrderStatus.FILLED;
          order.fillPrice = currentPrice.toString();
          await this.orderRepository.save(order);

          executed.push({
            orderId: order.id,
            userId: order.userId,
            side: order.side,
          });
        } else {
          // Update order status to rejected
          order.status = OrderStatus.REJECTED;
          await this.orderRepository.save(order);

          failed.push({
            orderId: order.id,
            reason: executionResult.error || 'Unknown error',
          });
        }
      }

      return {
        success: true,
        data: { executed, failed },
      };
    } catch (error) {
      this.logger.error(
        `Error executing pending limit orders: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute an order - lock margin, open/increase position, trigger hedge
   * @param userAddress - User's wallet address
   * @param symbol - Trading pair symbol (e.g., 'ETH', 'BTC')
   * @param side - Long or short
   * @param size - Position size in wei (18 decimals)
   * @param leverage - Leverage multiplier (e.g., 10 for 10x)
   */
  async executeOrder(
    userAddress: string,
    symbol: string,
    side: OrderSide,
    size: bigint,
    leverage: bigint,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Validate inputs
    if (size <= BigInt(0)) {
      return { success: false, error: 'Invalid size: must be greater than 0' };
    }

    if (leverage <= BigInt(0)) {
      return {
        success: false,
        error: 'Invalid leverage: must be greater than 0',
      };
    }

    // Normalize address
    const normalizedAddress = userAddress.toLowerCase();

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({ address: normalizedAddress });
      await this.userRepository.save(user);
    }

    // Get current price
    const priceResult = await this.priceService.getPrice(symbol);
    if (!priceResult.success || !priceResult.data) {
      return { success: false, error: 'Failed to get current price' };
    }

    // Convert decimal price to wei (18 decimals) for internal use
    // e.g., "2093.7" -> "2093700000000000000000"
    const priceDecimal = parseFloat(priceResult.data.price);
    const currentPrice = BigInt(Math.floor(priceDecimal * 1e18));

    // Risk check for new position
    const riskCheck = await this.riskEngineService.checkNewPositionRisk(
      userAddress,
      size,
      Number(leverage),
      currentPrice,
    );

    if (!riskCheck.allowed) {
      return { success: false, error: riskCheck.reason };
    }

    // Calculate margin required = size / leverage
    const marginRequired = size / leverage;

    // Lock margin
    const lockResult = await this.balanceService.lockMargin(
      user.id,
      marginRequired,
    );
    if (!lockResult.success) {
      return { success: false, error: lockResult.error };
    }

    // Check for existing same-direction position
    const existingPositions = await this.positionRepository.find({
      where: { userId: user.id, isOpen: true, isLong: side === OrderSide.LONG },
    });

    let positionId: string;
    let positionEntryPrice: string;

    if (existingPositions.length > 0) {
      // Increase existing position
      const existingPosition = existingPositions[0];
      const increaseResult = await this.positionService.increasePosition(
        existingPosition.id,
        size,
        currentPrice,
      );

      if (!increaseResult.success) {
        // Release margin on failure
        await this.balanceService.releaseMargin(user.id, marginRequired);
        return { success: false, error: increaseResult.error };
      }

      positionId = existingPosition.id;
      positionEntryPrice = increaseResult.data.averageEntryPrice;
    } else {
      // Open new position
      const openResult = await this.positionService.openPosition(
        userAddress,
        size,
        currentPrice,
        side === OrderSide.LONG,
      );

      if (!openResult.success) {
        // Release margin on failure
        await this.balanceService.releaseMargin(user.id, marginRequired);
        return { success: false, error: openResult.error };
      }

      positionId = openResult.data.id;
      positionEntryPrice = openResult.data.entryPrice;
    }

    // Trigger hedge (best-effort, don't fail order if hedge fails)
    let hedgeError: string | undefined;
    const hedgeResult = await this.hedgingService.autoHedge(positionId);
    if (!hedgeResult.success) {
      this.logger.warn(
        `Hedge failed for position ${positionId}: ${hedgeResult.error}`,
      );
      hedgeError = hedgeResult.error;
    }

    // Create order record
    const order = this.orderRepository.create();
    order.userId = user.id;
    order.type = OrderType.MARKET;
    order.side = side;
    order.size = size.toString();
    order.leverage = leverage.toString();
    order.fillPrice = currentPrice.toString();
    order.status = OrderStatus.FILLED;

    await this.orderRepository.save(order);

    this.logger.log(
      `Order executed: user=${userAddress}, side=${side}, size=${size.toString()}, ` +
        `leverage=${leverage.toString()}, positionId=${positionId}`,
    );

    return {
      success: true,
      data: {
        orderId: order.id,
        positionId,
        entryPrice: positionEntryPrice,
        marginLocked: marginRequired.toString(),
        hedgeError,
      },
    };
  }
}
