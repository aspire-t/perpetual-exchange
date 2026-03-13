# Test Coverage Gap Analysis

**Date:** 2026-03-13
**Scope:** Backend (NestJS) + Frontend (Next.js)

---

## Executive Summary

| Category | Total Files | With Tests | Coverage |
|----------|-------------|------------|----------|
| Backend Services | 15 | 14 | 93% |
| Backend Controllers | 14 | 14 | 100% |
| Backend Entities | 9 | 1 | 11% |
| Frontend Hooks | 8 | 3 | 38% |
| Infrastructure Files | 2 | 0 | 0% |

**Overall Test Coverage: ~68%**

### Critical Gaps
1. **All entity files lack tests** (except Kline.entity) - 8 files without tests
2. **Infrastructure files** - `main.ts` and `app.service.ts` have no tests
3. **Frontend hooks** - 5 critical hooks have no test coverage

---

## Backend Coverage Details

### Services (14/15 Covered - 93%)

| Service | Test File | Status |
|---------|-----------|--------|
| `app.service.ts` | ❌ | **Missing** |
| `auth/auth.service.ts` | ✓ auth.service.spec.ts | Covered |
| `balance/balance.service.ts` | ✓ balance.service.spec.ts | Covered |
| `deposit/deposit.service.ts` | ✓ deposit.service.spec.ts | Covered |
| `withdrawal/withdrawal.service.ts` | ✓ withdrawal.service.spec.ts | Covered |
| `order/order.service.ts` | ✓ order.service.spec.ts | Covered |
| `position/position.service.ts` | ✓ position.service.spec.ts | Covered |
| `hedging/hedging.service.ts` | ✓ hedging.service.spec.ts | Covered |
| `price/price.service.ts` | ✓ price.service.spec.ts | Covered |
| `risk/risk-engine.service.ts` | ✓ risk-engine.service.spec.ts | Covered |
| `funding/funding-rate.service.ts` | ✓ funding-rate.service.spec.ts | Covered |
| `indexer/indexer.service.ts` | ✓ indexer.service.spec.ts | Covered |
| `indexer/event-listener.service.ts` | ✓ event-listener.service.spec.ts | Covered |
| `kline/kline.service.ts` | ✓ kline.service.spec.ts | Covered |
| `faucet/faucet.service.ts` | ✓ faucet.service.spec.ts | Covered |

### Controllers (14/14 Covered - 100%)

| Controller | Test File | Status |
|------------|-----------|--------|
| `app.controller.ts` | ✓ app.controller.spec.ts | Covered |
| `auth/auth.controller.ts` | ✓ auth.controller.spec.ts | Covered |
| `balance/balance.controller.ts` | ✓ balance.controller.spec.ts | Covered |
| `deposit/deposit.controller.ts` | ✓ deposit.controller.spec.ts | Covered |
| `withdrawal/withdrawal.controller.ts` | ✓ withdrawal.controller.spec.ts | Covered |
| `order/order.controller.ts` | ✓ order.controller.spec.ts | Covered |
| `position/position.controller.ts` | ✓ position.controller.spec.ts | Covered |
| `hedging/hedging.controller.ts` | ✓ hedging.controller.spec.ts | Covered |
| `price/price.controller.ts` | ✓ price.controller.spec.ts | Covered |
| `risk/risk-engine.controller.ts` | ✓ risk-engine.controller.spec.ts | Covered |
| `funding/funding-rate.controller.ts` | ✓ funding-rate.controller.spec.ts | Covered |
| `indexer/indexer.controller.ts` | ✓ indexer.controller.spec.ts | Covered |
| `kline/kline.controller.ts` | ✓ kline.controller.spec.ts | Covered |
| `faucet/faucet.controller.ts` | ✓ faucet.controller.spec.ts | Covered |

### Entities (1/9 Covered - 11%)

| Entity | Test File | Status |
|--------|-----------|--------|
| `User.entity.ts` | ❌ | **Missing** |
| `Deposit.entity.ts` | ❌ | **Missing** |
| `Withdrawal.entity.ts` | ❌ | **Missing** |
| `Position.entity.ts` | ❌ | **Missing** |
| `Hedge.entity.ts` | ❌ | **Missing** |
| `FundingRate.entity.ts` | ❌ | **Missing** |
| `ProcessedEvent.entity.ts` | ❌ | **Missing** |
| `Order.entity.ts` | ❌ | **Missing** |
| `Kline.entity.ts` | ✓ Kline.entity.spec.ts | Covered |

### Infrastructure Files (0/2 Covered - 0%)

| File | Test File | Status | Notes |
|------|-----------|--------|-------|
| `main.ts` | ❌ | **Missing** | Bootstrap file with CORS, ValidationPipe |
| `app.service.ts` | ❌ | **Missing** | Basic service (may be minimal value) |

### Additional Backend Files Without Tests

| File | Priority | Notes |
|------|----------|-------|
| `hedging/hyperliquid.client.ts` | High | External API integration - should be tested |

---

## Frontend Coverage Details

### Hooks (3/8 Covered - 38%)

| Hook | Test File | Status |
|------|-----------|--------|
| `useDeposit.ts` | ❌ | **Missing** |
| `useApprove.ts` | ❌ | **Missing** |
| `useWithdraw.ts` | ❌ | **Missing** |
| `useUSDCBalance.ts` | ❌ | **Missing** |
| `useVaultAllowance.ts` | ❌ | **Missing** |
| `useDeposits.ts` | ✓ useDeposits.test.tsx | Covered |
| `useWithdrawals.ts` | ✓ useWithdrawals.test.tsx | Covered |
| `useOrders.ts` | ✓ useOrders.test.tsx | Covered |

### Configuration Files (0/1 Covered - 0%)

| File | Test File | Status |
|------|-----------|--------|
| `contracts.ts` | ❌ | **Missing** |
| `wagmi.ts` | ❌ | **Missing** |

---

## Recommended Test Cases by Priority

### Priority: CRITICAL (Add Immediately)

#### 1. User.entity.ts
**Why:** Core entity used across all modules
**Recommended Tests:**
```typescript
describe('User Entity', () => {
  it('should create user with address and default balance', () => {
    const user = new User();
    user.address = '0x123...';
    expect(user.balance).toBe('0');
  });

  it('should cascade delete orders and positions', () => {
    // Test relationship cascade behavior
  });
});
```

#### 2. Position.entity.ts
**Why:** Critical for trading logic, liquidation calculations
**Recommended Tests:**
```typescript
describe('Position Entity', () => {
  it('should calculate liquidation price correctly', () => {
    // Test liquidation price formula
  });

  it('should track fundingPaid correctly', () => {
    // Test funding accumulation
  });
});
```

#### 3. Order.entity.ts
**Why:** Core trading entity with complex enum states
**Recommended Tests:**
```typescript
describe('Order Entity', () => {
  it('should validate OrderType enum values', () => {
    expect(OrderType.MARKET).toBe('market');
    expect(OrderType.LIMIT).toBe('limit');
  });

  it('should validate OrderSide enum values', () => {
    expect(OrderSide.LONG).toBe('long');
    expect(OrderSide.SHORT).toBe('short');
  });

  it('should validate OrderStatus enum values', () => {
    expect(OrderStatus.PENDING).toBe('pending');
    expect(OrderStatus.FILLED).toBe('filled');
  });
});
```

#### 4. main.ts
**Why:** Application bootstrap - ensures server starts correctly
**Recommended Tests:**
```typescript
describe('Bootstrap (main.ts)', () => {
  it('should start application with CORS enabled', async () => {
    // Test CORS configuration
  });

  it('should configure ValidationPipe correctly', async () => {
    // Test global pipe setup
  });

  it('should listen on configured port', async () => {
    // Test server binding
  });
});
```

### Priority: HIGH

#### 5. useDeposit.ts Hook
**Why:** Direct blockchain interaction - financial risk
**Recommended Tests:**
```typescript
describe('useDeposit Hook', () => {
  it('should call deposit contract method with correct amount', async () => {
    // Test deposit execution
  });

  it('should handle deposit failure gracefully', async () => {
    // Test error handling
  });
});
```

#### 6. useWithdraw.ts Hook
**Why:** Direct blockchain interaction - financial risk
**Recommended Tests:**
```typescript
describe('useWithdraw Hook', () => {
  it('should call withdraw function with correct parameters', async () => {
    // Test withdraw execution
  });

  it('should validate withdraw amount against balance', () => {
    // Test validation logic
  });
});
```

#### 7. useApprove.ts Hook
**Why:** Token approval - common attack vector
**Recommended Tests:**
```typescript
describe('useApprove Hook', () => {
  it('should request approval for correct spender address', async () => {
    // Test approval flow
  });

  it('should handle approval rejection', async () => {
    // Test rejection handling
  });
});
```

#### 8. useUSDCBalance.ts Hook
**Why:** Balance display - core UX functionality
**Recommended Tests:**
```typescript
describe('useUSDCBalance Hook', () => {
  it('should fetch and return USDC balance', async () => {
    // Test balance fetching
  });

  it('should handle connection error', async () => {
    // Test error state
  });
});
```

#### 9. useVaultAllowance.ts Hook
**Why:** Approval state tracking
**Recommended Tests:**
```typescript
describe('useVaultAllowance Hook', () => {
  it('should return correct allowance amount', async () => {
    // Test allowance query
  });
});
```

#### 10. Hedge.entity.ts
**Why:** Tracks external hedge positions
**Recommended Tests:**
```typescript
describe('Hedge Entity', () => {
  it('should initialize with OPEN status', () => {
    expect(HedgeStatus.OPEN).toBe('open');
  });

  it('should track hyperliquidOrderId correctly', () => {
    // Test external order tracking
  });
});
```

### Priority: MEDIUM

#### 11. Deposit.entity.ts & Withdrawal.entity.ts
**Why:** Transaction tracking
**Recommended Tests:**
- Status enum validation
- Timestamp tracking
- User relationship

#### 12. FundingRate.entity.ts
**Why:** 8-hour funding calculations
**Recommended Tests:**
- Rate storage validation
- Timestamp intervals

#### 13. ProcessedEvent.entity.ts
**Why:** Idempotency tracking
**Recommended Tests:**
- Event hash uniqueness
- Block number tracking

#### 14. hyperliquid.client.ts
**Why:** External API integration
**Recommended Tests:**
```typescript
describe('HyperliquidClient', () => {
  it('should format order request correctly', () => {
    // Test request formatting
  });

  it('should handle API errors', async () => {
    // Test error handling
  });
});
```

### Priority: LOW

#### 15. contracts.ts
**Why:** Static configuration
**Recommended Tests:**
- Export validation
- Address format verification

#### 16. wagmi.ts
**Why:** Web3 configuration
**Recommended Tests:**
- Chain configuration
- Provider setup

---

## Test Files to Create (Summary)

### Backend (9 new test files)
```
backend/src/entities/User.entity.spec.ts
backend/src/entities/Position.entity.spec.ts
backend/src/entities/Order.entity.spec.ts
backend/src/entities/Hedge.entity.spec.ts
backend/src/entities/Deposit.entity.spec.ts
backend/src/entities/Withdrawal.entity.spec.ts
backend/src/entities/FundingRate.entity.spec.ts
backend/src/entities/ProcessedEvent.entity.spec.ts
backend/src/hedging/hyperliquid.client.spec.ts
```

### Frontend (7 new test files)
```
frontend/app/hooks/useDeposit.test.tsx
frontend/app/hooks/useWithdraw.test.tsx
frontend/app/hooks/useApprove.test.tsx
frontend/app/hooks/useUSDCBalance.test.tsx
frontend/app/hooks/useVaultAllowance.test.tsx
frontend/app/contracts.test.ts
frontend/app/wagmi.test.ts
```

### Infrastructure (1 new test file)
```
backend/src/main.spec.ts
```

---

## Coverage Goals

### Short-term (This Week)
- [ ] Add all CRITICAL priority tests (4 files)
- [ ] Add main.ts bootstrap tests
- [ ] Target: 85% coverage

### Medium-term (This Month)
- [ ] Add all HIGH priority tests (6 files)
- [ ] Add all MEDIUM priority entity tests (4 files)
- [ ] Target: 95% coverage

### Long-term
- [ ] Add all remaining tests
- [ ] Target: 98%+ coverage
- [ ] Add integration tests for critical flows

---

## Test Quality Recommendations

1. **Entity Tests:** Focus on validation of default values, enum correctness, and relationship definitions
2. **Hook Tests:** Use React Testing Library with proper mocking of contract calls
3. **Integration Tests:** Add tests for complete flows (deposit -> trade -> withdraw)
4. **Edge Cases:** Test error handling, empty states, and boundary conditions
5. **Performance Tests:** Add benchmarks for frequently-called services

---

## Files Already Well Tested

### Backend
- All controllers (14/14)
- All core services (14/15)
- Kline entity (1/9 entities)

### Frontend
- Page components (5 pages)
- Query hooks (useDeposits, useWithdrawals, useOrders)
- UI components (SymbolSelector)

---

## Conclusion

The project has strong test coverage for controllers and services, but has significant gaps in:
1. **Entity tests** - 8 of 9 entities lack tests
2. **Frontend hooks** - 5 of 8 hooks lack tests
3. **Infrastructure** - Bootstrap file has no tests

**Recommendation:** Start with CRITICAL priority items (User, Position, Order entities + main.ts) as they provide foundation for all other functionality.
