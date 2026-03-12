import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault", function () {
  let vault: Vault;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy();
    await vault.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await vault.getAddress()).to.be.properAddress;
    });

    it("should set the deployer as owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });
  });

  describe("Deposits", function () {
    it("should accept ETH deposit", async function () {
      const depositAmount = ethers.parseEther("1.0");

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(
        depositAmount
      );
    });

    it("should emit Deposit event on ETH deposit", async function () {
      const depositAmount = ethers.parseEther("0.5");

      await expect(
        user1.sendTransaction({
          to: await vault.getAddress(),
          value: depositAmount,
        })
      ).to.emit(vault, "Deposit").withArgs(user1.address, depositAmount);
    });

    it("should track user deposits", async function () {
      const depositAmount = ethers.parseEther("2.0");

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.equal(depositAmount);
    });

    it("should accumulate multiple deposits from same user", async function () {
      const deposit1 = ethers.parseEther("1.0");
      const deposit2 = ethers.parseEther("0.5");

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: deposit1,
      });

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: deposit2,
      });

      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.equal(deposit1 + deposit2);
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      // Setup: user makes a deposit
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1.0"),
      });
    });

    it("should allow user to withdraw their deposit", async function () {
      const userBalanceBefore = await ethers.provider.getBalance(user1.address);
      const vaultBalanceBefore = await ethers.provider.getBalance(
        await vault.getAddress()
      );

      const tx = await vault.connect(user1).withdraw(ethers.parseEther("0.5"));
      const receipt = await tx.wait();

      const userBalanceAfter = await ethers.provider.getBalance(user1.address);
      const vaultBalanceAfter = await ethers.provider.getBalance(
        await vault.getAddress()
      );

      // User balance should increase (minus gas fees)
      // Vault balance should decrease
      expect(vaultBalanceAfter).to.be.lessThan(vaultBalanceBefore);
    });

    it("should emit Withdraw event on withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("0.3");

      await expect(vault.connect(user1).withdraw(withdrawAmount))
        .to.emit(vault, "Withdraw")
        .withArgs(user1.address, withdrawAmount);
    });

    it("should reject withdrawal exceeding user's deposit", async function () {
      const overdraftAmount = ethers.parseEther("2.0"); // More than deposited

      await expect(
        vault.connect(user1).withdraw(overdraftAmount)
      ).to.be.reverted;
    });

    it("should reject withdrawal when vault has insufficient balance", async function () {
      // Drain the vault first
      await vault.connect(owner).withdrawEther(owner.address, ethers.parseEther("1.0"));

      // Now user tries to withdraw
      await expect(
        vault.connect(user1).withdraw(ethers.parseEther("0.5"))
      ).to.be.reverted;
    });
  });

  describe("Owner Functions", function () {
    it("should allow owner to withdraw ETH from vault", async function () {
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const vaultBalanceBefore = await ethers.provider.getBalance(
        await vault.getAddress()
      );

      await vault.withdrawEther(owner.address, ethers.parseEther("0.5"));

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      const vaultBalanceAfter = await ethers.provider.getBalance(
        await vault.getAddress()
      );

      expect(ownerBalanceAfter).to.be.greaterThan(ownerBalanceBefore);
      expect(vaultBalanceAfter).to.be.lessThan(vaultBalanceBefore);
    });

    it("should reject non-owner trying to withdraw from vault", async function () {
      await expect(
        vault.connect(user1).withdrawEther(user1.address, ethers.parseEther("0.5"))
      ).to.be.reverted;
    });

    it("should allow owner to transfer ownership", async function () {
      await vault.transferOwnership(user1.address);
      expect(await vault.owner()).to.equal(user1.address);
    });
  });

  describe("Position Management", function () {
    it("should open a long position", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const price = ethers.parseUnits("3000", 18); // ETH price

      // User deposits
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

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
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const price = ethers.parseUnits("3000", 18);

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      await vault.connect(user1).openPosition(
        1, // Short
        positionSize,
        price
      );

      const position = await vault.positions(user1.address);
      expect(position.isLong).to.equal(false);
    });

    it("should close position and calculate PnL", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const entryPrice = ethers.parseUnits("3000", 18);
      const exitPrice = ethers.parseUnits("3100", 18); // Price went up

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

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
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const price = ethers.parseUnits("3000", 18);

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      await expect(vault.connect(user1).openPosition(0, positionSize, price))
        .to.emit(vault, "PositionOpened")
        .withArgs(user1.address, true, positionSize, price);
    });

    it("should emit PositionClosed event", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const entryPrice = ethers.parseUnits("3000", 18);
      const exitPrice = ethers.parseUnits("3100", 18);

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      await expect(vault.connect(user1).closePosition(0, positionSize, exitPrice))
        .to.emit(vault, "PositionClosed");
    });

    it("should reject invalid position type", async function () {
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      await expect(
        vault.connect(user1).openPosition(2, ethers.parseEther("0.5"), ethers.parseUnits("3000", 18))
      ).to.be.revertedWith("Invalid position type");
    });

    it("should reject zero size position", async function () {
      await expect(
        vault.connect(user1).openPosition(0, 0, ethers.parseUnits("3000", 18))
      ).to.be.revertedWith("Size must be > 0");
    });

    it("should reject zero price position", async function () {
      await expect(
        vault.connect(user1).openPosition(0, ethers.parseEther("0.5"), 0)
      ).to.be.revertedWith("Price must be > 0");
    });

    it("should reject closing non-existent position", async function () {
      await expect(
        vault.connect(user1).closePosition(0, ethers.parseEther("0.5"), ethers.parseUnits("3000", 18))
      ).to.be.reverted;
    });

    it("should reject position type mismatch on close", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const price = ethers.parseUnits("3000", 18);

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      // Open long position
      await vault.connect(user1).openPosition(0, positionSize, price);

      // Try to close as short (mismatch)
      await expect(
        vault.connect(user1).closePosition(1, positionSize, price)
      ).to.be.reverted;
    });

    it("should handle short position profit correctly", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const entryPrice = ethers.parseUnits("3000", 18);
      const exitPrice = ethers.parseUnits("2900", 18); // Price went down

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      // Open short position
      await vault.connect(user1).openPosition(1, positionSize, entryPrice);

      // Close position at lower price (profit for short)
      await vault.connect(user1).closePosition(1, positionSize, exitPrice);

      // User should have profit
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.greaterThan(depositAmount);
    });

    it("should handle long position loss correctly", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const entryPrice = ethers.parseUnits("3000", 18);
      const exitPrice = ethers.parseUnits("2900", 18); // Price went down

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

      // Open long position
      await vault.connect(user1).openPosition(0, positionSize, entryPrice);

      // Close position at lower price (loss for long)
      await vault.connect(user1).closePosition(0, positionSize, exitPrice);

      // User should have loss
      const userDeposit = await vault.deposits(user1.address);
      expect(userDeposit).to.be.lessThan(depositAmount);
    });

    it("should handle short position loss correctly", async function () {
      const depositAmount = ethers.parseEther("1.0");
      const positionSize = ethers.parseEther("0.5");
      const entryPrice = ethers.parseUnits("3000", 18);
      const exitPrice = ethers.parseUnits("3100", 18); // Price went up

      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: depositAmount,
      });

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
    it("should return vault balance", async function () {
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      const balance = await vault.getBalance();
      expect(balance).to.equal(ethers.parseEther("1.0"));
    });

    it("should return false for hasOpenPosition when no position", async function () {
      expect(await vault.hasOpenPosition(user1.address)).to.equal(false);
    });

    it("should return true for hasOpenPosition when position exists", async function () {
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      await vault.connect(user1).openPosition(
        0,
        ethers.parseEther("0.5"),
        ethers.parseUnits("3000", 18)
      );

      expect(await vault.hasOpenPosition(user1.address)).to.equal(true);
    });

    it("should return false for hasOpenPosition after position closed", async function () {
      await user1.sendTransaction({
        to: await vault.getAddress(),
        value: ethers.parseEther("1.0"),
      });

      await vault.connect(user1).openPosition(
        0,
        ethers.parseEther("0.5"),
        ethers.parseUnits("3000", 18)
      );

      await vault.connect(user1).closePosition(
        0,
        ethers.parseEther("0.5"),
        ethers.parseUnits("3100", 18)
      );

      expect(await vault.hasOpenPosition(user1.address)).to.equal(false);
    });
  });
});
