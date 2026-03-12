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

export type WithdrawalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing';

@Entity('withdrawals')
export class Withdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.withdrawals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { default: '0' })
  amount: string;

  @Index()
  @Column({ default: 'pending' })
  status: WithdrawalStatus;

  @Column({ nullable: true })
  txHash?: string;

  @CreateDateColumn()
  createdAt: Date;
}
