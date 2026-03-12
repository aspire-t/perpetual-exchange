import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryColumn()
  eventTxHash: string;

  @Column()
  eventName: string;

  @Index()
  @Column()
  blockNumber: number;

  @Index()
  @Column()
  userId: string;

  @Column('varchar', { default: '0' })
  amount: bigint;

  @CreateDateColumn()
  createdAt: Date;
}
