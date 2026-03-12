import { DataSource, Repository } from 'typeorm';
import { User } from '../src/entities/User.entity';
import { Position } from '../src/entities/Position.entity';
import { Deposit } from '../src/entities/Deposit.entity';
import { Withdrawal } from '../src/entities/Withdrawal.entity';
import { createTestDataSource } from './test-utils';

describe('Database Entities', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let positionRepository: Repository<Position>;
  let depositRepository: Repository<Deposit>;
  let withdrawalRepository: Repository<Withdrawal>;

  beforeAll(async () => {
    dataSource = await createTestDataSource();
    userRepository = dataSource.getRepository(User);
    positionRepository = dataSource.getRepository(Position);
    depositRepository = dataSource.getRepository(Deposit);
    withdrawalRepository = dataSource.getRepository(Withdrawal);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await userRepository.clear();
    await positionRepository.clear();
    await depositRepository.clear();
    await withdrawalRepository.clear();
  });

  describe('User Entity', () => {
    it('should create a user', async () => {
      const user = userRepository.create({
        address: '0x1234567890123456789012345678901234567890',
        email: 'test@example.com',
      });

      const saved = await userRepository.save(user);

      expect(saved.id).toBeDefined();
      expect(saved.address).toBe('0x1234567890123456789012345678901234567890');
      expect(saved.email).toBe('test@example.com');
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('should enforce unique address', async () => {
      const user1 = userRepository.create({
        address: '0x1234567890123456789012345678901234567890',
      });
      await userRepository.save(user1);

      const user2 = userRepository.create({
        address: '0x1234567890123456789012345678901234567890',
      });

      await expect(userRepository.save(user2)).rejects.toThrow();
    });

    it('should create user with default role', async () => {
      const user = userRepository.create({
        address: '0xabcdef123456789012345678901234567890abcd',
      });

      const saved = await userRepository.save(user);

      expect(saved.role).toBe('user');
    });
  });

  describe('Position Entity', () => {
    it('should create a position', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x1111111111111111111111111111111111111111',
        }),
      );

      const position = positionRepository.create({
        user,
        size: '1000000000000000000', // 1 ETH
        entryPrice: '3000000000000000000000', // 3000
        isLong: true,
        isOpen: true,
      });

      const saved = await positionRepository.save(position);

      expect(saved.id).toBeDefined();
      expect(saved.user.id).toBe(user.id);
      expect(saved.size).toBe('1000000000000000000');
      expect(saved.entryPrice).toBe('3000000000000000000000');
      expect(saved.isLong).toBe(true);
      expect(saved.isOpen).toBe(true);
      expect(saved.createdAt).toBeDefined();
    });

    it('should create a short position', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x2222222222222222222222222222222222222222',
        }),
      );

      const position = positionRepository.create({
        user,
        size: '500000000000000000',
        entryPrice: '3000000000000000000000',
        isLong: false,
        isOpen: true,
      });

      const saved = await positionRepository.save(position);

      expect(saved.isLong).toBe(false);
    });

    it('should close a position', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x3333333333333333333333333333333333333333',
        }),
      );

      const position = positionRepository.create({
        user,
        size: '1000000000000000000',
        entryPrice: '3000000000000000000000',
        isLong: true,
        isOpen: true,
      });

      const saved = await positionRepository.save(position);
      saved.isOpen = false;
      saved.exitPrice = '3100000000000000000000';
      saved.pnl = '100000000000000000';

      const updated = await positionRepository.save(saved);

      expect(updated.isOpen).toBe(false);
      expect(updated.exitPrice).toBe('3100000000000000000000');
      expect(updated.pnl).toBe('100000000000000000');
    });
  });

  describe('Deposit Entity', () => {
    it('should create a deposit', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x4444444444444444444444444444444444444444',
        }),
      );

      const deposit = depositRepository.create({
        user,
        amount: '1000000000000000000', // 1 ETH
        txHash:
          '0xabc123def456789012345678901234567890123456789012345678901234abcd',
      });

      const saved = await depositRepository.save(deposit);

      expect(saved.id).toBeDefined();
      expect(saved.user.id).toBe(user.id);
      expect(saved.amount).toBe('1000000000000000000');
      expect(saved.txHash).toBe(
        '0xabc123def456789012345678901234567890123456789012345678901234abcd',
      );
      expect(saved.status).toBe('pending');
    });

    it('should update deposit status to confirmed', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x5555555555555555555555555555555555555555',
        }),
      );

      const deposit = depositRepository.create({
        user,
        amount: '500000000000000000',
        txHash:
          '0x111222333444555666777888999aaabbbcccdddeeefff000111222333444555',
        status: 'pending',
      });

      const saved = await depositRepository.save(deposit);
      saved.status = 'confirmed';

      const updated = await depositRepository.save(saved);

      expect(updated.status).toBe('confirmed');
    });

    it('should update deposit status to failed', async () => {
      const deposit = depositRepository.create({
        user: await userRepository.save(
          userRepository.create({
            address: '0x6666666666666666666666666666666666666666',
          }),
        ),
        amount: '500000000000000000',
        txHash: '0xdeadbeef',
        status: 'pending',
      });

      const saved = await depositRepository.save(deposit);
      saved.status = 'failed';

      const updated = await depositRepository.save(saved);

      expect(updated.status).toBe('failed');
    });
  });

  describe('Withdrawal Entity', () => {
    it('should create a withdrawal request', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x7777777777777777777777777777777777777777',
        }),
      );

      const withdrawal = withdrawalRepository.create({
        user,
        amount: '500000000000000000',
      });

      const saved = await withdrawalRepository.save(withdrawal);

      expect(saved.id).toBeDefined();
      expect(saved.user.id).toBe(user.id);
      expect(saved.amount).toBe('500000000000000000');
      expect(saved.status).toBe('pending');
    });

    it('should approve a withdrawal', async () => {
      const user = await userRepository.save(
        userRepository.create({
          address: '0x8888888888888888888888888888888888888888',
        }),
      );

      const withdrawal = withdrawalRepository.create({
        user,
        amount: '500000000000000000',
        status: 'pending',
      });

      const saved = await withdrawalRepository.save(withdrawal);
      saved.status = 'approved';
      saved.txHash = '0xwithdrawal123456789abcdef';

      const updated = await withdrawalRepository.save(saved);

      expect(updated.status).toBe('approved');
      expect(updated.txHash).toBe('0xwithdrawal123456789abcdef');
    });

    it('should reject a withdrawal', async () => {
      const withdrawal = withdrawalRepository.create({
        user: await userRepository.save(
          userRepository.create({
            address: '0x9999999999999999999999999999999999999999',
          }),
        ),
        amount: '500000000000000000',
        status: 'pending',
      });

      const saved = await withdrawalRepository.save(withdrawal);
      saved.status = 'rejected';

      const updated = await withdrawalRepository.save(saved);

      expect(updated.status).toBe('rejected');
    });
  });

  describe('Entity Relationships', () => {
    it('should load user with positions', async () => {
      const user = userRepository.create({
        address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      });
      await userRepository.save(user);

      const position1 = positionRepository.create({
        user,
        size: '1000000000000000000',
        entryPrice: '3000000000000000000000',
        isLong: true,
        isOpen: true,
      });

      const position2 = positionRepository.create({
        user,
        size: '500000000000000000',
        entryPrice: '2900000000000000000000',
        isLong: false,
        isOpen: true,
      });

      await positionRepository.save([position1, position2]);

      const savedUser = await userRepository.findOne({
        where: { id: user.id },
        relations: ['positions'],
      });

      expect(savedUser?.positions.length).toBe(2);
    });

    it('should load user with deposits', async () => {
      const user = userRepository.create({
        address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      });
      await userRepository.save(user);

      const deposit1 = depositRepository.create({
        user,
        amount: '1000000000000000000',
        txHash: '0xdeposit1',
      });

      const deposit2 = depositRepository.create({
        user,
        amount: '500000000000000000',
        txHash: '0xdeposit2',
      });

      await depositRepository.save([deposit1, deposit2]);

      const savedUser = await userRepository.findOne({
        where: { id: user.id },
        relations: ['deposits'],
      });

      expect(savedUser?.deposits.length).toBe(2);
    });

    it('should load user with withdrawals', async () => {
      const user = userRepository.create({
        address: '0xcccccccccccccccccccccccccccccccccccccccc',
      });
      await userRepository.save(user);

      const withdrawal1 = withdrawalRepository.create({
        user,
        amount: '500000000000000000',
        status: 'pending',
      });

      const withdrawal2 = withdrawalRepository.create({
        user,
        amount: '300000000000000000',
        status: 'approved',
      });

      await withdrawalRepository.save([withdrawal1, withdrawal2]);

      const savedUser = await userRepository.findOne({
        where: { id: user.id },
        relations: ['withdrawals'],
      });

      expect(savedUser?.withdrawals.length).toBe(2);
    });
  });
});
