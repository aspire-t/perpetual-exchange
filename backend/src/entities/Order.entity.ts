import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
}

export enum OrderSide {
  LONG = 'long',
  SHORT = 'short',
}

export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'simple-enum',
    enum: OrderType,
  })
  type: OrderType;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: OrderSide,
  })
  side: OrderSide;

  @Column('varchar')
  size: string;

  @Column('varchar', { nullable: true })
  limitPrice?: string;

  @Column('varchar', { nullable: true })
  fillPrice?: string;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Index()
  @Column({ nullable: true })
  txHash?: string;

  @Column({ nullable: true })
  blockNumber?: number;

  @CreateDateColumn()
  createdAt: Date;
}
