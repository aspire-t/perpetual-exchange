# Perpetual Exchange

A decentralized perpetual futures exchange built on Next.js and NestJS.

## Features

- **Trade perpetual futures** with Long and Short positions
- **Real-time price feeds** from Hyperliquid API
- **Position management** with PnL tracking
- **Deposit and withdraw** USDC tokens
- **Wallet integration** via wagmi/viem
- **Responsive UI** with dark mode support

### Bonus Features

- **Funding Rate Mechanism** - 8-hour interval funding payments (FAQ Q9)
- **Risk Engine** - Margin checks, leverage limits, liquidation detection (FAQ Q10)
- **Automatic Liquidations** - Price oracle-based liquidation system
- **Hyperliquid Hedging** - Real API integration for automatic hedging
- **Replay Attack Protection** - Nonce-based wallet login security

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **wagmi** - Ethereum wallet hooks
- **viem** - Ethereum client library
- **TanStack Query** - Data fetching and caching
- **Jest + Testing Library** - Unit and component testing

### Backend
- **NestJS** - Node.js framework
- **TypeORM** - Database ORM
- **PostgreSQL/SQLite** - Database
- **Axios** - HTTP client for external APIs
- **ethers.js** - Ethereum library

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL (optional, SQLite used by default)

### Installation

#### Backend

```bash
cd backend
npm install

# Set up environment variables
cp .env.example .env

# Run development server
npm run start:dev
```

The backend will start on `http://localhost:3001`.

#### Frontend

```bash
cd frontend
npm install

# Run development server
npm run dev
```

The frontend will start on `http://localhost:3000`.

## Project Structure

```
perpetual-exchange/
├── backend/
│   ├── src/
│   │   ├── auth/             # Wallet auth with replay protection
│   │   ├── order/            # Order management
│   │   ├── position/         # Position management
│   │   ├── price/            # Price feed service
│   │   ├── balance/          # Balance management
│   │   ├── funding/          # Funding rate mechanism
│   │   ├── risk/             # Risk engine & liquidations
│   │   ├── hedging/          # Hyperliquid hedging
│   │   ├── faucet/           # Test token faucet
│   │   ├── deposit/          # Deposit tracking
│   │   ├── withdrawal/       # Withdrawal processing
│   │   ├── indexer/          # Event indexer
│   │   └── main.ts           # Entry point
│   └── test/                 # E2E tests
├── frontend/
│   ├── app/
│   │   ├── trade/            # Trading page
│   │   ├── positions/        # Positions page
│   │   ├── deposit/          # Deposit page
│   │   ├── withdraw/         # Withdraw page
│   │   └── components/       # Shared components
│   └── __tests__/            # Unit tests
├── docs/
│   └── BONUS_FEATURES.md     # Bonus features documentation
└── docker-compose.yml        # Docker configuration
```

## API Documentation

### Backend Endpoints

#### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/order` | Create a new market order |
| GET | `/order/user/:address` | Get user's orders |
| GET | `/order/:id` | Get order by ID |

#### Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/position/user/:address` | Get user's positions |
| GET | `/position/:id` | Get position by ID |
| POST | `/position/:id/close` | Close a position |

#### Price

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/price/all` | Get current market price |

#### Balance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/balance/:address` | Get user's balance |
| POST | `/balance/deposit` | Record a deposit |
| POST | `/withdraw` | Process withdrawal |

#### Funding Rate

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/funding/rate/:symbol` | Get current funding rate |
| GET | `/funding/history/:symbol` | Get funding rate history |
| POST | `/funding/apply` | Apply funding to all positions |

#### Risk Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/risk/check/:address` | Check if new position is allowed |
| GET | `/risk/liquidation/:id` | Check position liquidation status |
| GET | `/risk/liquidations` | Scan all positions for liquidation risk |
| POST | `/risk/liquidate/:id` | Execute liquidation for position |
| POST | `/risk/liquidate-all` | Auto-liquidate all breaching positions |
| GET | `/risk/max-size/:address` | Get maximum allowed position size |

#### Hedging

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/hedging/:positionId/open` | Open hedge for position |
| POST | `/hedging/:hedgeId/close` | Close existing hedge |
| GET | `/hedging/:hedgeId` | Get hedge details |
| GET | `/hedging/position/:id` | Get all hedges for position |
| POST | `/hedging/auto/:positionId` | Auto-hedge (called on position open) |
| POST | `/hedging/sync/:hedgeId` | Sync status with Hyperliquid |
| GET | `/hedging/volume/total` | Get total hedged volume |

### Request/Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

#### Example: Create Order

**Request:**
```json
POST /order
{
  "address": "0x1234567890123456789012345678901234567890",
  "type": "market",
  "side": "buy",
  "size": "1000000000000000000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "address": "0x1234...",
    "type": "market",
    "side": "buy",
    "size": "1000000000000000000",
    "status": "pending"
  }
}
```

## Frontend Pages

### Home (`/`)
Landing page with navigation and wallet connection.

### Trade (`/trade`)
- Real-time price display
- Position size input
- Long/Short order buttons
- Order success/error feedback

### Positions (`/positions`)
- List of user's positions
- Position details: size, entry price, direction (Long/Short)
- PnL display
- Close position button

### Deposit (`/deposit`)
- Vault address display
- Copy to clipboard functionality
- Deposit instructions
- Security warnings

### Withdraw (`/withdraw`)
- Available balance display
- Withdrawal amount input
- Withdrawal processing
- Success/error feedback

## Testing

### Frontend Tests

```bash
cd frontend
npm test           # Run tests once
npm run test:watch # Run tests in watch mode
```

Frontend tests use Jest with Testing Library. All components are tested with mocked wagmi and React Query hooks.

### Backend Tests

```bash
cd backend
npm test           # Run unit tests
npm run test:e2e   # Run E2E tests
npm run test:cov   # Run tests with coverage
```

### Test Coverage

The project maintains high test coverage:
- Component tests for all pages
- Unit tests for services
- E2E tests for critical flows

## Environment Variables

### Backend (.env)

```env
DATABASE_PATH=dev.db
PORT=3001
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
HYPERLIQUID_API_KEY=your_api_key_here
HYPERLIQUID_WALLET_ADDRESS=your_wallet_address_here
HYPERLIQUID_PRIVATE_KEY=your_private_key_here
JWT_SECRET=your-jwt-secret
```

> **Note:** The Hyperliquid credentials are optional. The system runs in mock mode without them, which simulates hedging without real API calls.

### Frontend

Frontend uses hardcoded API URLs pointing to `http://localhost:3001` for development.

## Docker

Run the entire stack with Docker Compose:

```bash
docker-compose up -d
```

This starts:
- Backend on port 3001
- Frontend on port 3000
- PostgreSQL database

## Development

### Code Style

- **Frontend**: ESLint with Next.js config
- **Backend**: ESLint with NestJS config

Run linting:

```bash
cd frontend && npm run lint
cd backend && npm run lint
```

### Git Workflow

- Use conventional commits
- Create feature branches
- All code requires tests
- PRs must pass CI

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

UNLICENSED - All rights reserved.
