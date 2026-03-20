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
import { Hedge, HedgeStatus } from '../entities/Hedge.entity';
import { ethers } from 'ethers';
import { DataSource } from 'typeorm';
import { scaleInternalToQuoteRoundedUp } from '../common/precision';

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
    private dataSource: DataSource,
  ) {}

  private async persistExecutionInTransaction(params: {
    userId: string;
    side: OrderSide;
    symbol: string;
    size: bigint;
    leverage: bigint;
    exactCurrentPrice: bigint;
    isShortHedge: boolean;
    hedgeOrderId: string;
  }) {
    return this.dataSource.transaction(async (manager) => {
      const existingPositions = await manager.find(Position, {
        where: {
          userId: params.userId,
          isOpen: true,
          isLong: params.side === OrderSide.LONG,
        },
      });

      let position: Position;
      let positionEntryPrice: string;

      if (existingPositions.length > 0) {
        position = existingPositions[0];
        const oldSize = BigInt(position.size);
        const oldEntryPrice = BigInt(position.entryPrice);
        const newSize = oldSize + params.size;
        const weightedTotal =
          oldSize * oldEntryPrice + params.size * params.exactCurrentPrice;
        const averageEntryPrice = weightedTotal / newSize;

        position.size = newSize.toString();
        position.entryPrice = averageEntryPrice.toString();
        await manager.save(Position, position);
        positionEntryPrice = averageEntryPrice.toString();
      } else {
        position = manager.create(Position, {
          userId: params.userId,
          size: params.size.toString(),
          entryPrice: params.exactCurrentPrice.toString(),
          isLong: params.side === OrderSide.LONG,
          isOpen: true,
          leverage: params.leverage.toString(),
          fundingPaid: '0',
        });
        await manager.save(Position, position);
        positionEntryPrice = position.entryPrice;
      }

      const hedge = manager.create(Hedge, {
        positionId: position.id,
        size: params.size.toString(),
        entryPrice: params.exactCurrentPrice.toString(),
        isShort: params.isShortHedge,
        status: HedgeStatus.OPEN,
        hyperliquidOrderId: params.hedgeOrderId,
      });
      await manager.save(Hedge, hedge);

      const order = manager.create(Order, {
        userId: params.userId,
        type: OrderType.MARKET,
        side: params.side,
        symbol: params.symbol,
        size: params.size.toString(),
        leverage: params.leverage.toString(),
        fillPrice: params.exactCurrentPrice.toString(),
        status: OrderStatus.FILLED,
      });
      await manager.save(Order, order);

      return {
        orderId: order.id,
        positionId: position.id,
        positionEntryPrice,
      };
    });
  }

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
      const currentPrice = ethers.parseUnits(priceResult.data.price, 18);

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
    const currentPrice = ethers.parseUnits(priceResult.data.price, 18);

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

    // Calculate margin required = size / leverage (18 decimals)
    const marginRequired = size / leverage;

    // Convert margin to USDC decimals (6) for balance locking
    // Use ceiling division to ensure we lock enough funds
    // marginRequiredUSDC = ceil(marginRequired / 1e12)
    const marginRequiredUSDC = scaleInternalToQuoteRoundedUp(marginRequired);

    // Lock margin
    const lockResult = await this.balanceService.lockMargin(
      user.id,
      marginRequiredUSDC,
    );
    if (!lockResult.success) {
      return { success: false, error: lockResult.error };
    }

    // Calculate trading fee: 0.1% based on notional value
    // Notional value = size * currentPrice / 1e18
    const notionalValue = (size * currentPrice) / BigInt(1e18);
    const tradingFee = notionalValue / BigInt(1000); // 0.1% = 1/1000

    // Convert fee to USDC decimals (6)
    const tradingFeeUSDC = scaleInternalToQuoteRoundedUp(tradingFee);

    const feeResult = await this.balanceService.deductFee(user.id, tradingFeeUSDC);
    if (!feeResult.success) {
      await this.balanceService.releaseMargin(user.id, marginRequiredUSDC);
      return { success: false, error: feeResult.error };
    }

    const isShortHedge = side === OrderSide.LONG;
    const saveRejectedOrder = async () => {
      const rejectedOrder = this.orderRepository.create();
      rejectedOrder.userId = user.id;
      rejectedOrder.type = OrderType.MARKET;
      rejectedOrder.side = side;
      rejectedOrder.symbol = symbol;
      rejectedOrder.size = size.toString();
      rejectedOrder.leverage = leverage.toString();
      rejectedOrder.status = OrderStatus.REJECTED;
      await this.orderRepository.save(rejectedOrder);
      return rejectedOrder;
    };
    const refundFunds = async () => {
      await this.balanceService.releaseMargin(user.id, marginRequiredUSDC);
      await this.balanceService.refundFee(user.id, tradingFeeUSDC);
    };
    const compensateHedge = async () => {
      return this.hedgingService.executeHedgeOrder(symbol, size, !isShortHedge);
    };

    const hedgeResult = await this.hedgingService.executeHedgeOrder(
      symbol,
      size,
      isShortHedge,
    );

    if (!hedgeResult.success || !hedgeResult.data) {
      await refundFunds();
      await saveRejectedOrder();
      return { success: false, error: `Hedge execution failed: ${hedgeResult.error}` };
    }

    let exactCurrentPrice: bigint;
    try {
      exactCurrentPrice = ethers.parseUnits(hedgeResult.data.fillPrice, 18);
    } catch (e) {
      exactCurrentPrice = currentPrice;
    }

    let persistedResult: {
      orderId: string;
      positionId: string;
      positionEntryPrice: string;
    };
    try {
      persistedResult = await this.persistExecutionInTransaction({
        userId: user.id,
        side,
        symbol,
        size,
        leverage,
        exactCurrentPrice,
        isShortHedge,
        hedgeOrderId: hedgeResult.data.orderId,
      });
    } catch (error) {
      const compensateResult = await compensateHedge();
      await refundFunds();
      await saveRejectedOrder();
      this.logger.error(`Failed to persist local execution after hedge: ${error.message}`);
      if (!compensateResult.success) {
        return {
          success: false,
          error: `Failed to persist local execution: ${error.message}; hedge compensation failed: ${compensateResult.error}`,
        };
      }
      return {
        success: false,
        error: `Failed to persist local execution: ${error.message}`,
      };
    }

    this.logger.log(
      `Order executed: user=${userAddress}, side=${side}, size=${size.toString()}, ` +
        `leverage=${leverage.toString()}, positionId=${persistedResult.positionId}`,
    );

    return {
      success: true,
      data: {
        orderId: persistedResult.orderId,
        positionId: persistedResult.positionId,
        entryPrice: persistedResult.positionEntryPrice,
        marginLocked: marginRequired.toString(),
      },
    };
  }
}
