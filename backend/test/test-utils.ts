import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../src/entities/User.entity';
import { Position } from '../src/entities/Position.entity';
import { Deposit } from '../src/entities/Deposit.entity';
import { Withdrawal } from '../src/entities/Withdrawal.entity';
import { Order } from '../src/entities/Order.entity';
import { Hedge } from '../src/entities/Hedge.entity';

export const testOptions: DataSourceOptions = {
  type: 'sqlite',
  database: ':memory:',
  dropSchema: true,
  entities: [User, Position, Deposit, Withdrawal, Order, Hedge],
  synchronize: true,
  // Disable foreign key constraints for testing
  migrationsRun: false,
};

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource(testOptions);
  await dataSource.initialize();
  // Disable foreign key constraints in SQLite for testing
  await dataSource.query('PRAGMA foreign_keys = OFF');
  return dataSource;
}
