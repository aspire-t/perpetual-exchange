import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Position } from './Position.entity';

export enum HedgeStatus {
  PENDING = 'pending',
  OPEN = 'open',
  CLOSED = 'closed',
  FAILED = 'failed',
}

@Entity('hedges')
export class Hedge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  positionId: string;

  @ManyToOne(() => Position, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @Index()
  @Column({
    type: 'simple-enum',
    enum: HedgeStatus,
    default: HedgeStatus.PENDING,
  })
  status: HedgeStatus;

  @Column('varchar')
  size: string;

  @Column('varchar')
  entryPrice: string;

  @Column('varchar', { nullable: true })
  exitPrice?: string;

  @Column({ default: false })
  isShort: boolean;

  @Column('varchar', { nullable: true })
  pnl?: string;

  @Column({ nullable: true })
  hyperliquidOrderId?: string;

  @Column({ nullable: true })
  blockNumber?: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  closedAt?: Date;
}
