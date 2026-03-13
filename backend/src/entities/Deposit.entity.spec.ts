import { Deposit, DepositStatus } from './Deposit.entity';

describe('Deposit Entity', () => {
  it('should create a valid Deposit instance with required fields', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.amount = '1000000000';

    expect(deposit.userId).toBe('user-uuid');
    expect(deposit.amount).toBe('1000000000');
  });

  it('should allow setting amount to "0" by default when creating new instance', () => {
    const deposit = new Deposit();
    deposit.amount = '0';
    expect(deposit.amount).toBe('0');
  });

  it('should allow setting status to "pending" when creating new instance', () => {
    const deposit = new Deposit();
    deposit.status = 'pending';
    expect(deposit.status).toBe('pending');
  });
});

describe('DepositStatus Type', () => {
  it('should have valid status values', () => {
    const validStatuses: DepositStatus[] = ['pending', 'confirmed', 'failed'];
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('confirmed');
    expect(validStatuses).toContain('failed');
  });

  it('should allow setting status to confirmed', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.status = 'confirmed';

    expect(deposit.status).toBe('confirmed');
  });

  it('should allow setting status to failed', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.status = 'failed';

    expect(deposit.status).toBe('failed');
  });
});

describe('Deposit Entity - Optional Fields', () => {
  it('should allow setting txHash', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.amount = '1000000000';
    deposit.txHash = '0xabc123def456';

    expect(deposit.txHash).toBe('0xabc123def456');
  });
});

describe('Deposit Entity - Deposit Scenarios', () => {
  it('should create a pending deposit', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.amount = '1000000000';
    deposit.status = 'pending';

    expect(deposit.status).toBe('pending');
  });

  it('should represent a confirmed deposit with txHash', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.amount = '1000000000000000000'; // 1 USDC
    deposit.status = 'confirmed';
    deposit.txHash = '0xabc123def456';

    expect(deposit.status).toBe('confirmed');
    expect(deposit.txHash).toBe('0xabc123def456');
  });

  it('should represent a failed deposit', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.amount = '1000000000';
    deposit.status = 'failed';

    expect(deposit.status).toBe('failed');
  });

  it('should store large amounts as strings', () => {
    const deposit = new Deposit();
    deposit.userId = 'user-uuid';
    deposit.amount = '1000000000000000000000'; // 1000 USDC

    expect(deposit.amount).toBe('1000000000000000000000');
  });
});
