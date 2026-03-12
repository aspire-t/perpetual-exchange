import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderType,
  OrderSide,
  OrderStatus,
} from '../entities/Order.entity';
import { User } from '../entities/User.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createOrder(
    userAddress: string,
    type: OrderType,
    side: OrderSide,
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

    // Create order
    const order = this.orderRepository.create({
      userId: user.id,
      type,
      side,
      size,
      limitPrice,
      status: OrderStatus.PENDING,
    });

    await this.orderRepository.save(order);

    return {
      success: true,
      data: {
        id: order.id,
        userId: order.userId,
        type: order.type,
        side: order.side,
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
        size: order.size.toString(),
        limitPrice: order.limitPrice?.toString(),
        fillPrice: order.fillPrice?.toString(),
        status: order.status,
        txHash: order.txHash,
        blockNumber: order.blockNumber,
        createdAt: order.createdAt,
      },
    };
  }

  async getUserOrders(
    userAddress: string,
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    // Normalize address to lowercase for consistent lookup
    const normalizedAddress = userAddress.toLowerCase();

    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      // Return empty array if user not found (no orders yet)
      return { success: true, data: [] };
    }

    const orders = await this.orderRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        userId: order.userId,
        type: order.type,
        side: order.side,
        size: order.size.toString(),
        limitPrice: order.limitPrice?.toString(),
        fillPrice: order.fillPrice?.toString(),
        status: order.status,
        txHash: order.txHash,
        blockNumber: order.blockNumber,
        createdAt: order.createdAt,
      })),
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
}
