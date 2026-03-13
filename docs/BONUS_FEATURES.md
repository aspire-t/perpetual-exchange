# Bonus Features Implementation

This document describes the bonus features implemented beyond the minimum requirements.

## 1. Wallet Login Replay Attack Protection (Cheatsheet Tip 1)

**Status:** Completed

**Location:** `backend/src/auth/auth.service.ts`

### Implementation

Added nonce-based replay attack protection to prevent signature replay attacks:

- **Cryptographically secure nonce generation** using `randomBytes(32)`
- **5-minute nonce expiration** to limit replay window
- **Nonce tracking** in User entity with `lastNonce` and `nonceExpiresAt` fields
- **Login validation** that verifies:
  - Nonce existence
  - Nonce expiration
  - Nonce match
  - Message contains the expected nonce
- **Nonce invalidation** after successful use

### API Endpoints

```
GET  /auth/nonce/:address  - Get a fresh nonce for login
POST /auth/login           - Login with signature and nonce
```

### Usage

```javascript
// 1. Get nonce
const { nonce, expiresAt } = await fetch(`/auth/nonce/${address}`);

// 2. Sign message with nonce
const message = `Login to Exchange\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
const signature = await wallet.signMessage(message);

// 3. Login
const { token } = await fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ address, message, signature, nonce })
});
```

---

## 2. Funding Rate Mechanism (FAQ Q9)

**Status:** Completed

**Location:** `backend/src/funding/`

### Implementation

Implemented industry-standard funding rate calculations:

- **8-hour funding intervals** (standard in perpetual exchanges)
- **Funding rate calculation** based on market conditions
- **Automatic funding application** to all open positions
- **Funding history tracking** in database
- **Long/Short asymmetry**: Longs pay when rate is positive, Shorts receive

### Key Files

- `funding-rate.service.ts` - Core funding logic
- `funding-rate.controller.ts` - API endpoints
- `funding-rate.module.ts` - Module configuration
- `entities/FundingRate.entity.ts` - Database entity

### API Endpoints

```
GET  /funding/rate/:symbol        - Get current funding rate
GET  /funding/history/:symbol     - Get funding rate history
POST /funding/apply               - Apply funding to all positions
```

### Funding Rate Formula

```typescript
// Rates are calculated as 8-hour percentages
// Positive rate: Longs pay Shorts
// Negative rate: Shorts pay Longs
fundingAmount = positionSize * fundingRate
```

---

## 3. Risk Engine (FAQ Q10)

**Status:** Completed

**Location:** `backend/src/risk/`

### Implementation

Comprehensive risk management system:

- **Margin checks** - Verify sufficient collateral
- **Leverage limits** - Maximum 10x leverage
- **Liquidation price calculation** - Real-time calculation per position
- **Health factor monitoring** - Position health scoring
- **Automatic liquidation scanning** - Find positions to liquidate
- **Auto-liquidation** - Execute liquidations when health factor breaches threshold

### Key Files

- `risk-engine.service.ts` - Core risk logic
- `risk-engine.controller.ts` - API endpoints
- `risk-engine.module.ts` - Module configuration

### Risk Parameters

```typescript
MAX_LEVERAGE = 10;              // Maximum 10x leverage
INITIAL_MARGIN_RATIO = 0.1;     // 10% initial margin
MAINTENANCE_MARGIN_RATIO = 0.05; // 5% maintenance margin
LIQUIDATION_THRESHOLD = 0.025;  // Liquidate below 2.5% health
```

### API Endpoints

```
GET  /risk/check/:address       - Check if new position is allowed
GET  /risk/liquidation/:id      - Check position liquidation status
GET  /risk/liquidations         - Scan all positions for liquidation risk
POST /risk/liquidate/:id        - Execute liquidation for position
POST /risk/liquidate-all        - Auto-liquidate all breaching positions
GET  /risk/max-size/:address    - Get maximum allowed position size
```

### Liquidation Logic

```typescript
// Health Factor = Equity / (Notional * MaintenanceMarginRatio)
// Health Factor < 1.0 = At risk
// Health Factor < 0.025 = Liquidate

// Long position:
// Liquidation Price = EntryPrice * (1 - Margin/Size)

// Short position:
// Liquidation Price = EntryPrice * (1 + Margin/Size)
```

---

## 4. Liquidation Handling (Cheatsheet/FAQ follow-up)

**Status:** Completed

### Implementation

Enhanced liquidation logic with:

- **Price oracle integration** - Uses real-time prices from Hyperliquid
- **Distance to liquidation tracking** - Shows how close positions are to liquidation
- **Automatic scanning** - Periodic scan for at-risk positions
- **Batch liquidation** - `autoLiquidate()` method for cron jobs
- **Liquidation result tracking** - Success/failure reporting

### Auto-Liquidation Flow

```
1. scanForLiquidations() fetches all open positions
2. Gets current price from Hyperliquid oracle
3. Calculates health factor for each position
4. Identifies positions with health factor < 1.5
5. Auto-liquidates positions below threshold (0.025)
6. Returns liquidation results
```

---

## 5. Hyperliquid Real Hedging (Cheatsheet Q5)

**Status:** Completed

**Location:** `backend/src/hedging/`

### Implementation

Real Hyperliquid API integration for hedging:

- **HyperliquidClient** - Full API client for order placement
- **Mock/Real mode switching** - Works in test mode without credentials
- **Automatic hedging** - Opens opposite hedge when position opens
- **Hedge tracking** - Database records of all hedges
- **PnL calculation** - Real-time hedge PnL
- **Sync status** - Sync hedge state with Hyperliquid

### Key Files

- `hedging.service.ts` - Hedge management logic
- `hedging.controller.ts` - API endpoints
- `hyperliquid.client.ts` - Hyperliquid API client
- `entities/Hedge.entity.ts` - Database entity

### API Endpoints

```
POST /hedging/:positionId/open   - Open hedge for position
POST /hedging/:hedgeId/close     - Close existing hedge
GET  /hedging/:hedgeId           - Get hedge details
GET  /hedging/position/:id       - Get all hedges for position
POST /hedging/auto/:positionId   - Auto-hedge (called on position open)
POST /hedging/sync/:hedgeId      - Sync status with Hyperliquid
GET  /hedging/volume/total       - Get total hedged volume
```

### Configuration

Add to `.env`:

```env
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_API_KEY=your_api_key_here
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address_here
HYPERLIQUID_PRIVATE_KEY=your_private_key_here
```

### Hedging Flow

```
1. User opens long position for 1 ETH @ $2000
2. autoHedge() triggered automatically
3. System opens short hedge for 1 ETH on Hyperliquid
4. Hedge recorded in database with status OPEN
5. When user closes position, hedge is also closed
6. PnL calculated and recorded
```

---

## Summary Table

| Feature | Cheatsheet/FAQ | Status | Location |
|---------|---------------|--------|----------|
| Replay Attack Protection | Tip 1 | Done | `auth/auth.service.ts` |
| Funding Rate | Q9 | Done | `funding/` |
| Risk Engine | Q10 | Done | `risk/` |
| Liquidation Logic | Follow-up | Done | `risk/` |
| Hyperliquid Hedging | Q5 | Done | `hedging/` |

---

## Running the System

```bash
# Start backend
cd backend
npm install
npm run start:dev

# Configure environment
cp .env.example .env
# Edit .env with your Hyperliquid credentials (optional for mock mode)
```

## Testing

```bash
# Run tests
npm run test

# Test funding rate
curl http://localhost:3000/funding/rate/ETH

# Test risk check
curl "http://localhost:3000/risk/check/0x123?size=100&leverage=5"

# Test liquidation scan
curl http://localhost:3000/risk/liquidations

# Test hedging
curl -X POST http://localhost:3000/hedging/POSITION_ID/open
```
