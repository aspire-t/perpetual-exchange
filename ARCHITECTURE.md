# System Architecture

## Overview

The Perpetual Exchange is a decentralized trading platform that utilizes a **Hybrid Architecture** combining the speed of off-chain order matching with the security of on-chain settlement.

## High-Level Architecture

```mermaid
graph TD
    User[User] -->|Connect Wallet| Frontend[Next.js Frontend]
    User -->|Deposit USDC| SmartContract[Vault Contract (On-Chain)]
    Frontend -->|Place Order| Backend[NestJS Backend]
    Backend -->|Match Order| Database[(PostgreSQL/SQLite)]
    Backend -->|Hedging| Hyperliquid[Hyperliquid API]
    SmartContract -->|Emit Event| Indexer[Backend Indexer]
    Indexer -->|Update Balance| Database
```

## Module Breakdown

### 1. Smart Contracts (Solidity 0.8.28)

#### Vault.sol
The main custody contract for user funds.

**Responsibilities:**
- Accept USDC deposits from users
- Process withdrawals (user-initiated and owner-initiated)
- Track user deposit balances
- Support EIP-712 signature-based withdrawals
- Emit events for backend indexing

**Key Functions:**
```solidity
function deposit(uint256 amount) external
function withdraw(uint256 amount) external
function withdrawWithSignature(...) external
function withdrawUSDC(address to, uint256 amount) external onlyOwner
function openPosition(...) external
function closePosition(...) external
```

**Events:**
- `Deposit(address indexed user, uint256 amount)`
- `Withdraw(address indexed user, uint256 amount)`
- `PositionOpened(...)`
- `PositionClosed(...)`

#### MockUSDC.sol
ERC20 token for local development and testing.

**Features:**
- 6 decimals (USDC standard)
- Mintable by owner (faucet functionality)
- Compatible with Vault contract

---

### 2. Frontend (Next.js 16 + React 19)

#### Pages

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Landing page with wallet connection |
| Trade | `/trade` | Trading interface with K-line charts |
| Positions | `/positions` | User position management |
| Deposit | `/deposit` | USDC deposit instructions |
| Withdraw | `/withdraw` | Withdrawal processing |

#### Key Components

| Component | Description |
|-----------|-------------|
| `ConnectWallet` | Wallet connection via wagmi |
| `KlineChart` | Candlestick chart with timeframe selection |
| `SymbolSelector` | Multi-pair trading selector |
| `OrderForm` | Long/Short order placement |
| `PositionTable` | Position list with PnL display |

#### Custom Hooks

| Hook | Description |
|------|-------------|
| `useOrders` | Fetch and manage orders |
| `usePositions` | Fetch and manage positions |
| `useDeposits` | Fetch deposit history |
| `useWithdrawals` | Fetch withdrawal history |
| `useWallet` | Wallet connection state |

---

### 3. Backend (NestJS)

#### Core Modules

| Module | Responsibility |
|--------|----------------|
| `auth` | Wallet authentication with signature verification, replay attack protection |
| `order` | Market order processing, order book management |
| `position` | Position lifecycle, PnL calculations |
| `balance` | User balance management (available/locked) |
| `deposit` | Deposit tracking and confirmation |
| `withdrawal` | Withdrawal request processing |
| `price` | Real-time price feeds from Hyperliquid |
| `kline` | Candlestick data aggregation |
| `funding` | Funding rate calculations (8-hour intervals) |
| `risk` | Risk engine: margin checks, liquidation detection |
| `hedging` | Hyperliquid hedge execution |
| `indexer` | Blockchain event listener |
| `faucet` | Test token distribution |

#### Module Details

**Auth Module:**
- SIWE (Sign-In With Ethereum) pattern
- Nonce-based replay attack protection
- JWT session management

**Order Module:**
- Market order execution
- Order status tracking (PENDING → FILLED/FAILED)
- Order history

**Position Module:**
- Long/Short position tracking
- Real-time PnL calculation
- Position closing with PnL settlement

**Risk Module:**
```typescript
// Key methods
checkNewPositionRisk(address, size, leverage): boolean
checkLiquidation(positionId): boolean
scanForLiquidations(): Position[]
executeLiquidation(positionId): void
```

**Hedging Module:**
- Dual-mode: Mock and Real
- Auto-hedge on position open
- Hedge position sync with Hyperliquid

**Indexer Module:**
- Listen to Vault contract events
- Idempotent event processing
- Balance updates on deposit/withdraw

---

### 4. Database Schema

```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Balances
CREATE TABLE balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  available_balance DECIMAL(36, 18) DEFAULT 0,
  locked_balance DECIMAL(36, 18) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Positions
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  size DECIMAL(36, 18) NOT NULL,
  entry_price DECIMAL(36, 18) NOT NULL,
  side VARCHAR(4) NOT NULL,  -- 'LONG' or 'SHORT'
  leverage INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL,  -- 'market' or 'limit'
  side VARCHAR(4) NOT NULL,
  size DECIMAL(36, 18) NOT NULL,
  price DECIMAL(36, 18),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Deposits
CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(36, 18) NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(36, 18) NOT NULL,
  tx_hash VARCHAR(66),
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hedges
CREATE TABLE hedges (
  id SERIAL PRIMARY KEY,
  position_id INTEGER REFERENCES positions(id),
  hyperliquid_id VARCHAR(50),
  size DECIMAL(36, 18) NOT NULL,
  entry_price DECIMAL(36, 18) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processed Events (idempotency)
CREATE TABLE processed_events (
  id SERIAL PRIMARY KEY,
  event_signature VARCHAR(66) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Funding Rates
CREATE TABLE funding_rates (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  rate DECIMAL(18, 12) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- K-lines
CREATE TABLE klines (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  open_time BIGINT NOT NULL,
  open DECIMAL(36, 18) NOT NULL,
  high DECIMAL(36, 18) NOT NULL,
  low DECIMAL(36, 18) NOT NULL,
  close DECIMAL(36, 18) NOT NULL,
  volume DECIMAL(36, 18) NOT NULL
);
```

---

## Data Flow

### Trading Flow

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│  Backend  │────▶│ Database │
└──────────┘     └──────────┘     └───────────┘     └──────────┘
                                      │
                                      ▼
                               ┌──────────────┐
                               │ Risk Engine  │
                               └──────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
             ┌───────────┐    ┌───────────┐    ┌──────────────┐
             │  Position │    │  Hedging  │    │ Price Feed   │
             │  Created  │    │  Execute  │    │  (Update)    │
             └───────────┘    └───────────┘    └──────────────┘
```

**Step-by-step:**

1. **User** places a Market Order (Long/Short) via Frontend
2. **Frontend** sends POST `/order` to Backend
3. **Order Service** validates the request
4. **Risk Engine** checks:
   - Is leverage ≤ 10x?
   - Does user have enough available balance?
   - Maximum position size check
5. **Price Service** fetches current market price
6. **Order Service** executes:
   - Creates new Position in DB
   - Deducts margin from availableBalance
   - Updates order status to FILLED
7. **Hedging Service** opens corresponding hedge on Hyperliquid
8. **Response** sent back to Frontend

---

### Deposit Flow

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│   Vault     │────▶│ Indexer  │────▶│ Database │
│          │     │  Contract   │     │          │     │          │
└──────────┘     └─────────────┘     └──────────┘     └──────────┘
     │                  │
     │  deposit()       │  Event emitted
     │─────────────────▶│
                        │
                        │              ┌────────────┐
                        │─────────────▶│  Balance   │
                        │  Detect      │  Updated   │
                        │  Event       └────────────┘
```

**Step-by-step:**

1. **User** calls `deposit(amount)` on Vault contract
2. **USDC** transferred from user to Vault
3. **Vault** emits `Deposit` event
4. **Indexer Service** detects event via RPC polling
5. **Indexer** checks idempotency (event signature)
6. **Deposit Service** updates user balance in DB
7. **Frontend** reflects new balance via TanStack Query refetch

---

### Withdrawal Flow

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌─────────────┐
│  User    │────▶│ Backend  │────▶│  Vault    │────▶│  Database   │
│          │     │          │     │ Contract  │     │             │
└──────────┘     └──────────┘     └───────────┘     └─────────────┘
                      │                │
                      │                │ withdraw()
                      │                │───────────▶
                      │                │
                      │         ┌──────┴──────┐
                      │         │  USDC       │
                      │         │  Transfer   │
                      │         └──────┬──────┘
                      │                │
                      ▼                ▼
               ┌───────────┐   ┌──────────────┐
               │  Balance  │   │   Event      │
               │  Deducted │   │   Indexed    │
               └───────────┘   └──────────────┘
```

**Step-by-step:**

1. **User** requests withdrawal via Frontend
2. **Backend** validates:
   - Sufficient available balance
   - No open positions blocking withdrawal
3. **Backend** calls `withdraw()` on Vault (owner call)
4. **USDC** transferred from Vault to user
5. **Withdrawal Service** updates DB
6. **Indexer** detects Withdraw event
7. **Frontend** shows success

---

### Liquidation Flow

```
┌──────────────┐     ┌───────────┐     ┌─────────────┐     ┌──────────┐
│ Risk Engine  │────▶│  Scanner  │────▶│ Liquidation │────▶│ Hedge    │
│ (Scheduled)  │     │           │     │  Executor   │     │  Close   │
└──────────────┘     └───────────┘     └─────────────┘     └──────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Position   │
                    │   Closed    │
                    └─────────────┘
```

**Step-by-step:**

1. **Risk Engine** runs scheduled scan (`scanForLiquidations()`)
2. For each position:
   - Fetch current price from Price Service
   - Calculate health factor
   - If health < 1.0, flag for liquidation
3. **Liquidation Executor** processes flagged positions:
   - Close position at current market price
   - Calculate realized PnL
   - Deduct loss from user balance
   - Seize remaining margin (insurance fund)
4. **Hedging Service** closes corresponding hedge
5. **Database** updated with liquidation status

---

## Key Design Trade-offs

### 1. Off-Chain Matching vs. On-Chain AMM

| Aspect | Off-Chain Matching | On-Chain AMM |
|--------|-------------------|--------------|
| Execution Speed | Instant | Block time dependent |
| Gas Costs | None for orders | Paid per transaction |
| Censorship Resistance | Low | High |
| Complexity | High (centralized) | Low (trustless) |

**Decision**: Off-Chain Matching with on-chain settlement.

**Rationale**: Prioritizes user experience (speed, cost) for MVP. Future plans include decentralized sequencer network.

---

### 2. Mock vs. Real Hedging

| Aspect | Mock Mode | Real Mode |
|--------|-----------|-----------|
| Development | No API key needed | Requires API credentials |
| Risk | No real funds at risk | Real capital at risk |
| Accuracy | Simulated fills | Real market conditions |
| Testing | Fully automated | Limited by API rate limits |

**Decision**: Dual-mode system with Mock as default.

**Rationale**: Enables development and testing without financial risk, while supporting production deployment.

---

### 3. SQLite vs. PostgreSQL

| Aspect | SQLite | PostgreSQL |
|--------|--------|------------|
| Setup | Zero-config | Requires Docker/service |
| Concurrency | Limited | Full support |
| Features | Basic | Advanced |
| Production Ready | No | Yes |

**Decision**: SQLite for development, PostgreSQL for production.

**Rationale**: TypeORM abstracts database layer, allowing seamless switching between environments.

---

### 4. Centralized Risk Engine

| Aspect | Centralized | On-Chain |
|--------|-------------|----------|
| Speed | Instant | Block confirmation |
| Complexity | Can be complex | Gas expensive |
| Trust | Backend must be trusted | Trustless |
| Upgradability | Easy to update | Requires migration |

**Decision**: Centralized Risk Engine.

**Rationale**: Complex calculations and frequent checks are impractical on-chain. Future: cryptographically verifiable proofs.

---

## Security Considerations

### Smart Contract
- `onlyOwner` modifier on sensitive functions
- ReentrancyGuard on withdrawals
- EIP-712 signature verification
- Balance checks before transfers

### Backend
- Signature verification for authentication
- Nonce-based replay attack protection
- Input validation with DTOs
- Rate limiting on public endpoints

### Frontend
- Wallet signature verification
- Transaction confirmation prompts
- Error handling for failed transactions

---

## Deployment Architecture

### Development
```
┌─────────────────────────────────────────────┐
│                 Local Machine                │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │Frontend │  │ Backend │  │ Hardhat     │ │
│  │:3000    │  │ :3001   │  │ Node :8545  │ │
│  └─────────┘  └─────────┘  └─────────────┘ │
│                    │                        │
│                    ▼                        │
│            ┌─────────────┐                  │
│            │ SQLite DB   │                  │
│            └─────────────┘                  │
└─────────────────────────────────────────────┘
```

### Production
```
┌──────────────────────────────────────────────────────┐
│                    Cloud Provider                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │
│  │Frontend │  │ Backend │  │   PostgreSQL        │  │
│  │(Vercel) │  │(Render) │  │   (Managed)         │  │
│  └─────────┘  └─────────┘  └─────────────────────┘  │
│                    │                                  │
│                    ▼                                  │
│         ┌─────────────────────┐                       │
│         │   Sepolia Testnet   │                       │
│         │   Vault + USDC      │                       │
│         └─────────────────────┘                       │
│                    │                                  │
│                    ▼                                  │
│         ┌─────────────────────┐                       │
│         │   Hyperliquid API   │                       │
│         └─────────────────────┘                       │
└──────────────────────────────────────────────────────┘
```

---

## Future Enhancements

1. **Decentralized Sequencer Network** - Remove centralization risk
2. **Chainlink Price Oracle** - Decentralized price feeds
3. **Multi-Collateral Support** - USDT, DAI, ETH as collateral
4. **Order Book** - Limit orders, stop-loss, take-profit
5. **Insurance Fund** - Dedicated fund for liquidation shortfalls
6. **Layer 2 Deployment** - Arbitrum/Optimism for lower gas costs
