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

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.positions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { default: '0' })
  size: bigint;

  @Column('varchar', { default: '0' })
  entryPrice: bigint;

  @Column('varchar', { nullable: true })
  exitPrice?: bigint;

  @Column({ default: true })
  isLong: boolean;

  @Index()
  @Column({ default: true })
  isOpen: boolean;

  @Column('varchar', { nullable: true })
  pnl?: bigint;

  @Column({ nullable: true })
  closedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
