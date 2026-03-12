import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.entity';

export type DepositStatus = 'pending' | 'confirmed' | 'failed';

@Entity('deposits')
export class Deposit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.deposits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { default: '0' })
  amount: bigint;

  @Column({ default: 'pending' })
  status: DepositStatus;

  @Column({ nullable: true })
  txHash?: string;

  @CreateDateColumn()
  createdAt: Date;
}
