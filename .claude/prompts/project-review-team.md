# Project Review Team

## Purpose
Launch a multi-agent team to conduct a comprehensive review of the perpetual exchange project and provide actionable improvement recommendations.

## Team Composition

Spawn the following specialized agents to work in parallel:

### 1. **architecture-reviewer**
**Role:** Review overall system architecture, module design, and code organization

**Tasks:**
- Analyze module boundaries and dependencies
- Check for proper separation of concerns
- Identify circular dependencies or tight coupling
- Review entity relationships and data flow
- Assess scalability of current architecture
- Check adherence to clean architecture principles

### 2. **security-reviewer**
**Role:** Security audit of the entire codebase

**Tasks:**
- Scan for OWASP Top 10 vulnerabilities
- Check authentication/authorization implementation
- Review input validation and sanitization
- Identify potential injection points (SQL, XSS, command injection)
- Check secrets management and environment variable usage
- Review API endpoint security
- Assess rate limiting and DoS protection

### 3. **code-quality-reviewer**
**Role:** Code quality and best practices review

**Tasks:**
- Check TypeScript best practices and type safety
- Review error handling patterns
- Identify code smells and anti-patterns
- Check for proper logging practices
- Review code duplication (DRY violations)
- Assess naming conventions consistency
- Check for proper use of immutability

### 4. **testing-reviewer**
**Role:** Test coverage and quality assessment

**Tasks:**
- Analyze test coverage across all modules
- Review test quality (not just quantity)
- Identify untested critical paths
- Check for proper mocking strategies
- Assess integration test coverage
- Review E2E test coverage for critical user flows
- Identify flaky or poorly structured tests

### 5. **performance-reviewer**
**Role:** Performance optimization opportunities

**Tasks:**
- Identify N+1 query patterns
- Review database query efficiency
- Check for proper indexing strategies
- Identify memory leak potential
- Review caching strategies
- Assess async/await usage patterns
- Check for blocking operations

### 6. **api-design-reviewer**
**Role:** REST API design and consistency review

**Tasks:**
- Review RESTful resource naming
- Check HTTP method usage appropriateness
- Assess error response consistency
- Review request/response payload design
- Check for proper status code usage
- Identify missing API versioning strategy
- Review API documentation completeness

### 7. **smart-contract-reviewer**
**Role:** Smart Contract security and quality audit

**Tasks:**
- Review Vault.sol for security vulnerabilities (reentrancy, overflow/underflow)
- Check access control and owner permissions
- Review event definitions and emissions (Deposit, Withdraw, PositionOpened, PositionClosed)
- Verify PnL calculation logic for correctness and overflow protection
- Review token handling (USDC deposit/withdraw)
- Check position management logic (openPosition, closePosition)
- Assess test coverage for contract functionality
- Verify gas optimization opportunities

### 8. **blockchain-integration-reviewer**
**Role:** On-chain to off-chain integration review

**Tasks:**
- Review event indexer implementation (event-listener.service.ts)
- Verify Deposit/Withdraw event listening logic
- Check block confirmation handling
- Review idempotency for event processing
- Assess failure recovery and retry logic
- Review wallet login signature verification (EIP-712, nonce replay protection)
- Verify session/token management for authenticated users
- Check frontend contract integration (contracts.ts configuration)
- Review cross-chain data consistency strategies

## Execution Workflow

1. **Discovery Phase** (all agents run in parallel)
   - Each agent explores the codebase independently
   - Gather findings in structured format

2. **Analysis Phase** (agents continue in parallel)
   - Each agent analyzes their findings against best practices
   - Generate preliminary recommendations

3. **Synthesis Phase** (team lead consolidates)
   - Collect all agent findings
   - Consolidate overlapping recommendations
   - Prioritize by impact and effort
   - Cross-reference: security-reviewer + smart-contract-reviewer on Vault security
   - Cross-reference: api-design-reviewer + blockchain-integration-reviewer on wallet login

4. **Reporting Phase**
   - Generate comprehensive report with:
     - Executive summary
     - Per-category findings
     - Prioritized action items
     - Quick wins vs. long-term improvements

## Output Format

Generate a markdown report at `docs/REVIEW_REPORT.md` with the following structure:

```markdown
# Project Review Report

**Date:** YYYY-MM-DD
**Reviewers:** [List of agents]

## Executive Summary
- Overall health score (1-10)
- Top 3 critical issues
- Top 3 quick wins

## Architecture Review
### Findings
- [Finding 1]
- [Finding 2]

### Recommendations
- [High priority recommendation]
- [Medium priority recommendation]

## Security Review
...

## Code Quality Review
...

## Testing Review
...

## Performance Review
...

## API Design Review
...

## Smart Contract Review
...

## Blockchain Integration Review
...

## Prioritized Action Items

### Critical (Do Immediately)
1. ...
2. ...

### High Priority (This Week)
1. ...
2. ...

### Medium Priority (This Month)
1. ...
2. ...

### Low Priority (Nice to Have)
1. ...
2. ...

## Quick Wins
- [Low effort, high impact items]

## Appendix
- Files reviewed
- Tools used
- References
```

## Agent Coordination

- Use a shared task list to track review progress
- Agents should communicate findings via team messages
- Avoid duplicate work - agents should announce what they're reviewing
- Cross-reference findings when categories overlap (e.g., security + API design)

## Success Criteria

The review is complete when:
- All agents have submitted their findings
- Report is generated with prioritized recommendations
- Each recommendation has clear rationale and suggested fix
- At least 80% of codebase has been reviewed
