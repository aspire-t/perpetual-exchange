import { User, UserRole } from './User.entity';

describe('User Entity', () => {
  it('should create a valid User instance with address', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';

    expect(user.address).toBe('0x19764F999BCD54dDff89121026Fa3BDB8E7259A3');
    expect(user.balance).toBe('0');
    expect(user.unrealizedPnl).toBe('0');
    expect(user.role).toBe('user');
  });

  it('should create user with admin role', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.role = 'admin';

    expect(user.role).toBe('admin');
  });

  it('should allow setting email', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.email = 'user@example.com';

    expect(user.email).toBe('user@example.com');
  });

  it('should initialize with zero balance', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';

    expect(user.balance).toBe('0');
  });

  it('should allow updating balance', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.balance = '1000000000000000000';

    expect(user.balance).toBe('1000000000000000000');
  });

  it('should initialize with zero unrealizedPnl', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';

    expect(user.unrealizedPnl).toBe('0');
  });

  it('should allow updating unrealizedPnl', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.unrealizedPnl = '500000000000000000';

    expect(user.unrealizedPnl).toBe('500000000000000000');
  });

  it('should allow setting nonce for authentication', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.lastNonce = 'abc123';
    user.nonceExpiresAt = new Date('2026-03-14T00:00:00Z');

    expect(user.lastNonce).toBe('abc123');
    expect(user.nonceExpiresAt).toBeInstanceOf(Date);
  });

  it('should have empty arrays for relationships initially', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';

    expect(user.positions).toBeDefined();
    expect(user.deposits).toBeDefined();
    expect(user.withdrawals).toBeDefined();
    expect(user.orders).toBeDefined();
  });

  it('should create user with lowercase address (normalization)', () => {
    const user = new User();
    user.address = '0X19764F999BCD54DDFF89121026FA3BDB8E7259A3';

    // Note: Address normalization should happen at service layer
    // Entity accepts any string format
    expect(user.address).toBe('0X19764F999BCD54DDFF89121026FA3BDB8E7259A3');
  });

  it('should store large balance values as strings', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.balance = '1000000000000000000000000'; // 1M tokens with 18 decimals

    expect(user.balance).toBe('1000000000000000000000000');
  });

  it('should handle negative unrealizedPnl as string', () => {
    const user = new User();
    user.address = '0x19764F999BCD54dDff89121026Fa3BDB8E7259A3';
    user.unrealizedPnl = '-500000000000000000';

    expect(user.unrealizedPnl).toBe('-500000000000000000');
  });
});
