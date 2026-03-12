---
name: USDC Deposit Design
description: Design for USDC ERC20 deposit flow with approve + deposit two-step pattern
type: project
---

# USDC Deposit Improvement Design

## Overview

Replace the current static deposit page with an interactive USDC deposit flow using the standard ERC20 approve + transferFrom pattern.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Deposit UI    │────▶│  Wagmi Hooks    │────▶│  Vault Contract │
│                 │     │                 │     │                 │
│ - Amount Input  │     │ - useBalance    │     │ - deposit()     │
│ - Approve Btn   │     │ - useAllowance  │     │ - withdraw()    │
│ - Deposit Btn   │     │ - useApprove    │     │ - deposits[]    │
│ - Balance Display│    │ - useDeposit    │     │ - withdrawals[] │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  MockUSDC Token │
                       │                 │
                       │ - approve()     │
                       │ - allowance()   │
                       │ - transferFrom()│
                       │ - mint()        │
                       └─────────────────┘
```

## Smart Contracts

### MockUSDC.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
```

**Key Points:**
- 6 decimals (standard for USDC) - use `ERC20` with default 18 decimals, or override `decimals()` to return 6
- Owner can mint tokens for testing
- Deployed once, address used in Vault constructor

### Vault.sol Modifications

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    IERC20 public usdc;

    mapping(address => uint256) public deposits;
    mapping(address => uint256[]) public depositHistory;
    mapping(address => uint256[]) public withdrawalHistory;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    constructor(address usdcAddress) Ownable(msg.sender) {
        usdc = IERC20(usdcAddress);
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        deposits[msg.sender] += amount;
        depositHistory[msg.sender].push(amount);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        deposits[msg.sender] -= amount;
        require(usdc.transfer(msg.sender, amount), "Transfer failed");
        withdrawalHistory[msg.sender].push(amount);
        emit Withdrawal(msg.sender, amount);
    }

    function getUserDepositHistory(address user) external view returns (uint256[] memory) {
        return depositHistory[user];
    }

    function getUserWithdrawalHistory(address user) external view returns (uint256[] memory) {
        return withdrawalHistory[user];
    }
}
```

**Changes from ETH version:**
- Remove `receive() external payable`
- Add `IERC20 public usdc` state variable
- Constructor takes USDC address
- `deposit()` uses `transferFrom()` instead of `msg.value`
- `withdraw()` transfers USDC instead of ETH

## Frontend Hooks

### useUSDCBalance

```typescript
import { useReadContract } from 'wagmi';

export function useUSDCBalance(address: string | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address],
  });
}
```

### useVaultAllowance

```typescript
import { useReadContract } from 'wagmi';

export function useVaultAllowance(address: string | undefined) {
  return useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address, VAULT_ADDRESS],
  });
}
```

### useApprove

```typescript
import { useWriteContract } from 'wagmi';

export function useApprove() {
  const { writeContract, ...rest } = useWriteContract();

  const approve = (amount: bigint) => {
    return writeContract({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [VAULT_ADDRESS, amount],
    });
  };

  return { approve, ...rest };
}
```

### useDeposit

```typescript
import { useWriteContract } from 'wagmi';

export function useDeposit() {
  const { writeContract, ...rest } = useWriteContract();

  const deposit = (amount: bigint) => {
    return writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [amount],
    });
  };

  return { deposit, ...rest };
}
```

## UI Component Design

### State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                     NOT CONNECTED                           │
│  [Connect Wallet Button]                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     CONNECTED                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Your Balance: 1000 USDC                               │  │
│  │ Vault Allowance: 0 USDC                               │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Amount: [_________] USDC                              │  │
│  │ [Max] button                                          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ IF allowance >= amount:                               │  │
│  │   [Deposit Button] (enabled)                          │  │
│  │ ELSE:                                                 │  │
│  │   [Approve Button] (enabled)                          │  │
│  │   [Deposit Button] (disabled until approved)          │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Transaction Status:                                   │  │
│  │ - Pending: Spinner + "Approving..." or "Depositing..."│  │
│  │ - Success: Green checkmark + confirmation message     │  │
│  │ - Error: Red X + error message + retry button         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Deposit USDC                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Available Balance          1,000.00 USDC              │  │
│  │ Vault Allowance            0.00 USDC                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Deposit Amount                                         │  │
│  │ [                    100          ] [Max]  USDC       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │  State 1: Not Approved                                 │  │
│  │  ┌──────────────────┐  ┌──────────────────┐           │  │
│  │  │   Approve 100    │  │  Deposit (⚠️)    │           │  │
│  │  └──────────────────┘  └──────────────────┘           │  │
│  │                                                        │  │
│  │  State 2: Approved                                     │  │
│  │  ┌──────────────────┐  ┌──────────────────┐           │  │
│  │  │   ✓ Approved     │  │    Deposit 100   │           │  │
│  │  └──────────────────┘  └──────────────────┘           │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Recent Deposits                                        │  │
│  │ ┌─────────────────────────────────────────────────┐   │  │
│  │ │ 2024-01-15 10:30    +100.00 USDC    Confirmed   │   │  │
│  │ │ 2024-01-14 15:45    +50.00 USDC     Confirmed   │   │  │
│  │ └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling

| Error Type | Detection | User Message | Recovery |
|------------|-----------|--------------|----------|
| Insufficient balance | `balance < amount` before approve | "Insufficient USDC balance" | Show max button |
| Allowance insufficient | `allowance < amount` before deposit | "Approve vault to spend USDC first" | Enable Approve button |
| User rejected tx | `error.code === 4001` | "Transaction cancelled" | Keep button enabled for retry |
| RPC error | `error.code` network related | "Network error, please try again" | Retry button |
| Slippage (future) | Custom logic | "Price impact too high" | Reduce amount |
| Contract reverted | `error.reason` from contract | Display revert reason | Fix input, retry |

## Testing Strategy

### Smart Contract Tests

1. **MockUSDC Tests**
   - Deploy and check name/symbol
   - Owner can mint
   - Non-owner cannot mint

2. **Vault Tests**
   - Deploy with USDC address
   - Deposit: approve → deposit, verify balance update
   - Withdraw: verify balance decreases, USDC transferred
   - Events emitted correctly
   - Revert on insufficient balance
   - Revert on zero amount

### E2E Tests

1. **Deposit Flow**
   - Connect wallet
   - Mint test USDC (test helper)
   - Approve vault
   - Deposit amount
   - Verify balance updates

2. **Error Cases**
   - Insufficient balance shows error
   - Deposit without approve fails
   - Zero amount rejected

## Deployment Sequence

```
1. Deploy MockUSDC
   ↓
2. Deploy Vault (constructor: MockUSDC address)
   ↓
3. Update frontend config with addresses
   ↓
4. Mint test tokens to test accounts
   ↓
5. Test approve + deposit flow
```
