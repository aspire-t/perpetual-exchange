import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from './entities/User.entity';
import { Position } from './entities/Position.entity';
import { Order, OrderStatus } from './entities/Order.entity';
import { scaleQuoteToInternal } from './common/precision';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getStats() {
    const users = await this.userRepository.find({
      select: ['balance', 'locked'],
    });
    const openPositions = await this.positionRepository.find({
      where: { isOpen: true },
      select: ['size'],
    });
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dailyOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.FILLED,
        createdAt: MoreThan(dayAgo),
      },
      select: ['size'],
    });

    const totalValueLockedInternal = users.reduce((acc, user) => {
      const balance = BigInt(user.balance || '0');
      const locked = BigInt(user.locked || '0');
      return acc + balance + locked;
    }, BigInt(0));
    const totalOpenInterestInternal = openPositions.reduce(
      (acc, position) => acc + BigInt(position.size || '0'),
      BigInt(0),
    );
    const totalVolume24hInternal = dailyOrders.reduce(
      (acc, order) => acc + BigInt(order.size || '0'),
      BigInt(0),
    );

    return {
      success: true,
      data: {
        totalValueLocked: scaleQuoteToInternal(totalValueLockedInternal).toString(),
        openInterest: totalOpenInterestInternal.toString(),
        volume24h: totalVolume24hInternal.toString(),
        trades24h: dailyOrders.length,
      },
    };
  }
}
