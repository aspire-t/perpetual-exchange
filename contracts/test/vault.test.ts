import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault, MockUSDC, MockPriceFeed } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault", function () {
  let vault: Vault;
  let mockUSDC: MockUSDC;
  let mockPriceFeed: MockPriceFeed;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const INITIAL_PRICE = 3000_00000000n; // 3000 with 8 decimals (Chainlink standard)

  function parseUSDC(amount: string): bigint {
    return ethers.parseUnits(amount, USDC_DECIMALS);
  }

  function parsePrice(price: string): bigint {
    // Chainlink prices use 8 decimals
    return ethers.parseUnits(price, 8);
  }

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockUSDC first
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy MockPriceFeed
    const MockPriceFeedFactory = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeedFactory.deploy(INITIAL_PRICE);
    await mockPriceFeed.waitForDeployment();

    // Deploy Vault with MockUSDC and MockPriceFeed addresses
    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(await mockUSDC.getAddress(), await mockPriceFeed.getAddress());
    await vault.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await vault.getAddress()).to.be.properAddress;
    });

    it("should set the deployer as owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("should set the correct USDC address", async function () {
      expect(await vault.usdc()).to.equal(await mockUSDC.getAddress());
    });

    it("should have immutable usdc address", async function () {
      expect(await vault.usdc()).to.equal(await mockUSDC.getAddress());
    });
  });

  describe("Deposits", function () {
    beforeEach(async function () {
      // Mint USDC to users for testing
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.mint(user2.address, parseUSDC("1000"));
    });

    it("should accept USDC deposit", async function () {
      const depositAmount = parseUSDC("100");

      // Approve vault to spend USDC
      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);

      // Deposit
      await vault.connect(user1).deposit(depositAmount);

      expect(await mockUSDC.balanceOf(await vault.getAddress())).to.equal(
        depositAmount
      );
    });

    it("should emit Deposit event on USDC deposit", async function () {
      const depositAmount = parseUSDC("50");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);

      const tx = await vault.connect(user1).deposit(depositAmount);
      const receipt = await tx.wait();

      // Check event with timestamp
      const depositEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "Deposit";
        } catch {
          return false;
        }
      });
      expect(depositEvent).to.exist;
    });

    it("should track user deposits", async function () {
      const depositAmount = parseUSDC("200");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.equal(depositAmount);
    });

    it("should accumulate multiple deposits from same user", async function () {
      const deposit1 = parseUSDC("100");
      const deposit2 = parseUSDC("50");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), deposit1 + deposit2);

      await vault.connect(user1).deposit(deposit1);
      await vault.connect(user1).deposit(deposit2);

      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.equal(deposit1 + deposit2);
    });

    it("should reject zero amount deposit", async function () {
      await expect(vault.connect(user1).deposit(0))
        .to.be.revertedWithCustomError(vault, "AmountZero");
    });

    it("should reject deposit without approval", async function () {
      const depositAmount = parseUSDC("100");

      await expect(vault.connect(user1).deposit(depositAmount)).to.be.reverted;
    });

    it("should reject deposit exceeding allowance", async function () {
      const depositAmount = parseUSDC("100");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("50"));

      await expect(vault.connect(user1).deposit(depositAmount)).to.be.reverted;
    });

    it("should update totalUserDeposits on deposit", async function () {
      const depositAmount = parseUSDC("200");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      expect(await vault.totalUserDeposits()).to.equal(depositAmount);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Mint USDC to users and setup deposits
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));
    });

    it("should allow user to withdraw their deposit", async function () {
      const withdrawAmount = parseUSDC("500");

      const userBalanceBefore = await mockUSDC.balanceOf(user1.address);
      const vaultBalanceBefore = await mockUSDC.balanceOf(await vault.getAddress());

      await vault.connect(user1).withdraw(withdrawAmount);

      const userBalanceAfter = await mockUSDC.balanceOf(user1.address);
      const vaultBalanceAfter = await mockUSDC.balanceOf(await vault.getAddress());

      expect(userBalanceAfter).to.equal(userBalanceBefore + withdrawAmount);
      expect(vaultBalanceAfter).to.equal(vaultBalanceBefore - withdrawAmount);
    });

    it("should emit Withdraw event on withdrawal", async function () {
      const withdrawAmount = parseUSDC("300");

      const tx = await vault.connect(user1).withdraw(withdrawAmount);
      const receipt = await tx.wait();

      // Check event with timestamp
      const withdrawEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "Withdraw";
        } catch {
          return false;
        }
      });
      expect(withdrawEvent).to.exist;
    });

    it("should reject withdrawal exceeding user's deposit", async function () {
      const overdraftAmount = parseUSDC("2000");

      await expect(vault.connect(user1).withdraw(overdraftAmount))
        .to.be.revertedWithCustomError(vault, "InsufficientDeposit");
    });

    it("should reject zero amount withdrawal", async function () {
      await expect(vault.connect(user1).withdraw(0))
        .to.be.revertedWithCustomError(vault, "AmountZero");
    });

    it("should reject withdrawal when amount is locked in position", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Try to withdraw more than available (1000 - 500 = 500 available)
      await expect(vault.connect(user1).withdraw(parseUSDC("600")))
        .to.be.revertedWithCustomError(vault, "InsufficientDeposit");
    });

    it("should allow withdrawal of unlocked deposit only", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");
      const openFee = (positionSize * 10n) / 10000n; // 0.1% = 0.5 USDC

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Available = deposits (1000 - 0.5 fee) - lockedDeposits (500) = 499.5
      const availableDeposit = parseUSDC("1000") - openFee - positionSize;
      await vault.connect(user1).withdraw(availableDeposit);

      expect(await vault.deposits(user1.address)).to.equal(positionSize);
      expect(await vault.lockedDeposits(user1.address)).to.equal(positionSize);
    });
  });

  describe("Owner Functions", function () {
    beforeEach(async function () {
      // Mint USDC to user and deposit into vault
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));
    });

    it("should allow owner to withdraw fees (non-user deposits)", async function () {
      // Initially, all deposits are user deposits, so owner cannot withdraw
      await expect(
        vault.withdrawFees(owner.address, parseUSDC("100"))
      ).to.be.revertedWithCustomError(vault, "InsufficientFeeBalance");

      // Add some fees by minting extra USDC to vault directly (simulated)
      // In real scenario, this would come from trading fees
      await mockUSDC.mint(owner.address, parseUSDC("100"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("100"));

      // Now owner can withdraw the fee (100 USDC extra)
      await vault.withdrawFees(owner.address, parseUSDC("100"));
    });

    it("should reject non-owner trying to withdraw fees", async function () {
      await expect(
        vault.connect(user1).withdrawFees(user1.address, parseUSDC("500"))
      ).to.be.reverted;
    });

    it("should allow owner to transfer ownership", async function () {
      await vault.transferOwnership(user1.address);
      expect(await vault.owner()).to.equal(user1.address);
    });
  });

  describe("Position Management", function () {
    beforeEach(async function () {
      // Mint USDC to users for testing
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.mint(user2.address, parseUSDC("1000"));
    });

    it("should open a long position with position ID", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parsePrice("3000");

      // User deposits
      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open long position and get position ID
      const tx = await vault.connect(user1).openPosition(0, positionSize, price);
      const receipt = await tx.wait();

      // Extract positionId from event
      const positionOpenedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      expect(positionOpenedEvent).to.exist;

      // Check locked deposits
      expect(await vault.lockedDeposits(user1.address)).to.equal(positionSize);

      // Check user position IDs
      const positionIds = await vault.getUserPositionIds(user1.address);
      expect(positionIds.length).to.equal(1);
    });

    it("should open a short position", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parsePrice("3000");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      await vault.connect(user1).openPosition(1, positionSize, price);

      const positionIds = await vault.getUserPositionIds(user1.address);
      const position = await vault.getPosition(positionIds[0]);

      expect(position.isLong).to.equal(false);
      expect(position.size).to.equal(positionSize);
    });

    it("should support multiple positions per user", async function () {
      const depositAmount = parseUSDC("2000");
      const positionSize1 = parseUSDC("500");
      const positionSize2 = parseUSDC("300");
      const price = parsePrice("3000");

      await mockUSDC.mint(user1.address, depositAmount);
      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open first position
      await vault.connect(user1).openPosition(0, positionSize1, price);

      // Open second position
      await vault.connect(user1).openPosition(1, positionSize2, price);

      const positionIds = await vault.getUserPositionIds(user1.address);
      expect(positionIds.length).to.equal(2);

      // Check both positions exist
      const pos1 = await vault.getPosition(positionIds[0]);
      const pos2 = await vault.getPosition(positionIds[1]);

      expect(pos1.isLong).to.equal(true);
      expect(pos2.isLong).to.equal(false);

      // Check locked deposits
      expect(await vault.lockedDeposits(user1.address)).to.equal(positionSize1 + positionSize2);
    });

    it("should close position and calculate PnL", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");
      const exitPrice = parsePrice("3100"); // Price went up

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Add extra funds to vault for solvency (to cover potential profits)
      await mockUSDC.mint(owner.address, parseUSDC("500"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("500"));

      // Open position
      const openTx = await vault.connect(user1).openPosition(0, positionSize, entryPrice);
      const openReceipt = await openTx.wait();

      const positionOpenedEvent = openReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      // Extract positionId from event
      const positionId = positionOpenedEvent?.args?.positionId;

      // Close position at higher price (profit for long)
      // Set mock price feed to exit price
      await mockPriceFeed.setPrice(Number(exitPrice));
      await vault.connect(user1).closePosition(positionId);

      // User should have profit
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.greaterThan(depositAmount);

      // Locked deposits should be released
      expect(await vault.lockedDeposits(user1.address)).to.equal(0);
    });

    it("should emit PositionOpened event with correct fields", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parsePrice("3000");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      const tx = await vault.connect(user1).openPosition(0, positionSize, price);
      const receipt = await tx.wait();

      const positionOpenedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      expect(positionOpenedEvent).to.exist;
      expect(positionOpenedEvent?.args?.user).to.equal(user1.address);
      expect(positionOpenedEvent?.args?.isLong).to.equal(true);
      expect(positionOpenedEvent?.args?.size).to.equal(positionSize);
      expect(positionOpenedEvent?.args?.entryPrice).to.equal(price);
    });

    it("should emit PositionClosed event", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");
      const exitPrice = parsePrice("3100");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Add extra funds to vault for solvency
      await mockUSDC.mint(owner.address, parseUSDC("500"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("500"));

      const openTx = await vault.connect(user1).openPosition(0, positionSize, entryPrice);
      const openReceipt = await openTx.wait();

      const positionOpenedEvent = openReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      const positionId = positionOpenedEvent?.args?.positionId;

      // Set mock price feed to exit price
      await mockPriceFeed.setPrice(Number(exitPrice));
      const tx = await vault.connect(user1).closePosition(positionId);
      const receipt = await tx.wait();

      const positionClosedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionClosed";
        } catch {
          return false;
        }
      });

      expect(positionClosedEvent).to.exist;
    });

    it("should reject invalid position type", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await expect(
        vault.connect(user1).openPosition(2, parseUSDC("500"), parsePrice("3000"))
      ).to.be.revertedWithCustomError(vault, "InvalidPositionType");
    });

    it("should reject zero size position", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await expect(
        vault.connect(user1).openPosition(0, 0, parsePrice("3000"))
      ).to.be.revertedWithCustomError(vault, "AmountZero");
    });

    it("should reject zero price position", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await expect(
        vault.connect(user1).openPosition(0, parseUSDC("500"), 0)
      ).to.be.revertedWithCustomError(vault, "AmountZero");
    });

    it("should reject closing non-existent position", async function () {
      await expect(
        vault.connect(user1).closePosition(999)
      ).to.be.revertedWithCustomError(vault, "PositionNotOpen");
    });

    it("should handle short position profit correctly", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");
      const exitPrice = parsePrice("2900"); // Price went down

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Add extra funds to vault for solvency
      await mockUSDC.mint(owner.address, parseUSDC("500"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("500"));

      // Open short position
      const openTx = await vault.connect(user1).openPosition(1, positionSize, entryPrice);
      const openReceipt = await openTx.wait();

      const positionOpenedEvent = openReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      const positionId = positionOpenedEvent?.args?.positionId;

      // Set mock price feed to exit price (lower price = profit for short)
      await mockPriceFeed.setPrice(Number(exitPrice));
      // Close position at lower price (profit for short)
      await vault.connect(user1).closePosition(positionId);

      // User should have profit
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.greaterThan(depositAmount);
    });

    it("should handle long position loss correctly", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");
      const exitPrice = parsePrice("2900"); // Price went down

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open long position
      const openTx = await vault.connect(user1).openPosition(0, positionSize, entryPrice);
      const openReceipt = await openTx.wait();

      const positionOpenedEvent = openReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      const positionId = positionOpenedEvent?.args?.positionId;

      // Set mock price feed to exit price (lower price = loss for long)
      await mockPriceFeed.setPrice(Number(exitPrice));
      // Close position at lower price (loss for long)
      await vault.connect(user1).closePosition(positionId);

      // User should have loss
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.lessThan(depositAmount);
    });

    it("should handle short position loss correctly", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");
      const exitPrice = parsePrice("3100"); // Price went up

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open short position
      const openTx = await vault.connect(user1).openPosition(1, positionSize, entryPrice);
      const openReceipt = await openTx.wait();

      const positionOpenedEvent = openReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      const positionId = positionOpenedEvent?.args?.positionId;

      // Set mock price feed to exit price (higher price = loss for short)
      await mockPriceFeed.setPrice(Number(exitPrice));
      // Close position at higher price (loss for short)
      await vault.connect(user1).closePosition(positionId);

      // User should have loss
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.lessThan(depositAmount);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
    });

    it("should return vault USDC balance", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      const balance = await vault.getBalance();
      expect(balance).to.equal(parseUSDC("1000"));
    });

    it("should return false for hasOpenPosition when no position", async function () {
      expect(await vault.hasOpenPosition(user1.address)).to.equal(false);
    });

    it("should return true for hasOpenPosition when position exists", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await vault.connect(user1).openPosition(
        0,
        parseUSDC("500"),
        parsePrice("3000")
      );

      expect(await vault.hasOpenPosition(user1.address)).to.equal(true);
    });

    it("should return false for hasOpenPosition after position closed", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      // Add extra funds to vault for solvency
      await mockUSDC.mint(owner.address, parseUSDC("500"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("500"));

      const openTx = await vault.connect(user1).openPosition(
        0,
        parseUSDC("500"),
        parsePrice("3000")
      );
      const openReceipt = await openTx.wait();

      const positionOpenedEvent = openReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      const positionId = positionOpenedEvent?.args?.positionId;

      await mockPriceFeed.setPrice(3100_00000000);
      await vault.connect(user1).closePosition(
        positionId
      );

      expect(await vault.hasOpenPosition(user1.address)).to.equal(false);
    });

    it("should return available deposit (total - locked)", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      // Initially all available
      expect(await vault.getAvailableDeposit(user1.address)).to.equal(parseUSDC("1000"));

      // Open position locks some
      const positionSize = parseUSDC("500");
      const openFee = (positionSize * 10n) / 10000n; // 0.1% = 0.5 USDC
      await vault.connect(user1).openPosition(0, positionSize, parsePrice("3000"));

      // Available = deposits (1000 - 0.5 fee) - locked (500) = 499.5
      expect(await vault.getAvailableDeposit(user1.address)).to.equal(parseUSDC("1000") - openFee - positionSize);
    });
  });
});
