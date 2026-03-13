# Agent Teams Prompt: Phase 1 Core Loop Implementation

## Mission

Implement the **minimum viable trading loop** for the Perpetual Exchange system:
**User deposits → User trades → System hedges → User closes position → User withdraws**

## Constraints

- **TDD Required**: Write tests FIRST, then implementation. No exceptions.
- **Agent Teams Mode**: Tasks are independent and should be executed in parallel where possible
- **No Console Logs**: Use NestJS Logger or proper logging libraries
- **Immutability**: Prefer `const` over `let`, avoid mutations
- **API Response Format**: All responses must follow `{ success, data, error }` format

---

## Phase 1 Tasks (Parallel Execution)

### Team 1: Order Execution Engine

**Goal**: Transform `OrderService.createOrder()` from "create record" to "execute trade"

**Current State**:
```typescript
// OrderService.createOrder() only creates a record
const order = this.orderRepository.create();
order.status = OrderStatus.PENDING;
await this.orderRepository.save(order);
// Missing: balance check, position creation, hedge trigger
```

**Required Behavior**:
1. Validate user has sufficient balance (margin + fees)
2. Lock margin from user's available balance
3. Execute market order at current price
4. Create or update position (support加仓 for same direction)
5. Trigger automatic hedge after position creation
6. Update order status to FILLED

**Test Requirements**:
- Unit tests for order validation logic
- Integration tests for full execution flow (mock hedge)
- Edge cases: insufficient balance, concurrent orders, zero size

**Files to Modify**:
- `backend/src/order/order.service.ts` - Core execution logic
- `backend/src/order/order.service.spec.ts` - Tests (TDD)
- `backend/src/entities/Order.entity.ts` - Add execution metadata if needed

**Dependencies**: BalanceService (read), PositionService (create), HedgingService (trigger)

---

### Team 2: Position Management System

**Goal**: Implement complete position lifecycle (increase, reduce, close)

**Current State**:
- `openPosition()` / `closePosition()` exist but not integrated
- Missing: `increasePosition()`, `reducePosition()` methods
- No support for adding to existing positions

**Required Behavior**:
1. **Open Position**: Create new position record with entry price, size, leverage
2. **Increase Position**: Add to existing position, recalculate weighted average entry price
3. **Reduce Position**: Decrease position size, realize PnL proportionally
4. **Close Position**: Fully close, calculate final PnL, release margin

**Position Model**:
```typescript
interface Position {
  id: string;
  userId: string;
  symbol: string; // "BTC", "ETH"
  side: 'LONG' | 'SHORT';
  size: bigint; // wei-denominated
  entryPrice: bigint; // wei per token
  margin: bigint; // collateral amount
  leverage: number; // 1x - 10x
  unrealizedPnl: bigint;
  liquidationPrice: bigint;
  createdAt: Date;
  closedAt?: Date;
  status: 'OPEN' | 'CLOSED' | 'LIQUIDATED';
}
```

**Test Requirements**:
- Unit tests for PnL calculation (long/short scenarios)
- Unit tests for position sizing with different leverage
- Integration tests for position lifecycle
- Edge cases: close more than size, zero margin, price movement

**Files to Modify**:
- `backend/src/position/position.service.ts` - Position logic
- `backend/src/position/position.service.spec.ts` - Tests (TDD)
- `backend/src/entities/Position.entity.ts` - Entity definition

**Dependencies**: PriceService (current price), RiskEngine (liquidation calc)

---

### Team 3: Balance & Margin System

**Goal**: Implement atomic balance locking and margin management

**Current State**:
```typescript
// BalanceService calculates available balance
const availableBalance = deposits - withdrawals - positions;
// Missing: atomic locking, margin deduction, balance release on close
```

**Required Behavior**:
1. **Lock Margin**: Atomically deduct margin when order executes
2. **Release Margin**: Return margin + PnL when position closes
3. **Available Balance**: Real-time calculation (deposits - withdrawals - locked)
4. **Balance History**: Track all balance changes for audit

**Balance Model**:
```typescript
interface UserBalance {
  userId: string;
  totalDeposits: bigint;
  totalWithdrawals: bigint;
  lockedInPositions: bigint; // margin locked in open positions
  // available = totalDeposits - totalWithdrawals - lockedInPositions
}
```

**Test Requirements**:
- Unit tests for balance calculation
- Integration tests for atomic operations (no race conditions)
- Edge cases: concurrent orders, withdraw more than available, negative balance prevention

**Files to Modify**:
- `backend/src/balance/balance.service.ts` - Balance logic
- `backend/src/balance/balance.service.spec.ts` - Tests (TDD)
- `backend/src/entities/UserBalance.entity.ts` - Entity definition
- `backend/src/balance/balance.controller.ts` - Add `/lock`, `/release` endpoints

**Dependencies**: PositionService (query locked amounts)

---

### Team 4: Leverage & Risk Integration

**Goal**: Add leverage selection and integrate risk checks into order flow

**Current State**:
- Frontend has no leverage selector
- RiskEngine exists but not called during order execution
- Max leverage (10x) not enforced

**Required Behavior**:
1. **Leverage Input**: Frontend UI for selecting 1x-10x leverage
2. **Margin Calculation**: `margin = size / leverage`
3. **Risk Check**: Before order execution, verify:
   - Leverage <= 10x
   - User has sufficient balance
   - Position size within limits
   - New position doesn't breach max exposure
4. **Liquidation Price**: Calculate and display to user

**Test Requirements**:
- Unit tests for margin calculation at different leverage levels
- Unit tests for liquidation price calculation
- Integration tests for risk check integration
- Edge cases: max leverage, min margin, oversized positions

**Files to Modify**:
- `frontend/app/trade/page.tsx` - Add leverage selector UI
- `backend/src/risk/risk-engine.service.ts` - Add pre-trade check method
- `backend/src/order/order.service.ts` - Call risk check before execution
- `backend/src/entities/Order.entity.ts` - Store leverage parameter

**Dependencies**: RiskEngineService, PositionService

---

### Team 5: Hedge Automation

**Goal**: Automatically trigger hedge when position opens/closes

**Current State**:
```typescript
// HedgingService.autoHedge() exists but requires manual call
async autoHedge(positionId: string) {
  return this.openHedge(positionId);
}
// Missing: automatic trigger from OrderService
```

**Required Behavior**:
1. **Auto-Hedge on Open**: When position opens, immediately hedge on Hyperliquid
2. **Auto-Hedge on Close**: When position closes, close hedge on Hyperliquid
3. **Hedge Tracking**: Store hedge ID, status, PnL
4. **Failure Handling**: Retry logic for failed hedges (mock mode fallback)

**Hedge Model**:
```typescript
interface Hedge {
  id: string;
  positionId: string;
  size: bigint;
  entryPrice: bigint;
  exitPrice?: bigint;
  isShort: boolean; // Opposite of position side
  status: 'PENDING' | 'OPEN' | 'CLOSED' | 'FAILED';
  pnl?: bigint;
  hyperliquidOrderId?: string;
  createdAt: Date;
  closedAt?: Date;
}
```

**Test Requirements**:
- Unit tests for hedge direction logic (long position -> short hedge)
- Integration tests with mock Hyperliquid client
- Edge cases: hedge failure, duplicate hedge attempts, sync failures

**Files to Modify**:
- `backend/src/hedging/hedging.service.ts` - Auto-trigger logic
- `backend/src/hedging/hedging.service.spec.ts` - Tests (TDD)
- `backend/src/hedging/hyperliquid.client.ts` - Mock client for tests
- `backend/src/order/order.service.ts` - Trigger hedge after position creation

**Dependencies**: PositionService, HyperliquidClient (mockable)

---

## Integration Points

```
┌─────────────┐
│   Frontend  │
│  (Leverage  │
│   Selector) │
└──────┬──────┘
       │ POST /order { side, size, leverage }
       ▼
┌─────────────────────────────────────────────┐
│              OrderService                   │
│  1. Validate (RiskEngine)                  │
│  2. Lock Margin (BalanceService)           │
│  3. Create/Update Position (PositionSvc)   │
│  4. Trigger Hedge (HedgingService)         │
│  5. Update Order Status                    │
└─────────────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│BalanceService│    │PositionService│
│  - lock()    │    │  - open()     │
│  - release() │    │  - increase() │
└──────────────┘    │  - reduce()   │
                    │  - close()    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌──────────────┐
                    │HedgingService│
                    │  - autoHedge()│
                    │  - sync()     │
                    └──────────────┘
```

---

## Quality Gates (All Teams)

Each team must:

1. **Write Tests First**:
   - Create `.spec.ts` file with failing tests
   - Tests must cover happy path + edge cases
   - Minimum 80% coverage for modified files

2. **Implement to Pass**:
   - Write minimum code to pass tests
   - No over-engineering
   - Use TypeScript strict mode

3. **Integration Validation**:
   - Test with other teams' modules
   - Verify API response format
   - Check error handling

4. **Documentation**:
   - Update inline JSDoc comments
   - Ensure CLAUDE.md conventions followed

---

## Task Execution Order (Within Teams)

Each team should follow this sequence:

1. **Read existing code** - Understand current implementation
2. **Write failing tests** - TDD style, cover all scenarios
3. **Implement logic** - Minimal code to pass tests
4. **Run tests** - Verify all pass
5. **Refactor** - Clean up while keeping tests green
6. **Integration check** - Verify with dependent modules

---

## Completion Criteria

Phase 1 is complete when:

- [ ] All 5 teams pass their test suites
- [ ] End-to-end flow works: deposit → trade (with leverage) → hedge → close → withdraw
- [ ] Frontend leverage selector integrated
- [ ] Risk checks enforced on all orders
- [ ] Automatic hedging functional (mock mode acceptable)
- [ ] No console logs in production code
- [ ] All API responses follow standard format

---

## How to Start

1. **Claim your task** by announcing which team you're working on
2. **Read the referenced files** in your team section
3. **Create/update the `.spec.ts` file** with failing tests
4. **Implement the logic** to make tests pass
5. **Signal completion** when all quality gates are met

Good luck! 🚀
