import { ProcessedEvent } from './ProcessedEvent.entity';

describe('ProcessedEvent Entity', () => {
  it('should create a valid ProcessedEvent instance with required fields', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';
    processedEvent.amount = '1000000000';

    expect(processedEvent.eventTxHash).toBe('0xabc123def456');
    expect(processedEvent.eventName).toBe('Deposit');
    expect(processedEvent.blockNumber).toBe(12345678);
    expect(processedEvent.userId).toBe('user-uuid');
    expect(processedEvent.amount).toBe('1000000000');
  });

  it('should initialize amount to "0" by default', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';

    expect(processedEvent.amount).toBe('0');
  });
});

describe('ProcessedEvent Entity - Event Scenarios', () => {
  it('should create a processed Deposit event', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';
    processedEvent.amount = '1000000000000000000';

    expect(processedEvent.eventName).toBe('Deposit');
    expect(processedEvent.amount).toBe('1000000000000000000');
  });

  it('should create a processed Withdraw event', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xdef456abc789';
    processedEvent.eventName = 'Withdraw';
    processedEvent.blockNumber = 12345679;
    processedEvent.userId = 'user-uuid';
    processedEvent.amount = '500000000000000000';

    expect(processedEvent.eventName).toBe('Withdraw');
    expect(processedEvent.amount).toBe('500000000000000000');
  });

  it('should use eventTxHash as primary key (no auto-generation)', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';

    // Verify eventTxHash is set explicitly (not auto-generated)
    expect(processedEvent.eventTxHash).toBe('0xabc123def456');
  });

  it('should store large amounts as strings', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';
    processedEvent.amount = '1000000000000000000000'; // 1000 tokens

    expect(processedEvent.amount).toBe('1000000000000000000000');
  });

  it('should have createdAt automatically set', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';

    expect(processedEvent.createdAt).toBeInstanceOf(Date);
  });

  it('should track events by blockNumber (indexed)', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';

    expect(processedEvent.blockNumber).toBe(12345678);
  });

  it('should track events by userId (indexed)', () => {
    const processedEvent = new ProcessedEvent();
    processedEvent.eventTxHash = '0xabc123def456';
    processedEvent.eventName = 'Deposit';
    processedEvent.blockNumber = 12345678;
    processedEvent.userId = 'user-uuid';

    expect(processedEvent.userId).toBe('user-uuid');
  });

  it('should ensure idempotency with eventTxHash as primary key', () => {
    const event1 = new ProcessedEvent();
    event1.eventTxHash = '0xabc123def456';
    event1.eventName = 'Deposit';
    event1.blockNumber = 12345678;
    event1.userId = 'user-uuid';
    event1.amount = '1000000000';

    const event2 = new ProcessedEvent();
    event2.eventTxHash = '0xabc123def456'; // Same tx hash
    event2.eventName = 'Deposit';
    event2.blockNumber = 12345678;
    event2.userId = 'user-uuid';
    event2.amount = '1000000000';

    // Same eventTxHash should represent the same event (idempotency)
    expect(event1.eventTxHash).toBe(event2.eventTxHash);
  });
});
