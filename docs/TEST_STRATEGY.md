# Test Strategy

## Overview

This document defines the testing strategy for the Perpetual Exchange project. We follow a test pyramid approach with comprehensive unit tests, integration tests, and E2E tests.

## Test Layers

### 1. Unit Tests (Base of Pyramid)

**Purpose:** Test individual functions, methods, and components in isolation.

**Coverage Target:** >80%

#### Smart Contracts (Hardhat + Chai)
- Location: `contracts/test/`
- Framework: Hardhat + Chai + @nomicfoundation/hardhat-chai-matchers
- Run: `cd contracts && npm test`
- Coverage: `cd contracts && npm run coverage` (>90% required)

#### Backend (NestJS + Jest)
- Location: `backend/src/**/*.spec.ts`
- Framework: Jest + Supertest
- Run: `cd backend && npm test`
- Coverage: `cd backend && npm run test:cov` (>80% required)

#### Frontend (Next.js + Jest + React Testing Library)
- Location: `frontend/src/**/*.test.ts*`
- Framework: Jest + React Testing Library
- Run: `cd frontend && npm test`
- Coverage: `cd frontend && npm run test:coverage` (>80% required)

### 2. Integration Tests

**Purpose:** Test interactions between components and external services.

**Coverage Target:** Critical paths only

#### API Integration Tests
- Location: `backend/test/integration/`
- Test database connections, external API calls
- Use test containers for PostgreSQL

#### Blockchain Integration Tests
- Location: `contracts/test/integration/`
- Test contract interactions on Hardhat Network fork
- Fork mainnet for realistic testing

### 3. E2E Tests (Top of Pyramid)

**Purpose:** Test complete user flows from frontend to backend to blockchain.

**Coverage Target:** Critical user journeys only

#### Playwright E2E Tests
- Location: `e2e/`
- Framework: Playwright
- Run: `npm run test:e2e`
- Browsers: Chrome, Firefox, Safari

**Critical Flows:**
1. Connect wallet
2. Deposit USDC
3. Open long/short position
4. Close position
5. Withdraw funds

## Test Naming Conventions

### Unit Tests
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Test implementation
    });

    it('should throw [error] when [invalid condition]', async () => {
      // Test implementation
    });
  });
});
```

### E2E Tests
```typescript
test.describe('Feature Name', () => {
  test('should [user goal] when [action]', async ({ page }) => {
    // Test implementation
  });
});
```

## CI/CD Integration

### Pre-commit Hooks
- Run linting
- Run affected unit tests

### Pull Request Checks
- All unit tests must pass
- Code coverage thresholds met
- No security vulnerabilities

### Deployment Gates
- All E2E tests pass on staging
- Performance benchmarks within thresholds

## Mocking Strategy

### What to Mock
- External API calls (use MSW for frontend, nock for backend)
- Database calls (use in-memory test database or test containers)
- Blockchain calls (use Hardhat Network for contracts, viem mocks for frontend)
- Time-dependent operations (use fake timers)

### What NOT to Mock
- Business logic
- Utility functions
- Components under test (render real components)

## Test Data

### Factories
Use factory functions for creating test data:

```typescript
// backend/test/factories/user.factory.ts
export function createUser(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    email: `user-${crypto.randomUUID()}@test.com`,
    ...overrides,
  };
}
```

### Fixtures
Store static fixtures in `test/fixtures/`

## Running Tests

### All Tests
```bash
npm run test
```

### By Type
```bash
npm run test:unit      # Unit tests
npm run test:integration # Integration tests
npm run test:e2e       # E2E tests
```

### Watch Mode
```bash
npm run test:watch     # Watch mode for unit tests
```

### Coverage Report
```bash
npm run test:coverage  # Generate coverage report
```

## TDD Workflow

All new features and bug fixes follow TDD:

1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green

Never commit production code without a failing test first.
