import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('klines')
export class Kline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  symbol: string;

  @Column()
  @Index()
  timeframe: string;

  @Column()
  @Index()
  timestamp: Date;

  @Column('varchar')
  open: string;

  @Column('varchar')
  high: string;

  @Column('varchar')
  low: string;

  @Column('varchar')
  close: string;

  @Column('varchar')
  volume: string;

  @CreateDateColumn()
  createdAt: Date;
}
