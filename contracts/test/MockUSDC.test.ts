import { expect } from "chai";
import { ethers } from "hardhat";
import { MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MockUSDC", function () {
  let mockUSDC: MockUSDC;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await mockUSDC.getAddress()).to.be.properAddress;
    });

    it("should set the deployer as owner", async function () {
      expect(await mockUSDC.owner()).to.equal(owner.address);
    });

    it("should have correct name and symbol", async function () {
      expect(await mockUSDC.name()).to.equal("Mock USDC");
      expect(await mockUSDC.symbol()).to.equal("USDC");
    });

    it("should have 6 decimals", async function () {
      expect(await mockUSDC.decimals()).to.equal(6);
    });
  });

  describe("Minting", function () {
    it("should allow owner to mint tokens", async function () {
      const mintAmount = 1000000; // 1 USDC (6 decimals)

      await mockUSDC.mint(owner.address, mintAmount);

      expect(await mockUSDC.balanceOf(owner.address)).to.equal(mintAmount);
    });

    it("should emit Transfer event on mint", async function () {
      const mintAmount = 1000000;

      await expect(mockUSDC.mint(owner.address, mintAmount))
        .to.emit(mockUSDC, "Transfer")
        .withArgs(ethers.ZeroAddress, owner.address, mintAmount);
    });

    it("should allow owner to mint to another address", async function () {
      const mintAmount = 5000000; // 5 USDC

      await mockUSDC.mint(user.address, mintAmount);

      expect(await mockUSDC.balanceOf(user.address)).to.equal(mintAmount);
    });

    it("should reject minting from non-owner", async function () {
      const mintAmount = 1000000;

      await expect(
        mockUSDC.connect(user).mint(user.address, mintAmount)
      ).to.be.reverted;
    });

    it("should allow multiple mints from owner", async function () {
      const mint1 = 1000000;
      const mint2 = 2000000;

      await mockUSDC.mint(owner.address, mint1);
      await mockUSDC.mint(owner.address, mint2);

      expect(await mockUSDC.balanceOf(owner.address)).to.equal(mint1 + mint2);
    });
  });
});
