import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault, MockUSDC, MockPriceFeed } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault Phase 2 - Oracle, Fees, Solvency, Liquidation", function () {
  let vault: Vault;
  let mockUSDC: MockUSDC;
  let mockPriceFeed: MockPriceFeed;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const INITIAL_PRICE = 3000_00000000n; // 3000 with 8 decimals

  function parseUSDC(amount: string): bigint {
    return ethers.parseUnits(amount, USDC_DECIMALS);
  }

  function parsePrice(price: string): bigint {
    return ethers.parseUnits(price, 8);
  }

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    const MockPriceFeedFactory = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeedFactory.deploy(INITIAL_PRICE);
    await mockPriceFeed.waitForDeployment();

    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(await mockUSDC.getAddress(), await mockPriceFeed.getAddress());
    await vault.waitForDeployment();
  });

  describe("Price Oracle Validation", function () {
    beforeEach(async function () {
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));
    });

    it("should accept price within allowed deviation (5%)", async function () {
      // Oracle price is 3000, allow up to 5% deviation
      const maxPrice = parsePrice("3150"); // 3000 * 1.05
      const minPrice = parsePrice("2850"); // 3000 * 0.95

      // Should accept max allowed price
      await expect(vault.connect(user1).openPosition(0, parseUSDC("100"), maxPrice))
        .to.not.be.reverted;

      // Close the first position
      const positionIds = await vault.getUserPositionIds(user1.address);
      if (positionIds.length > 0) {
        await vault.connect(user1).closePosition(positionIds[0]);
      }

      // Should accept min allowed price
      await expect(vault.connect(user1).openPosition(0, parseUSDC("100"), minPrice))
        .to.not.be.reverted;
    });

    it("should reject price above maximum deviation", async function () {
      // Oracle price is 3000, 5% deviation = max 3150
      const tooHighPrice = parsePrice("3200"); // > 5% deviation

      await expect(
        vault.connect(user1).openPosition(0, parseUSDC("100"), tooHighPrice)
      ).to.be.revertedWithCustomError(vault, "PriceDeviationTooHigh");
    });

    it("should reject price below minimum deviation", async function () {
      // Oracle price is 3000, 5% deviation = min 2850
      const tooLowPrice = parsePrice("2800"); // < -5% deviation

      await expect(
        vault.connect(user1).openPosition(0, parseUSDC("100"), tooLowPrice)
      ).to.be.revertedWithCustomError(vault, "PriceDeviationTooHigh");
    });

    it("should use oracle price for closing positions", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      // Add buffer funds for solvency
      await mockUSDC.mint(owner.address, parseUSDC("500"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("500"));

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID from user's positions
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Change oracle price
      await mockPriceFeed.setPrice(Number(parsePrice("3100")));

      // Close should use new oracle price
      await expect(vault.connect(user1).closePosition(positionId))
        .to.emit(vault, "PositionClosed");
    });
  });

  describe("Fee Mechanism", function () {
    beforeEach(async function () {
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));
    });

    it("should charge 0.1% open fee", async function () {
      const positionSize = parseUSDC("500");
      const expectedFee = (positionSize * 10n) / 10000n; // 0.1% = 0.5 USDC

      const tx = await vault.connect(user1).openPosition(0, positionSize, parsePrice("3000"));
      const receipt = await tx.wait();

      const positionOpenedEvent = receipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionOpened";
        } catch {
          return false;
        }
      });

      expect(positionOpenedEvent?.args?.fee).to.equal(expectedFee);
      expect(await vault.totalFeesCollected()).to.equal(expectedFee);
    });

    it("should calculate open fee correctly via view function", async function () {
      const positionSize = parseUSDC("1000");
      const expectedFee = (positionSize * 10n) / 10000n; // 1 USDC

      const fee = await vault.calculateOpenFee(positionSize);
      expect(fee).to.equal(expectedFee);
    });

    it("should charge close fee only on profitable positions", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      // Add funds for solvency
      await mockUSDC.mint(owner.address, parseUSDC("500"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("500"));

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Set profitable exit price
      await mockPriceFeed.setPrice(Number(parsePrice("3100")));

      const closeTx = await vault.connect(user1).closePosition(positionId);
      const closeReceipt = await closeTx.wait();

      const positionClosedEvent = closeReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionClosed";
        } catch {
          return false;
        }
      });

      // Fee should be charged on profit
      expect(positionClosedEvent?.args?.fee).to.be.greaterThan(0);
    });

    it("should not charge close fee on losing positions", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Set losing exit price
      await mockPriceFeed.setPrice(Number(parsePrice("2900")));

      const closeTx = await vault.connect(user1).closePosition(positionId);
      const closeReceipt = await closeTx.wait();

      const positionClosedEvent = closeReceipt?.logs.find((log: any) => {
        try {
          const parsed = vault.interface.parseLog(log);
          return parsed?.name === "PositionClosed";
        } catch {
          return false;
        }
      });

      // No fee on loss
      expect(positionClosedEvent?.args?.fee).to.equal(0);
    });

    it("should calculate close fee correctly via view function", async function () {
      const profit = parseUSDC("100");
      const expectedFee = (profit * 10n) / 10000n; // 0.1% = 0.01 USDC

      const fee = await vault.calculateCloseFee(profit);
      expect(fee).to.equal(expectedFee);

      // Zero fee for loss
      const loss = -BigInt(parseUSDC("100"));
      const lossFee = await vault.calculateCloseFee(loss);
      expect(lossFee).to.equal(0);
    });
  });

  describe("Solvency Check", function () {
    it("should revert close when vault cannot pay profits", async function () {
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Set very profitable price (would require more than vault has)
      await mockPriceFeed.setPrice(Number(parsePrice("6000"))); // 2x price = ~500 USDC profit

      // Should revert because vault doesn't have enough
      await expect(vault.connect(user1).closePosition(positionId))
        .to.be.revertedWithCustomError(vault, "InsufficientSolvency");
    });

    it("should allow close when vault has sufficient funds", async function () {
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      // Add buffer funds
      await mockUSDC.mint(owner.address, parseUSDC("1000"));
      await mockUSDC.connect(owner).transfer(await vault.getAddress(), parseUSDC("1000"));

      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Set profitable price
      await mockPriceFeed.setPrice(Number(parsePrice("3100")));

      // Should succeed with buffer funds
      await expect(vault.connect(user1).closePosition(positionId))
        .to.emit(vault, "PositionClosed");
    });
  });

  describe("Liquidation Mechanism", function () {
    beforeEach(async function () {
      await mockUSDC.mint(user1.address, parseUSDC("1000"));
      await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user1).deposit(parseUSDC("1000"));

      await mockUSDC.mint(user2.address, parseUSDC("1000"));
      await mockUSDC.connect(user2).approve(await vault.getAddress(), parseUSDC("1000"));
      await vault.connect(user2).deposit(parseUSDC("1000"));
    });

    it("should prevent liquidation of healthy position", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Position is healthy at entry price
      await expect(
        vault.connect(user2).liquidate(positionId, user1.address)
      ).to.be.revertedWithCustomError(vault, "HealthyPosition");
    });

    it("should allow liquidation of unhealthy position", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Move price against position (long position, price goes down)
      // Maintenance margin is 5%, so position becomes unhealthy when loss > 95% of margin
      await mockPriceFeed.setPrice(Number(parsePrice("100"))); // Massive drop

      // Should allow liquidation
      await expect(vault.connect(user2).liquidate(positionId, user1.address))
        .to.emit(vault, "PositionLiquidated");
    });

    it("should reward liquidator", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Move price to make position unhealthy
      await mockPriceFeed.setPrice(Number(parsePrice("100")));

      const user2BalanceBefore = await vault.deposits(user2.address);

      await vault.connect(user2).liquidate(positionId, user1.address);

      const user2BalanceAfter = await vault.deposits(user2.address);

      // Liquidator should receive reward
      expect(user2BalanceAfter).to.be.greaterThan(user2BalanceBefore);
    });

    it("should return health factor for position", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Health factor should be high for healthy position
      const healthFactor = await vault.getHealthFactor(positionId);
      expect(healthFactor).to.be.greaterThan(10000); // 10000 = 1.0
    });

    it("should release locked deposits on liquidation", async function () {
      const positionSize = parseUSDC("500");
      const entryPrice = parsePrice("3000");

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Get position ID
      const positionIds = await vault.getUserPositionIds(user1.address);
      const positionId = positionIds[positionIds.length - 1];

      // Locked deposits before
      expect(await vault.lockedDeposits(user1.address)).to.equal(positionSize);

      // Make position unhealthy and liquidate
      await mockPriceFeed.setPrice(Number(parsePrice("100")));
      await vault.connect(user2).liquidate(positionId, user1.address);

      // Locked deposits should be released
      expect(await vault.lockedDeposits(user1.address)).to.equal(0);
    });
  });

  describe("Price Feed Management", function () {
    it("should allow owner to update price feed", async function () {
      const newPriceFeed = await (await ethers.getContractFactory("MockPriceFeed"))
        .deploy(parsePrice("3500"));
      await newPriceFeed.waitForDeployment();

      await expect(vault.setPriceFeed(await newPriceFeed.getAddress()))
        .to.emit(vault, "PriceFeedUpdated");

      expect(await vault.priceFeed()).to.equal(await newPriceFeed.getAddress());
    });

    it("should reject non-owner updating price feed", async function () {
      const newPriceFeed = await (await ethers.getContractFactory("MockPriceFeed"))
        .deploy(parsePrice("3500"));
      await newPriceFeed.waitForDeployment();

      await expect(
        vault.connect(user1).setPriceFeed(await newPriceFeed.getAddress())
      ).to.be.reverted;
    });

    it("should reject zero address for price feed", async function () {
      await expect(
        vault.setPriceFeed(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "InvalidPriceFeedAddress");
    });
  });
});
