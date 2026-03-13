# AI Use Report

## AI Tools & Models Used

*   **IDE**: Trae
*   **Models**:
    *   **Claude 3.5 Sonnet**: Used for complex logic generation, architectural planning, and debugging. Its strong reasoning capabilities were utilized for the Risk Engine and Indexer logic.
    *   **GPT-4o**: Used for rapid code generation, documentation writing, and frontend component scaffolding.
*   **Frameworks**:
    *   **NestJS CLI**: AI-assisted scaffolding for modules and controllers.
    *   **Next.js**: AI-generated page structures and Tailwind styling.

## Key Prompts Examples

The following are examples of prompts used during the development of this project:

### Backend Development
> "Create a NestJS service `RiskEngineService` that handles margin checks, leverage limits (max 10x), and liquidation logic. It should have methods `checkNewPositionRisk` and `checkLiquidation`. Use BigInt for precise calculations."

> "Implement a `HyperliquidClient` in NestJS using `HttpService`. It should have methods to place orders and get positions. If `HYPERLIQUID_PRIVATE_KEY` is missing, it should fallback to a mock implementation that simulates successful orders."

### Smart Contract
> "Write a minimal Solidity Vault contract that accepts USDC deposits. It should track user balances and allow the owner (backend) to withdraw funds or update balances based on off-chain trading PnL. Include `Deposit` and `Withdraw` events."

### Frontend Development
> "Create a Next.js page for `/trade` that displays a trading interface. It should have a price chart placeholder, an order form (Long/Short), and a list of open positions. Use Tailwind CSS for a dark-themed UI."

> "Write a custom React hook `useVaultAllowance` using wagmi to check if the user has approved the Vault contract to spend their USDC."

## AI Generated Code Ratio (Estimate)

*   **Total Project**: ~75%
*   **Boilerplate & Scaffolding**: ~90% (Module setups, DTOs, entity definitions, basic UI components)
*   **Core Logic**: ~60% (Risk calculations, hedging logic, smart contract constraints required significant human review and refinement)
*   **Tests**: ~80% (Unit tests and E2E test structures were largely AI-generated)

## Problems Solved by AI

1.  **Rapid Prototyping**: Generated the initial project structure for both NestJS and Next.js in minutes, including Docker configuration.
2.  **Complex Calculations**: Helped implement the PnL and liquidation price formulas in `RiskEngineService` to ensure mathematical correctness.
3.  **Integration**: generated the `wagmi` configuration and wallet connection logic, which can be verbose and error-prone.
4.  **Testing Strategy**: Suggested and scaffolded the E2E testing framework using Jest and Supertest for the backend.
5.  **Styling**: Generated responsive Tailwind CSS classes for the frontend, saving significant design time.

## Problems AI Could Not Solve

1.  **Architectural Trade-offs**: The decision to use an off-chain matching engine with on-chain settlement (Hybrid model) vs. a fully on-chain AMM was a human decision based on performance requirements.
2.  **Security Audits**: While AI helped write the smart contract, it cannot guarantee security. A human audit was required to ensure `onlyOwner` modifiers and reentrancy guards were correctly applied.
3.  **Complex Debugging**: When the Indexer failed to sync events due to RPC rate limits, human intervention was needed to implement proper retry logic and error handling strategies.
4.  **Business Logic Edge Cases**: Defining the exact liquidation threshold (2.5%) and maintenance margin (5%) required financial domain knowledge that AI could suggest but not decide.
5.  **Hyperliquid API Specifics**: The specific signing logic for Hyperliquid's API is complex and required manual implementation details that generic AI models sometimes hallucinate.
