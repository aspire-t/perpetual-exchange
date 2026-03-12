# USDC Deposit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement interactive USDC deposit flow with approve + deposit two-step pattern

**Architecture:**
- Smart Contracts: MockUSDC (ERC20 token) + Vault (modified for USDC support)
- Frontend: Wagmi hooks for contract interaction + updated deposit page UI
- Testing: Hardhat tests for contracts + Playwright E2E tests for deposit flow

**Tech Stack:** Solidity 0.8.20, Hardhat, OpenZeppelin, Next.js, Wagmi/Viem

---

## Task 1: Create MockUSDC Contract

**Files:**
- Create: `contracts/contracts/MockUSDC.sol`
- Test: `contracts/test/MockUSDC.test.ts`

**Step 1: Write the failing test**

```typescript
// contracts/test/MockUSDC.test.ts
import { expect } from "chai";
import hre from "hardhat";

describe("MockUSDC", function () {
  it("Should deploy with correct name and symbol", async function () {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    expect(await usdc.name()).to.equal("Mock USDC");
    expect(await usdc.symbol()).to.equal("USDC");
  });

  it("Should allow owner to mint tokens", async function () {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const [owner, addr1] = await hre.ethers.getSigners();
    await usdc.mint(addr1.address, 1000000000000); // 1M tokens (6 decimals)

    expect(await usdc.balanceOf(addr1.address)).to.equal(1000000000000);
  });

  it("Should reject mint from non-owner", async function () {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const [_, addr1] = await hre.ethers.getSigners();
    await expect(usdc.connect(addr1).mint(addr1.address, 1000000)).to.be.reverted;
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd contracts && npm test -- test/MockUSDC.test.ts`
Expected: FAIL with "contract not found" or compilation error

**Step 3: Write minimal implementation**

```solidity
// contracts/contracts/MockUSDC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing - mintable by owner
 */
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    /**
     * @dev Mint tokens to address (only owner)
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to match USDC (6 decimals)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
```

**Step 4: Run test to verify it passes**

Run: `cd contracts && npm test -- test/MockUSDC.test.ts`
Expected: PASS (3/3 tests)

**Step 5: Commit**

```bash
cd contracts
git add contracts/MockUSDC.sol test/MockUSDC.test.ts
git commit -m "feat: add MockUSDC mintable ERC20 token for testing"
```

---

## Task 2: Modify Vault Contract for USDC Support

**Files:**
- Modify: `contracts/contracts/Vault.sol`
- Test: `contracts/test/Vault.test.ts`

**Step 1: Write failing tests**

```typescript
// contracts/test/Vault.test.ts (new file or modify existing)
import { expect } from "chai";
import hre from "hardhat";

describe("Vault with USDC", function () {
  let usdc: any;
  let vault: any;
  let owner: any;
  let user1: any;

  beforeEach(async function () {
    const [ownerSigner, user1Signer] = await hre.ethers.getSigners();
    owner = ownerSigner;
    user1 = user1Signer;

    // Deploy MockUSDC
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy Vault with USDC address
    const Vault = await hre.ethers.getContractFactory("Vault");
    vault = await Vault.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    // Mint USDC to user
    await usdc.mint(user1.address, hre.ethers.parseUnits("1000", 6));
  });

  it("Should accept USDC deposit", async function () {
    const depositAmount = hre.ethers.parseUnits("100", 6);

    // Approve vault to spend USDC
    await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);

    // Deposit
    await vault.connect(user1).deposit(depositAmount);

    expect(await vault.deposits(user1.address)).to.equal(depositAmount);
  });

  it("Should allow USDC withdrawal", async function () {
    const depositAmount = hre.ethers.parseUnits("100", 6);
    const withdrawAmount = hre.ethers.parseUnits("50", 6);

    // Deposit first
    await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount);

    // Withdraw
    await vault.connect(user1).withdraw(withdrawAmount);

    expect(await vault.deposits(user1.address)).to.equal(
      depositAmount - withdrawAmount
    );
    expect(await usdc.balanceOf(user1.address)).to.equal(
      hre.ethers.parseUnits("950", 6)
    );
  });

  it("Should reject withdrawal with insufficient balance", async function () {
    const depositAmount = hre.ethers.parseUnits("100", 6);

    await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount);

    await expect(
      vault.connect(user1).withdraw(hre.ethers.parseUnits("150", 6))
    ).to.be.revertedWith("Insufficient deposit");
  });

  it("Should reject deposit of zero amount", async function () {
    await usdc.connect(user1).approve(await vault.getAddress(), 0);
    await expect(vault.connect(user1).deposit(0)).to.be.revertedWith(
      "Amount must be > 0"
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd contracts && npm test -- test/Vault.test.ts`
Expected: FAIL (Vault doesn't have USDC support yet)

**Step 3: Modify Vault.sol**

Replace the entire Vault.sol with:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Vault
 * @dev Vault contract for USDC deposits and withdrawals
 */
contract Vault is Ownable {
    using SafeERC20 for IERC20;

    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PositionOpened(
        address indexed user,
        bool isLong,
        uint256 size,
        uint256 entryPrice
    );
    event PositionClosed(
        address indexed user,
        bool isLong,
        uint256 size,
        uint256 entryPrice,
        uint256 exitPrice,
        int256 pnl
    );

    // USDC token
    IERC20 public usdc;

    // Position type: 0 = Long, 1 = Short
    enum PositionType {
        Long,
        Short
    }

    // Position struct
    struct Position {
        uint256 size;
        uint256 entryPrice;
        bool isLong;
        bool isOpen;
    }

    // User deposits mapping
    mapping(address => uint256) public deposits;

    // User positions mapping
    mapping(address => Position) public positions;

    /**
     * @dev Constructor sets USDC address and owner
     * @param usdcAddress Address of USDC token
     */
    constructor(address usdcAddress) Ownable(msg.sender) {
        usdc = IERC20(usdcAddress);
    }

    /**
     * @dev Deposit USDC to vault
     * @param amount Amount to deposit (in USDC smallest units)
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        // Transfer USDC from user to vault
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Update user deposit balance
        deposits[msg.sender] += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @dev Withdraw user's deposit
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient deposit");

        // Update balance first (reentrancy protection)
        deposits[msg.sender] -= amount;

        // Transfer USDC to user
        usdc.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    // ... Keep existing openPosition, closePosition, _calculatePnL functions
    // ... Keep existing getBalance, hasOpenPosition view functions
    // ... Remove receive() external payable function

    /**
     * @dev Get vault USDC balance
     * @return Current vault USDC balance
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @dev Owner can withdraw USDC from vault (for emergency/emergency fees)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(usdc.balanceOf(address(this)) >= amount, "Vault balance insufficient");
        usdc.safeTransfer(to, amount);
    }
}
```

**Step 4: Run test to verify it passes**

Run: `cd contracts && npm test -- test/Vault.test.ts`
Expected: PASS (4/4 tests)

**Step 5: Commit**

```bash
cd contracts
git add contracts/Vault.sol test/Vault.test.ts
git commit -m "feat: modify Vault to support USDC deposits and withdrawals"
```

---

## Task 3: Create Deployment Script

**Files:**
- Create: `contracts/scripts/deposit-deploy.ts`

**Step 1: Write deployment script**

```typescript
// contracts/scripts/deposit-deploy.ts
import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🚀 Deploying MockUSDC and Vault...");

  // Deploy MockUSDC
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`✅ MockUSDC deployed to: ${usdcAddress}`);

  // Deploy Vault
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(usdcAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`✅ Vault deployed to: ${vaultAddress}`);

  // Save addresses to JSON file
  const deploymentInfo = {
    network: hre.network.name,
    mockUSDC: usdcAddress,
    vault: vaultAddress,
    deployedAt: new Date().toISOString(),
  };

  const deployPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deployPath)) {
    fs.mkdirSync(deployPath, { recursive: true });
  }

  const filePath = path.join(deployPath, `${hre.network.name}-deposit.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${filePath}`);

  // Mint test tokens to deployer
  const [deployer] = await hre.ethers.getSigners();
  const mintAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC
  await usdc.mint(deployer.address, mintAmount);
  const balance = await usdc.balanceOf(deployer.address);
  console.log(`💰 Minted ${hre.ethers.formatUnits(mintAmount, 6)} USDC to deployer`);
  console.log(`   Deployer USDC balance: ${hre.ethers.formatUnits(balance, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Step 2: Run deployment script**

Run: `cd contracts && npx hardhat run scripts/deposit-deploy.ts --network localhost`
Expected: Output showing deployed addresses and minted tokens

**Step 3: Commit**

```bash
cd contracts
git add scripts/deposit-deploy.ts deployments/
git commit -m "chore: add deployment script for USDC deposit system"
```

---

## Task 4: Create Frontend Contract Hooks

**Files:**
- Create: `frontend/app/hooks/useUSDCBalance.ts`
- Create: `frontend/app/hooks/useVaultAllowance.ts`
- Create: `frontend/app/hooks/useApprove.ts`
- Create: `frontend/app/hooks/useDeposit.ts`
- Create: `frontend/app/hooks/useWithdraw.ts`

**Step 1: Check existing contract configuration**

Read `frontend/app/wagmi.ts` to understand current setup.

**Step 2: Create contract address config**

```typescript
// frontend/app/contracts.ts
export const CONTRACTS = {
  // Update these after deployment
  USDC: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x0000000000000000000000000000000000000000",
  VAULT: process.env.NEXT_PUBLIC_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000",
} as const;

export const USDC_ABI = [
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const VAULT_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "deposits",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

**Step 3: Create hooks**

```typescript
// frontend/app/hooks/useUSDCBalance.ts
import { useReadContract } from 'wagmi';
import { USDC_ABI, CONTRACTS } from '../contracts';

export function useUSDCBalance(address: string | undefined) {
  return useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });
}
```

```typescript
// frontend/app/hooks/useVaultAllowance.ts
import { useReadContract } from 'wagmi';
import { USDC_ABI, CONTRACTS } from '../contracts';

export function useVaultAllowance(address: string | undefined) {
  return useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [address, CONTRACTS.VAULT],
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });
}
```

```typescript
// frontend/app/hooks/useApprove.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { USDC_ABI, CONTRACTS } from '../contracts';

export function useApprove() {
  const { writeContract, data: hash, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const approve = (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [CONTRACTS.VAULT, amount],
    });
  };

  return {
    approve,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  };
}
```

```typescript
// frontend/app/hooks/useDeposit.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VAULT_ABI, CONTRACTS } from '../contracts';

export function useDeposit() {
  const { writeContract, data: hash, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const deposit = (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [amount],
    });
  };

  return {
    deposit,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  };
}
```

```typescript
// frontend/app/hooks/useWithdraw.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VAULT_ABI, CONTRACTS } from '../contracts';

export function useWithdraw() {
  const { writeContract, data: hash, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [amount],
    });
  };

  return {
    withdraw,
    hash,
    isConfirming,
    isConfirmed,
    ...rest
  };
}
```

**Step 4: Create environment file**

```bash
# frontend/.env.local
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
```

**Step 5: Commit**

```bash
cd frontend
git add app/hooks/ app/contracts.ts .env.local
git commit -m "feat: add USDC deposit hooks for wagmi"
```

---

## Task 5: Update Deposit Page UI

**Files:**
- Modify: `frontend/app/deposit/page.tsx`

**Step 1: Rewrite deposit page with full functionality**

```typescript
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Navigation } from '../components/Navigation';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useVaultAllowance } from '../hooks/useVaultAllowance';
import { useApprove } from '../hooks/useApprove';
import { useDeposit } from '../hooks/useDeposit';
import { useVaultAllowance } from '../hooks/useVaultAllowance';

export default function DepositPage() {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState('');

  // Read contract state
  const { data: balance } = useUSDCBalance(address);
  const { data: allowance } = useVaultAllowance(address);

  // Write contract state
  const { approve, hash: approveHash, isConfirming: isApproving, isConfirmed: isApproveConfirmed, error: approveError } = useApprove();
  const { deposit, hash: depositHash, isConfirming: isDepositing, isConfirmed: isDepositConfirmed, error: depositError } = useDeposit();

  const handleMaxClick = () => {
    if (balance) {
      setAmount(balance.toString());
    }
  };

  const handleApprove = async () => {
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1000000)); // 6 decimals
    await approve(amountWei);
  };

  const handleDeposit = async () => {
    const amountWei = BigInt(Math.floor(parseFloat(amount) * 1000000)); // 6 decimals
    await deposit(amountWei);
  };

  const isApproved = allowance && balance && BigInt(allowance) >= BigInt(amount);
  const isApproveDisabled = !amount || parseFloat(amount) <= 0 || (allowance && BigInt(allowance) >= BigInt(amount));
  const isDepositDisabled = !amount || parseFloat(amount) <= 0 || !isApproved;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--background-primary)]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-xl text-[var(--text-secondary)]">
              Connect your wallet to deposit
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center">
          Deposit USDC
        </h1>

        {/* Balance Card */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Available Balance</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {balance ? `${(Number(balance) / 1000000).toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Vault Allowance</p>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {allowance ? `${(Number(allowance) / 1000000).toFixed(2)} USDC` : '0.00 USDC'}
              </p>
            </div>
          </div>
        </div>

        {/* Deposit Form */}
        <div className="bg-[var(--background-secondary)] border border-[var(--border-default)] rounded-lg p-6 mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Deposit Amount
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-4 py-3 bg-[var(--background-tertiary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-lg"
              min="0"
              step="0.01"
            />
            <button
              onClick={handleMaxClick}
              className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded hover:bg-[var(--accent-blue-hover)] transition-colors"
            >
              Max
            </button>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">Enter amount in USDC</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Approve Button */}
          <button
            onClick={handleApprove}
            disabled={isApproveDisabled || isApproving || isApproveConfirmed}
            className="w-full py-4 rounded-lg font-semibold transition-colors
              ${isApproveDisabled
                ? 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
                : isApproving
                  ? 'bg-[var(--accent-blue)]/50 text-white cursor-wait'
                  : isApproveConfirmed
                    ? 'bg-green-600 text-white'
                    : 'bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)]'
              }"
          >
            {isApproving ? 'Approving...' : isApproveConfirmed ? '✓ Approved' : `Approve ${amount || '0'} USDC`}
          </button>

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={isDepositDisabled || isDepositing || isDepositConfirmed}
            className="w-full py-4 rounded-lg font-semibold transition-colors
              ${isDepositDisabled
                ? 'bg-[var(--background-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
                : isDepositing
                  ? 'bg-[var(--accent-green)]/50 text-white cursor-wait'
                  : isDepositConfirmed
                    ? 'bg-green-600 text-white'
                    : 'bg-[var(--accent-green)] text-white hover:bg-[var(--accent-green-hover)]'
              }"
          >
            {isDepositing ? 'Depositing...' : isDepositConfirmed ? '✓ Deposited' : `Deposit ${amount || '0'} USDC`}
          </button>
        </div>

        {/* Error Messages */}
        {(approveError || depositError) && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-900 rounded-lg">
            <p className="text-red-400 text-sm">
              {approveError?.message || depositError?.message}
            </p>
          </div>
        )}

        {/* Transaction Status */}
        {(isApproving || isDepositing || isApproveConfirmed || isDepositConfirmed) && (
          <div className="mt-4 p-4 bg-[var(--background-tertiary)] rounded-lg">
            {isApproving && <p className="text-[var(--text-secondary)]">Waiting for approval confirmation...</p>}
            {isDepositing && <p className="text-[var(--text-secondary)]">Waiting for deposit confirmation...</p>}
            {isApproveConfirmed && <p className="text-green-400">✓ Approval confirmed! You can now deposit.</p>}
            {isDepositConfirmed && <p className="text-green-400">✓ Deposit successful!</p>}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd frontend
git add app/deposit/page.tsx
git commit -m "feat: implement interactive USDC deposit page with approve/deposit flow"
```

---

## Task 6: Add E2E Tests for Deposit Flow

**Files:**
- Modify: `e2e/deposit.spec.ts`

**Step 1: Write E2E test**

```typescript
// e2e/deposit.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Deposit Page', () => {
  test('should display deposit page with wallet connection prompt', async ({ page }) => {
    await page.goto('/deposit');

    await expect(page).toHaveTitle(/Perpetual/);
    await expect(page.getByText('Connect your wallet to deposit')).toBeVisible();
  });

  test('should display deposit form after wallet connection', async ({ page }) => {
    // Mock the wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539';
          }
          if (method === 'eth_accounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/deposit');
    await page.waitForTimeout(500);

    // Verify balance display
    await expect(page.getByText('Available Balance')).toBeVisible();
    await expect(page.getByText('Vault Allowance')).toBeVisible();

    // Verify deposit form
    await expect(page.getByLabel('Deposit Amount')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Max' })).toBeVisible();
  });

  test('should enable approve and deposit buttons', async ({ page }) => {
    // Mock the wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539';
          }
          if (method === 'eth_accounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/deposit');
    await page.waitForTimeout(500);

    // Enter amount
    const amountInput = page.getByLabel('Deposit Amount');
    await amountInput.fill('100');

    // Approve button should be enabled
    const approveButton = page.getByRole('button', { name: /Approve/ });
    await expect(approveButton).toBeEnabled();

    // Deposit button should be disabled until approved
    const depositButton = page.getByRole('button', { name: /Deposit/ });
    await expect(depositButton).toBeDisabled();
  });

  test('should show validation error for invalid amount', async ({ page }) => {
    // Mock the wallet connection
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          if (method === 'eth_chainId') {
            return '0x539';
          }
          if (method === 'eth_accounts') {
            return ['0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'];
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/deposit');
    await page.waitForTimeout(500);

    // Enter negative amount
    const amountInput = page.getByLabel('Deposit Amount');
    await amountInput.fill('-100');

    // Approve button should be disabled
    const approveButton = page.getByRole('button', { name: /Approve/ });
    await expect(approveButton).toBeDisabled();
  });
});
```

**Step 2: Run E2E tests**

Run: `npm run test:e2e -- e2e/deposit.spec.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add e2e/deposit.spec.ts
git commit -m "test: add E2E tests for USDC deposit flow"
```

---

## Task 7: Update Environment Configuration

**Files:**
- Modify: `frontend/.env.local`
- Modify: `docker-compose.yml` (if needed)

**Step 1: Update frontend environment**

Add to `.env.local`:
```bash
NEXT_PUBLIC_USDC_ADDRESS=<deployed_USDC_address>
NEXT_PUBLIC_VAULT_ADDRESS=<deployed_Vault_address>
```

**Step 2: Update deployment documentation**

```bash
git add frontend/.env.local
git commit -m "chore: add USDC and Vault contract addresses to environment"
```

---

## Deployment Checklist

```bash
# 1. Deploy contracts
cd contracts
npx hardhat node  # In terminal 1
npx hardhat run scripts/deposit-deploy.ts --network localhost

# 2. Copy contract addresses to frontend/.env.local
# 3. Start frontend
cd frontend
npm run dev

# 4. Test deposit flow
# - Connect wallet
# - Enter amount
# - Click Approve
# - Wait for confirmation
# - Click Deposit
# - Verify balance updates
```

---

## Testing Checklist

- [ ] MockUSDC tests pass (3/3)
- [ ] Vault tests pass (4/4)
- [ ] Deployment script runs successfully
- [ ] E2E deposit tests pass (4/4)
- [ ] Manual deposit flow works in browser

---

## Success Criteria

1. ✅ MockUSDC contract deployed and tested
2. ✅ Vault contract modified for USDC support and tested
3. ✅ Frontend hooks created for contract interaction
4. ✅ Deposit page UI updated with approve/deposit flow
5. ✅ E2E tests verify deposit functionality
6. ✅ Environment configuration complete
