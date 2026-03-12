import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryColumn()
  eventTxHash: string;

  @Column()
  eventName: string;

  @Column()
  blockNumber: number;

  @Column()
  userId: string;

  @Column('varchar', { default: '0' })
  amount: bigint;

  @CreateDateColumn()
  createdAt: Date;
}
