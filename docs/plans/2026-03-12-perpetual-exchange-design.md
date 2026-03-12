# Perpetual Exchange - Design Document

**Date:** 2026-03-12
**Status:** Approved

---

## 1. Overview

Build a minimal viable perpetual contract exchange (永续合约交易所) that demonstrates:
- Wallet-based authentication
- USDC deposit/withdrawal via Vault contract
- Market order trading
- Position management with PnL calculation
- Automated hedging via Hyperliquid

---

## 2. Architecture

### 2.1 High-Level Design

```
┌─────────────┐     ┌─────────────────────────────────────┐
│   Frontend  │────▶│         Backend (NestJS)            │
│   Next.js   │     │  ┌─────────┬─────────┬────────────┐ │
│             │     │  │  API    │  Trade  │  Hedging   │ │
│             │     │  │  Layer  │  Engine │   Bot      │ │
│             │     │  └─────────┴─────────┴────────────┘ │
└─────────────┘     └─────────────────────────────────────┘
                           │              │       │
                           ▼              ▼       ▼
                    ┌──────────┐   ┌──────────┐ ┌──────────────┐
                    │ Postgres │   │  Vault   │ │ Hyperliquid  │
                    │ Database │   │ Contract │ │ (Real/Mock)  │
                    └──────────┘   └──────────┘ └──────────────┘
                                          │
                           ┌──────────────┴──────────────┐
                           ▼                             ▼
                    ┌──────────────┐            ┌──────────────┐
                    │ Hardhat Node │            │  Mock USDC   │
                    │  (Local)     │            │  (ERC20)     │
                    └──────────────┘            └──────────────┘
```

### 2.2 Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js + TailwindCSS + Wagmi/Viem |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL |
| Smart Contract | Solidity 0.8+ + Hardhat |
| Blockchain | Hardhat Network (Local Testnet) |
| External DEX | Hyperliquid (for hedging) |
| Containerization | Docker Compose |

---

## 3. Core Modules

### 3.1 Vault Smart Contract & Mock USDC

**Purpose:** Custody user funds (USDC)

**Components:**
1.  **Vault.sol**: Main custody contract.
2.  **MockUSDC.sol**: Standard ERC20 token for local testing (Mintable).

**Functions (Vault):**
- `deposit(uint256 amount)` - Transfer USDC from user to vault, credit balance
- `withdraw(uint256 amount)` - Debit balance, transfer USDC to user
- `balances(address)` - View user balance

**Functions (MockUSDC):**
- `mint(address to, uint256 amount)` - Faucet function for testing

**Events:**
- `Deposit(address indexed user, uint256 amount)`
- `Withdraw(address indexed user, uint256 amount)`

**Security Considerations:**
- Only USDC token transfers (no native ETH)
- Reentrancy guard on withdraw
- Balance checks before transfers

---

### 3.2 Backend API (NestJS)

**Authentication:**
- `POST /auth/login` - Verify wallet signature, create session

**Balance & Faucet:**
- `GET /balance` - Get user available balance
- `POST /faucet` - Mint Mock USDC to user wallet (Dev only)

**Orders:**
- `POST /order` - Place market order
- `GET /orders/:id` - Get order details
- `GET /orders/history` - Get user order history

**Positions:**
- `GET /position` - Get current position
- `GET /positions` - Get all positions

**Withdrawal:**
- `POST /withdraw` - Request withdrawal from vault

---

### 3.3 Trade Engine

**Responsibilities:**
- Process market orders at current mark price
- Calculate and update positions
- Compute PnL: `pnl = position_size * (mark_price - entry_price)`
- Fetch mark price from Hyperliquid API

**Order Flow:**
```
1. Receive market order (symbol, size, side)
2. Fetch current mark price from Hyperliquid
3. Calculate position update (open/add/reduce/close)
4. Update position and balance
5. Create order record
6. Trigger hedge if position changes
```

**Position Logic:**
- Long: `pnl = size * (mark_price - entry_price)`
- Short: `pnl = size * (entry_price - mark_price)`

---

### 3.4 Blockchain Indexer

**Responsibilities:**
- Listen to Vault contract events
- Update user balances in database
- Handle event idempotency

**Event Processing:**
```javascript
vault.on("Deposit", (user, amount, event) => {
  // Check if already processed (by event.transactionHash)
  // Update user balance
  // Mark as processed
})
```

**Idempotency:**
- Store processed event signatures in `processed_events` table
- Skip if already processed

---

### 3.5 Hedging System

**Purpose:** Hedge internal positions on Hyperliquid

**Modes:**
1.  **Real Mode**: Send actual orders to Hyperliquid API (requires API Key & funds).
2.  **Mock Mode**: Log orders to console/DB only (for local dev/testing without funds).

**Logic:**
- When user opens Long → Hedge by opening Short on Hyperliquid
- When user opens Short → Hedge by opening Long on Hyperliquid
- Maintain 1:1 hedge ratio (for MVP)

**Integration:**
- Use Hyperliquid API for order placement
- Track hedge position status
- Handle re-balancing if needed

---

### 3.6 Frontend (Next.js)

**Pages:**
- `/` - Home/Trading page
- `/trade` - Trading interface
- `/positions` - Position management
- `/deposit` - Deposit USDC (includes "Mint Mock USDC" button in Dev mode)
- `/withdraw` - Withdraw USDC

**Features:**
- Wallet connection (MetaMask)
- Sign-in with Ethereum (SIWE-like flow)
- Real-time balance display
- Order placement (market orders only for MVP)
- Position display with unrealized PnL

---

### 3.7 Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Balances table
CREATE TABLE balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  balance DECIMAL(36, 18) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Positions table
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  size DECIMAL(36, 18) NOT NULL,
  entry_price DECIMAL(36, 18) NOT NULL,
  side VARCHAR(4) NOT NULL, -- 'LONG' or 'SHORT'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  symbol VARCHAR(20) NOT NULL,
  size DECIMAL(36, 18) NOT NULL,
  side VARCHAR(4) NOT NULL,
  price DECIMAL(36, 18) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'PENDING', 'FILLED', 'CANCELLED'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processed events (for idempotency)
CREATE TABLE processed_events (
  id SERIAL PRIMARY KEY,
  event_signature VARCHAR(66) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Development Order

```
Phase 1: Foundation
1.1 Vault smart contract + Hardhat setup
1.2 Database schema + migrations
1.3 Backend API scaffolding

Phase 2: Core Backend
2.1 Authentication (signature verification)
2.2 Balance system
2.3 Indexer (event listener)

Phase 3: Trading
3.1 Trade engine (order processing)
3.2 Position management
3.3 PnL calculation

Phase 4: Hedging
4.1 Hyperliquid API integration
4.2 Hedge execution logic

Phase 5: Frontend
5.1 Wallet connection
5.2 Authentication flow
5.3 Trading interface
5.4 Position display

Phase 6: Integration
6.1 Docker Compose configuration
6.2 End-to-end testing
6.3 Documentation
```

---

## 5. Error Handling

**Backend:**
- Standard response format: `{ success: boolean, data?: any, error?: string }`
- Global exception filters in NestJS
- Input validation with class-validator

**Smart Contract:**
- Require statements for all preconditions
- Events for all state changes
- ReentrancyGuard for withdraw

**Indexer:**
- Idempotency via event signature tracking
- Retry logic with exponential backoff

---

## 6. Testing Strategy

**Smart Contract:**
- Hardhat tests with Chai
- Test deposit/withdrawal flows
- Test reentrancy protection

**Backend:**
- Unit tests for services
- Integration tests for API endpoints
- Mock Hyperliquid API

**Frontend:**
- Component tests
- E2E tests with Playwright

---

## 7. Deployment

**Local Development:**
```bash
docker-compose up
# Starts: PostgreSQL, Hardhat Node, Backend, Frontend
```

**Production Considerations:**
- Use testnet (Sepolia) for smart contracts
- Use production Hyperliquid API
- Add monitoring and logging
- Add rate limiting

---

## 8. Success Criteria

A minimal viable system that demonstrates:
- [ ] User can connect wallet and sign in
- [ ] User can deposit USDC to vault
- [ ] User can place a market order
- [ ] User can see their position with PnL
- [ ] System automatically hedges on Hyperliquid
- [ ] User can withdraw from vault

---

## 9. Out of Scope (MVP)

- Order book (use market orders only)
- Limit orders
- Funding rate calculations
- Risk engine / liquidations
- Multi-symbol support (can start with 1 symbol)
- Advanced charting

---

## 10. Appendix

### 10.1 API Response Format

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### 10.2 Key Assumptions

- Single trading pair for MVP (e.g., ETH-PERP)
- Mark price sourced from Hyperliquid
- 1:1 hedge ratio
- No leverage for MVP (1x only)
