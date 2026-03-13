# AI Usage Report

## AI Tools & Models Used

### Primary Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| **Claude Code** | Main development assistant | Code generation, refactoring, debugging, documentation |
| **Trae IDE** | AI-powered IDE | Real-time code completion, inline editing |

### Models

| Model | Provider | Primary Use Cases |
|-------|----------|-------------------|
| **Claude 3.5 Sonnet** | Anthropic | Complex logic, architectural decisions, debugging |
| **Claude 4.5/4.6 (Opus/Sonnet)** | Anthropic | Code review, test generation, documentation |
| **GPT-4o** | OpenAI | Rapid scaffolding, UI components |

---

## Key Prompts Examples

### Backend Development

**Risk Engine Implementation:**
```
Create a NestJS service `RiskEngineService` that handles:
1. Margin checks for new positions (max 10x leverage)
2. Liquidation price calculation
3. Health factor computation

Requirements:
- Use decimal.js for precise calculations
- Method signature: checkNewPositionRisk(address, symbol, size, leverage): boolean
- Method signature: calculateLiquidationPrice(position): number
- Include unit tests with edge cases
```

**Hedging Service:**
```
Implement a `HedgingService` in NestJS that:
1. Automatically hedges user positions on Hyperliquid
2. Supports dual-mode: Mock (development) and Real (production)
3. Has methods: openHedge(position), closeHedge(hedgeId), syncStatus(hedgeId)

The service should:
- Read HYPERLIQUID_* credentials from environment
- Fall back to mock mode if credentials missing
- Emit events for hedge status changes
```

**Indexer Module:**
```
Build a blockchain indexer service that:
1. Listens to Vault contract events (Deposit, Withdraw)
2. Processes events idempotently (track by transaction hash)
3. Updates user balances in the database

Use ethers.js for event listening and TypeORM for persistence.
Include retry logic with exponential backoff for RPC failures.
```

---

### Smart Contract Development

**Vault Contract:**
```
Write a minimal Solidity Vault contract that:
1. Accepts USDC deposits from users
2. Tracks user deposit balances
3. Allows owner to withdraw funds for PnL settlement
4. Emits Deposit and Withdraw events

Requirements:
- Use OpenZeppelin's Ownable and SafeERC20
- Include reentrancy guard on withdrawals
- Support EIP-712 signature-based withdrawals
- 6 decimal precision (USDC standard)
```

**MockUSDC Token:**
```
Create a MockUSDC ERC20 token for local testing:
- 6 decimals (matching real USDC)
- Mintable by owner (faucet functionality)
- Compatible with Vault contract
- Use OpenZeppelin ERC20 base
```

---

### Frontend Development

**Trading Page:**
```
Create a Next.js trading page at /trade with:
1. Real-time price display (fetch from backend)
2. Order form: Long/Short buttons, size input, leverage selector
3. Position table showing user's open positions with PnL
4. K-line chart component placeholder

Use:
- wagmi for wallet connection
- TanStack Query for data fetching
- Tailwind CSS for dark-themed styling
- TypeScript for type safety
```

**Custom Hooks:**
```
Write a custom hook `useOrders` that:
1. Fetches user orders from backend /order/user/:address
2. Supports polling every 5 seconds
3. Provides methods: refresh(), cancelOrder(id)
4. Returns: { orders, isLoading, error, refresh, cancelOrder }

Use TanStack Query's useQuery and useMutation.
```

**Wallet Integration:**
```
Create a ConnectWallet component using wagmi that:
1. Shows "Connect Wallet" button when disconnected
2. Displays truncated address when connected
3. Handles chain ID validation (must be 31337 for local)
4. Includes disconnect functionality
```

---

### Testing

**E2E Test Generation:**
```
Write Playwright E2E tests for the trading flow:
1. User connects wallet
2. User deposits USDC
3. User opens Long position
4. User checks position PnL
5. User closes position

Mock the backend API responses and wallet interactions.
```

---

## AI Generated Code Ratio (Estimate)

| Category | AI Contribution | Notes |
|----------|-----------------|-------|
| **Overall Project** | ~70% | Significant human review and refinement |
| **Boilerplate** | ~90% | Module setup, DTOs, entities, basic components |
| **Core Business Logic** | ~50% | Risk calculations, hedging, PnL formulas |
| **Smart Contracts** | ~60% | Contract structure AI, security patterns human-reviewed |
| **Tests** | ~85% | Test structure AI, edge cases human-added |
| **Documentation** | ~80% | First draft AI, accuracy verified by human |
| **UI Components** | ~75% | Layout AI, styling refined by human |

---

## Problems Solved by AI

### 1. Rapid Prototyping
Generated complete project scaffolding in minutes:
- NestJS module structure with controllers, services, DTOs
- Next.js page structure with proper TypeScript types
- Docker Compose configuration for all services

### 2. Complex Mathematical Formulas
AI helped implement correct formulas for:
- **PnL Calculation**: `pnl = size * (exitPrice - entryPrice) / entryPrice`
- **Liquidation Price**: Maintenance margin + unrealized loss = 0
- **Funding Rate**: Based on open interest imbalance

### 3. Integration Code
Verbose integration code generated efficiently:
- wagmi hooks configuration for Next.js App Router
- ethers.js event listener with proper type definitions
- TypeORM entity relationships

### 4. Test Generation
AI excelled at generating comprehensive test suites:
- Table-driven unit tests for backend services
- Component tests with mocked dependencies
- E2E test flows covering happy paths and error cases

### 5. Styling and UI
Tailwind CSS classes generated for:
- Responsive layouts
- Dark mode support
- Loading states and animations

---

## Problems AI Could NOT Solve

### 1. Architectural Trade-offs
**Problem**: Choosing between off-chain matching vs. on-chain AMM.

**Why AI Couldn't Solve**: This requires business context, performance requirements, and risk tolerance assessment that only humans can provide.

**Human Decision**: Hybrid model (off-chain matching + on-chain settlement) for MVP speed.

---

### 2. Security Audit
**Problem**: Ensuring smart contract security.

**Why AI Couldn't Solve**: AI can suggest patterns but cannot guarantee security. Subtle vulnerabilities require human expertise.

**Human Action**: Manual review of:
- `onlyOwner` modifier placement
- Reentrancy guard necessity
- Integer overflow/underflow (mitigated by Solidity 0.8+)
- Signature replay attack vectors

---

### 3. Complex Debugging
**Problem**: Indexer failing to sync events consistently.

**Why AI Couldn't Solve**: The issue involved RPC rate limiting, network latency, and Hardhat node behavior specific to the development environment.

**Human Solution**: Implemented:
- Exponential backoff retry logic
- Event deduplication by transaction hash
- Health check endpoint for monitoring

---

### 4. Business Logic Edge Cases
**Problem**: Defining exact liquidation thresholds.

**Why AI Couldn't Solve**: AI could suggest industry standards but couldn't decide the protocol's risk tolerance.

**Human Decision**:
- Maintenance margin: 5%
- Liquidation buffer: 2.5%
- Max leverage: 10x

---

### 5. Hyperliquid API Specifics
**Problem**: Correct signing logic for Hyperliquid API.

**Why AI Couldn't Solve**: The API signing requirements are specific and AI models tend to hallucinate details.

**Human Solution**: Manual implementation based on official Hyperliquid documentation.

---

### 6. Frontend State Management
**Problem**: Optimal TanStack Query configuration for real-time price updates.

**Why AI Couldn't Solve**: Required understanding of user experience trade-offs between freshness and API load.

**Human Decision**:
- Price polling: 1 second
- Position polling: 5 seconds
- Stale time: 0 for prices, 30s for positions

---

### 7. Database Schema Optimization
**Problem**: Indexing strategy for high-frequency queries.

**Why AI Couldn't Solve**: Requires understanding of query patterns and data volume projections.

**Human Decision**: Added indexes on:
- `positions(user_id, status)`
- `orders(user_id, created_at)`
- `deposits(user_id, created_at)`

---

## AI Workflow Summary

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Human Defines  │────▶│   AI Generates  │────▶│  Human Reviews  │
│  Requirements   │     │   Code          │     │   & Refines     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         ▲                                              │
         │                                              │
         └──────────────────────────────────────────────┘
                        Iterate
```

### Typical Iteration Cycle

1. **Human** provides high-level requirements
2. **AI** generates initial implementation
3. **Human** reviews, identifies issues:
   - Missing edge cases
   - Security concerns
   - Performance implications
4. **AI** refines based on feedback
5. **Human** final review and testing
6. **Repeat** until satisfied

---

## Lessons Learned

### What Worked Well
- Using AI for boilerplate and scaffolding saved significant time
- Test generation was highly effective
- Documentation drafting was efficient
- Debugging assistance for common errors

### What Required Human Expertise
- Security-critical code review
- Architectural decisions
- Business logic edge cases
- Integration with external APIs
- Performance optimization

### Recommendations for Future Projects
1. **Start with AI scaffolding** - Get the structure right quickly
2. **Human review early** - Don't let AI go too deep before checking direction
3. **Security first** - Always have security-conscious humans review auth/crypto code
4. **Test coverage** - Use AI to generate tests, but verify edge cases manually
5. **Document as you go** - AI can maintain documentation alongside code changes
