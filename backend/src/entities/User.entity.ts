import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Position } from './Position.entity';
import { Deposit } from './Deposit.entity';
import { Withdrawal } from './Withdrawal.entity';
import { Order } from './Order.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  address: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ default: 'user' })
  role: UserRole;

  @Column('varchar', { default: '0' })
  balance: string;

  @Column('varchar', { default: '0' })
  unrealizedPnl: string;

  @Column({ nullable: true })
  lastNonce?: string;

  @Column({ nullable: true })
  nonceExpiresAt?: Date;

  @OneToMany(() => Position, (position) => position.user)
  positions: Position[];

  @OneToMany(() => Deposit, (deposit) => deposit.user)
  deposits: Deposit[];

  @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.user)
  withdrawals: Withdrawal[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
