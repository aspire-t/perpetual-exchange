# Perpetual Exchange

A decentralized perpetual futures exchange built on Next.js and NestJS.

## Features

- **Trade perpetual futures** with Long and Short positions (up to 10x leverage)
- **Real-time price feeds** from Hyperliquid API
- **Position management** with PnL tracking and funding rates
- **Deposit and withdraw** USDC tokens via smart contract
- **Wallet integration** via wagmi/viem
- **Responsive UI** with dark mode support
- **K-line charts** for technical analysis

### Bonus Features

- **Funding Rate Mechanism** - 8-hour interval funding payments between long/short positions
- **Risk Engine** - Margin checks, leverage limits, liquidation detection
- **Automatic Liquidations** - Price oracle-based liquidation system
- **Hyperliquid Hedging** - Real API integration for automatic hedging (Mock/Real modes)
- **Replay Attack Protection** - Nonce-based wallet login security

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Docker (optional, for PostgreSQL and Hardhat node)

### Option 1: Docker Compose (Recommended)

Start the entire stack with one command:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Hardhat local blockchain on port 8545

Then start the application services:

```bash
# Terminal 1 - Backend
cd backend
npm install
cp .env.example .env
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### Option 2: Manual Start

```bash
# Terminal 1 - Start Hardhat Node
cd contracts
npm install
npx hardhat node

# Terminal 2 - Deploy contracts (in new terminal)
cd contracts
npx hardhat run scripts/deposit-deploy.ts --network localhost

# Terminal 3 - Start Backend
cd backend
npm install
cp .env.example .env
# Update VAULT_ADDRESS and USDC_ADDRESS in .env with deployed addresses
npm run start:dev

# Terminal 4 - Start Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to start trading.

## System Architecture

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
                    │PostgreSQL│   │  Vault   │ │ Hyperliquid  │
                    │ Database │   │ Contract │ │ (Real/Mock)  │
                    └──────────┘   └──────────┘ └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Mock USDC   │
                                   │  (ERC20)     │
                                   └──────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Frontend State | wagmi, viem, TanStack Query |
| Frontend Testing | Jest, React Testing Library, Playwright |
| Backend | NestJS, TypeScript, TypeORM |
| Backend Testing | Jest, Supertest |
| Database | PostgreSQL (prod), SQLite (dev) |
| Smart Contracts | Solidity 0.8.28, Hardhat |
| Blockchain | Hardhat Network (local), Sepolia (prod) |
| External DEX | Hyperliquid API |
| Containerization | Docker Compose |

## Key Design Decisions

### 1. Hybrid Architecture (Off-Chain Matching + On-Chain Settlement)

**Decision**: Off-chain order matching with on-chain deposit/withdrawal.

| Pros | Cons |
|------|------|
| Instant execution | Centralization risk |
| No gas fees for orders | Trust in backend required |
| Complex order types possible | Potential downtime risk |
| High-frequency trading support | |

**Mitigation**: Transparent event logging, future plans for decentralized sequencers.

### 2. Mock vs. Real Hedging

**Decision**: Dual-mode hedging system supporting both Mock and Real modes.

- **Mock Mode**: Default for development, simulates successful hedges without API calls
- **Real Mode**: Production mode with actual Hyperliquid API integration

### 3. Database Strategy

**Decision**: SQLite for development, PostgreSQL for production.

- Zero-config local development
- Production-grade concurrency with PostgreSQL
- ORM (TypeORM) abstracts database differences

### 4. Risk Engine Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max Leverage | 10x | Balances trader flexibility with protocol safety |
| Maintenance Margin | 5% | Industry standard for perpetual contracts |
| Liquidation Threshold | 2.5% | Buffer before position becomes underwater |
| Funding Interval | 8 hours | Matches industry standard (3x daily) |

## Known Limitations

| Limitation | Impact | Future Work |
|------------|--------|-------------|
| **Centralized Matching** | Backend controls order execution | Decentralized sequencer network |
| **Oracle Dependency** | Price feed is a single point of failure | Chainlink oracle integration |
| **Single Collateral** | Only USDC supported | Multi-collateral support (USDT, DAI) |
| **Market Orders Only** | No limit orders or stop-loss | Order book implementation |
| **Mock Hedging Default** | No real hedging in dev | Testnet integration guide |
| **No Insurance Fund** | Protocol bears all losses | Insurance fund mechanism |

## Documentation

- [System Architecture](ARCHITECTURE.md) - Detailed architecture breakdown
- [AI Usage Report](AI_USAGE_REPORT.md) - AI tools and contribution analysis
- [Bonus Features](docs/BONUS_FEATURES.md) - Advanced feature documentation

## Project Structure

```
perpetual-exchange/
├── backend/
│   ├── src/
│   │   ├── auth/           # Wallet authentication & replay protection
│   │   ├── balance/        # User balance management
│   │   ├── deposit/        # Deposit tracking
│   │   ├── withdrawal/     # Withdrawal processing
│   │   ├── order/          # Order management
│   │   ├── position/       # Position management & PnL
│   │   ├── price/          # Price feed service
│   │   ├── kline/          # K-line/candlestick data
│   │   ├── funding/        # Funding rate calculations
│   │   ├── risk/           # Risk engine & liquidations
│   │   ├── hedging/        # Hyperliquid hedging
│   │   ├── indexer/        # Blockchain event indexer
│   │   ├── faucet/         # Test token faucet
│   │   └── tasks/          # Scheduled tasks
│   └── test/               # E2E tests
├── frontend/
│   ├── app/
│   │   ├── trade/          # Trading interface
│   │   ├── positions/      # Position management
│   │   ├── deposit/        # Deposit page
│   │   ├── withdraw/       # Withdrawal page
│   │   └── components/     # Reusable components
│   └── e2e/                # Playwright E2E tests
├── contracts/
│   ├── contracts/
│   │   ├── Vault.sol       # Main vault contract
│   │   └── MockUSDC.sol    # Mock ERC20 token
│   ├── scripts/            # Deployment scripts
│   └── test/               # Contract tests
├── e2e/                    # Backend E2E tests
├── docs/                   # Additional documentation
└── docker-compose.yml      # Docker configuration
```

## Testing

```bash
# Frontend tests
cd frontend
npm test
npm run test:watch
npm run test:e2e

# Backend tests
cd backend
npm test
npm run test:e2e
npm run test:cov

# Contract tests
cd contracts
npm test
npm run coverage
```

## Environment Variables

### Backend (.env)

```env
DATABASE_PATH=dev.db
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=perpetual_exchange
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

PORT=3001
RPC_URL=http://localhost:8545
VAULT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3

HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_API_KEY=your_api_key_here
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address_here
HYPERLIQUID_PRIVATE_KEY=your_private_key_here

JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_VAULT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_CHAIN_ID=31337
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Write tests following TDD methodology
4. Commit your changes (`git commit -m 'feat: add new feature'`)
5. Push to the branch (`git push origin feature/new-feature`)
6. Open a Pull Request

## License

UNLICENSED - All rights reserved.
