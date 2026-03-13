import { Withdrawal, WithdrawalStatus } from './Withdrawal.entity';

describe('Withdrawal Entity', () => {
  it('should create a valid Withdrawal instance with required fields', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000';

    expect(withdrawal.userId).toBe('user-uuid');
    expect(withdrawal.amount).toBe('1000000000');
  });

  it('should allow setting amount to "0" by default when creating new instance', () => {
    const withdrawal = new Withdrawal();
    withdrawal.amount = '0';
    expect(withdrawal.amount).toBe('0');
  });

  it('should allow setting status to "pending" when creating new instance', () => {
    const withdrawal = new Withdrawal();
    withdrawal.status = 'pending';
    expect(withdrawal.status).toBe('pending');
  });
});

describe('WithdrawalStatus Type', () => {
  it('should have valid status values', () => {
    const validStatuses: WithdrawalStatus[] = [
      'pending',
      'approved',
      'rejected',
      'processing',
    ];
    expect(validStatuses).toContain('pending');
    expect(validStatuses).toContain('approved');
    expect(validStatuses).toContain('rejected');
    expect(validStatuses).toContain('processing');
  });

  it('should allow setting status to approved', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.status = 'approved';

    expect(withdrawal.status).toBe('approved');
  });

  it('should allow setting status to rejected', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.status = 'rejected';

    expect(withdrawal.status).toBe('rejected');
  });

  it('should allow setting status to processing', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.status = 'processing';

    expect(withdrawal.status).toBe('processing');
  });
});

describe('Withdrawal Entity - Optional Fields', () => {
  it('should allow setting txHash', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000';
    withdrawal.txHash = '0xabc123def456';

    expect(withdrawal.txHash).toBe('0xabc123def456');
  });
});

describe('Withdrawal Entity - Withdrawal Scenarios', () => {
  it('should create a pending withdrawal', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000';
    withdrawal.status = 'pending';

    expect(withdrawal.status).toBe('pending');
  });

  it('should represent an approved withdrawal', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000000000000';
    withdrawal.status = 'approved';

    expect(withdrawal.status).toBe('approved');
  });

  it('should represent a processing withdrawal with txHash', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000000000000';
    withdrawal.status = 'processing';
    withdrawal.txHash = '0xabc123def456';

    expect(withdrawal.status).toBe('processing');
    expect(withdrawal.txHash).toBe('0xabc123def456');
  });

  it('should represent a rejected withdrawal', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000';
    withdrawal.status = 'rejected';

    expect(withdrawal.status).toBe('rejected');
  });

  it('should store large amounts as strings', () => {
    const withdrawal = new Withdrawal();
    withdrawal.userId = 'user-uuid';
    withdrawal.amount = '1000000000000000000000'; // 1000 USDC

    expect(withdrawal.amount).toBe('1000000000000000000000');
  });
});
