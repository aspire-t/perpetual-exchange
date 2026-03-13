import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('funding_rates')
export class FundingRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  symbol: string;

  @Column('varchar', { default: '0' })
  rate: string;

  @Column('varchar', { default: '0' })
  price: string;

  @Column({ default: 0 })
  interval: number;

  @CreateDateColumn()
  timestamp: Date;
}
