import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault", function () {
  let vault: Vault;
  let mockUSDC: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const USDC_DECIMALS = 6;

  function parseUSDC(amount: string): bigint {
    return ethers.parseUnits(amount, USDC_DECIMALS);
  }

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MockUSDC first
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy Vault with MockUSDC address
    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(await mockUSDC.getAddress());
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

      await expect(vault.connect(user1).deposit(depositAmount))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, depositAmount);
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
      await expect(vault.connect(user1).deposit(0)).to.be.revertedWith("Amount must be > 0");
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

      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.emit(vault, "Withdraw")
        .withArgs(user1.address, withdrawAmount);
    });

    it("should reject withdrawal exceeding user's deposit", async function () {
      const overdraftAmount = parseUSDC("2000");

      await expect(vault.connect(user1).withdraw(overdraftAmount))
        .to.be.revertedWith("Insufficient deposit");
    });

    it("should reject zero amount withdrawal", async function () {
      await expect(vault.connect(user1).withdraw(0))
        .to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Owner Functions", function () {
    beforeEach(async function () {
      // Mint USDC to user and deposit into vault
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));
    });

    it("should allow owner to withdraw USDC from vault", async function () {
      const withdrawAmount = parseUSDC("500");

      const ownerBalanceBefore = await mockUSDC.balanceOf(owner.address);
      const vaultBalanceBefore = await mockUSDC.balanceOf(await vault.getAddress());

      await vault.withdrawUSDC(owner.address, withdrawAmount);

      const ownerBalanceAfter = await mockUSDC.balanceOf(owner.address);
      const vaultBalanceAfter = await mockUSDC.balanceOf(await vault.getAddress());

      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + withdrawAmount);
      expect(vaultBalanceAfter).to.equal(vaultBalanceBefore - withdrawAmount);
    });

    it("should reject non-owner trying to withdraw from vault", async function () {
      await expect(
        vault.connect(user1).withdrawUSDC(user1.address, parseUSDC("500"))
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

    it("should open a long position", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parseUSDC("3000");

      // User deposits
      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open long position
      await vault.connect(user1).openPosition(
        0, // 0 = Long, 1 = Short
        positionSize,
        price
      );

      const position = await vault.positions(user1.address);
      expect(position.size).to.equal(positionSize);
      expect(position.entryPrice).to.equal(price);
      expect(position.isLong).to.equal(true);
    });

    it("should open a short position", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parseUSDC("3000");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      await vault.connect(user1).openPosition(
        1, // Short
        positionSize,
        price
      );

      const position = await vault.positions(user1.address);
      expect(position.isLong).to.equal(false);
    });

    it("should close position and calculate PnL", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parseUSDC("3000");
      const exitPrice = parseUSDC("3100"); // Price went up

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      await vault.connect(user1).openPosition(
        0, // Long
        positionSize,
        entryPrice
      );

      // Close position at higher price (profit for long)
      await vault.connect(user1).closePosition(
        0, // Long
        positionSize,
        exitPrice
      );

      // User should have profit
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.greaterThan(depositAmount);
    });

    it("should emit PositionOpened event", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parseUSDC("3000");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      await expect(vault.connect(user1).openPosition(0, positionSize, price))
        .to.emit(vault, "PositionOpened")
        .withArgs(user1.address, true, positionSize, price);
    });

    it("should emit PositionClosed event", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parseUSDC("3000");
      const exitPrice = parseUSDC("3100");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      await expect(vault.connect(user1).closePosition(0, positionSize, exitPrice))
        .to.emit(vault, "PositionClosed");
    });

    it("should reject invalid position type", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await expect(
        vault.connect(user1).openPosition(2, parseUSDC("500"), parseUSDC("3000"))
      ).to.be.revertedWith("Invalid position type");
    });

    it("should reject zero size position", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await expect(
        vault.connect(user1).openPosition(0, 0, parseUSDC("3000"))
      ).to.be.revertedWith("Size must be > 0");
    });

    it("should reject zero price position", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await expect(
        vault.connect(user1).openPosition(0, parseUSDC("500"), 0)
      ).to.be.revertedWith("Price must be > 0");
    });

    it("should reject closing non-existent position", async function () {
      await expect(
        vault.connect(user1).closePosition(0, parseUSDC("500"), parseUSDC("3000"))
      ).to.be.reverted;
    });

    it("should reject position type mismatch on close", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const price = parseUSDC("3000");

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open long position
      await vault.connect(user1).openPosition(0, positionSize, price);

      // Try to close as short (mismatch)
      await expect(
        vault.connect(user1).closePosition(1, positionSize, price)
      ).to.be.reverted;
    });

    it("should handle short position profit correctly", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parseUSDC("3000");
      const exitPrice = parseUSDC("2900"); // Price went down

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open short position
      await vault.connect(user1).openPosition(1, positionSize, entryPrice);

      // Close position at lower price (profit for short)
      await vault.connect(user1).closePosition(1, positionSize, exitPrice);

      // User should have profit
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.greaterThan(depositAmount);
    });

    it("should handle long position loss correctly", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parseUSDC("3000");
      const exitPrice = parseUSDC("2900"); // Price went down

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open long position
      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Close position at lower price (loss for long)
      await vault.connect(user1).closePosition(0, positionSize, exitPrice);

      // User should have loss
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.lessThan(depositAmount);
    });

    it("should handle short position loss correctly", async function () {
      const depositAmount = parseUSDC("1000");
      const positionSize = parseUSDC("500");
      const entryPrice = parseUSDC("3000");
      const exitPrice = parseUSDC("3100"); // Price went up

      await mockUSDC.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      // Open short position
      await vault.connect(user1).openPosition(1, positionSize, entryPrice);

      // Close position at higher price (loss for short)
      await vault.connect(user1).closePosition(1, positionSize, exitPrice);

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
        parseUSDC("3000")
      );

      expect(await vault.hasOpenPosition(user1.address)).to.equal(true);
    });

    it("should return false for hasOpenPosition after position closed", async function () {
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await vault.connect(user1).openPosition(
        0,
        parseUSDC("500"),
        parseUSDC("3000")
      );

      await vault.connect(user1).closePosition(
        0,
        parseUSDC("500"),
        parseUSDC("3100")
      );

      expect(await vault.hasOpenPosition(user1.address)).to.equal(false);
    });
  });
});
