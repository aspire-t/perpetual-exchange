# System Architecture

## Overview

The Perpetual Exchange is a decentralized trading platform that utilizes a **Hybrid Architecture** combining the speed of off-chain order matching with the security of on-chain settlement.

### High-Level Architecture

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

### 1. Frontend (Next.js)
*   **Tech Stack**: Next.js 16, React 19, Tailwind CSS 4, wagmi/viem.
*   **Responsibilities**:
    *   **User Interface**: Trading dashboard, position management, deposit/withdraw forms.
    *   **Wallet Integration**: Connects to user's Ethereum wallet (Metamask, etc.) for signing transactions.
    *   **Data Fetching**: Uses React Query to fetch market data, user balances, and positions from the Backend API.

### 2. Backend (NestJS)
The core logic resides here. It is divided into several key modules:

*   **`auth`**: Handles wallet authentication using signed messages (SIWE pattern) to prevent replay attacks.
*   **`order`**: Receives and validates user orders. Currently supports Market orders.
*   **`position`**: Manages open positions, calculating PnL and updating status.
*   **`risk`**: The **Risk Engine**.
    *   Checks leverage limits (max 10x).
    *   Calculates liquidation prices.
    *   Monitors positions for liquidation risk.
*   **`indexer`**: Listens to the `Vault` smart contract for `Deposit` and `Withdraw` events to update user balances in the local database.
*   **`hedging`**: Integrates with Hyperliquid to hedge user positions, minimizing protocol risk.
    *   **`HyperliquidClient`**: Handles API communication (mocked in dev/test).
*   **`price`**: Fetches real-time price data (currently mocked or from Hyperliquid).
*   **`funding`**: Calculates and applies funding rates every 8 hours to balance long/short demand.

### 3. Smart Contracts (Solidity)
*   **`Vault.sol`**:
    *   Holds user USDC deposits.
    *   Allows users to deposit and withdraw.
    *   **Owner (Backend)** can withdraw funds to settle PnL or rebalance.
    *   Emits events for the backend indexer.

## Data Flow

### Trading Flow
1.  **User** places a Market Order (Long/Short) via Frontend.
2.  **Backend** (`OrderController`) receives the request.
3.  **Risk Engine** (`RiskEngineService`) checks:
    *   Is leverage <= 10x?
    *   Does user have enough available balance (margin)?
4.  If valid, **Order Service** executes the order:
    *   Creates a new `Position` in DB.
    *   Deducts required margin from user's `availableBalance`.
5.  **Hedging Service** (`HedgingService`) automatically opens a corresponding hedge position on Hyperliquid (if enabled).

### Deposit Flow
1.  **User** calls `deposit(amount)` on `Vault` contract.
2.  **Blockchain** confirms transaction and emits `Deposit` event.
3.  **Indexer Service** detects the event.
4.  **Indexer** updates user's `balance` in the database.
5.  **Frontend** reflects the new balance.

### Liquidation Flow
1.  **Risk Engine** periodically scans all open positions (`scanForLiquidations`).
2.  If a position's **Health Factor < 1** (or margin falls below maintenance level):
    *   The position is flagged for liquidation.
    *   `executeLiquidation` is called.
    *   Position is closed at current market price.
    *   Remaining margin (if any) is seized by the protocol (insurance fund).

## Key Design Trade-offs

### 1. Off-Chain Matching vs. On-Chain AMM
*   **Decision**: We chose an **Off-Chain Matching** engine (Order Book model) with on-chain settlement.
*   **Trade-off**:
    *   **Pros**: Instant execution, no gas fees for placing/cancelling orders, support for high-frequency trading features.
    *   **Cons**: Centralization risk (user must trust the backend), potential for censorship or downtime.
*   **Mitigation**: Transparency reports and future plans for decentralized sequencers.

### 2. Mock vs. Real Hedging
*   **Decision**: The current implementation supports both Mock and Real hedging via `HyperliquidClient`.
*   **Trade-off**:
    *   **Pros**: Allows development without risking real funds.
    *   **Cons**: Mock mode does not reflect true market liquidity or slippage.
*   **Mitigation**: Real integration is implemented but requires valid API credentials.

### 3. Database Choice
*   **Decision**: SQLite for development, PostgreSQL for production.
*   **Trade-off**:
    *   **Pros**: SQLite is zero-config and great for local dev. Postgres is robust for concurrency.
    *   **Cons**: Need to handle potential SQL dialect differences (minimized by TypeORM).

## Known Limitations

1.  **Centralization**: The backend controls the order matching and liquidation process. Users rely on the backend to be honest about execution prices.
2.  **Oracle Dependency**: The system relies on a price feed (Hyperliquid or internal mock). If this feed is manipulated or goes down, liquidations could occur incorrectly.
3.  **Single Collateral**: Only USDC is supported as collateral.
4.  **No Limit Orders**: Currently, only Market orders are fully supported in the matching engine logic.
5.  **Manual Hedging Config**: Hedging requires manual key management and is not fully decentralized.
