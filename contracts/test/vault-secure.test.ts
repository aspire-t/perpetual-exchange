import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault, MockUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault Secure Withdrawal", function () {
  let vault: Vault;
  let mockUSDC: MockUSDC;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const USDC_DECIMALS = 6;

  function parseUSDC(amount: string): bigint {
    return ethers.parseUnits(amount, USDC_DECIMALS);
  }

  // Domain Separator constants
  const SIGNING_DOMAIN_NAME = "Vault";
  const SIGNING_DOMAIN_VERSION = "1";

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDCFactory.deploy();
    await mockUSDC.waitForDeployment();

    const VaultFactory = await ethers.getContractFactory("Vault");
    vault = await VaultFactory.deploy(await mockUSDC.getAddress());
    await vault.waitForDeployment();

    // Setup initial state: User1 has deposit
    await mockUSDC.mint(user1.address, parseUSDC("1000"));
    await mockUSDC.connect(user1).approve(await vault.getAddress(), parseUSDC("1000"));
    await vault.connect(user1).deposit(parseUSDC("1000"));
  });

  async function getWithdrawSignature(
    signer: SignerWithAddress,
    sender: string,
    amount: bigint,
    nonce: bigint,
    expiry: number
  ) {
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const contractAddress = await vault.getAddress();

    const domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    const types = {
      Withdraw: [
        { name: "sender", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
    };

    const value = {
      sender: sender,
      amount: amount,
      nonce: nonce,
      expiry: expiry,
    };

    return await signer.signTypedData(domain, types, value);
  }

  it("should withdraw successfully with valid signature", async function () {
    const amount = parseUSDC("100");
    const nonce = await vault.nonces(user1.address);
    const expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    const signature = await getWithdrawSignature(
      owner,
      user1.address,
      amount,
      nonce,
      expiry
    );

    const balanceBefore = await mockUSDC.balanceOf(user1.address);

    await expect(
      vault.connect(user1).withdrawWithSignature(amount, nonce, expiry, signature)
    )
      .to.emit(vault, "Withdraw")
      .withArgs(user1.address, amount);

    const balanceAfter = await mockUSDC.balanceOf(user1.address);
    expect(balanceAfter).to.equal(balanceBefore + amount);
    
    // Check nonce increment
    expect(await vault.nonces(user1.address)).to.equal(nonce + 1n);
  });

  it("should revert with invalid signature (wrong signer)", async function () {
    const amount = parseUSDC("100");
    const nonce = await vault.nonces(user1.address);
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    // Signed by user2 instead of owner
    const signature = await getWithdrawSignature(
      user2,
      user1.address,
      amount,
      nonce,
      expiry
    );

    await expect(
      vault.connect(user1).withdrawWithSignature(amount, nonce, expiry, signature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should revert with invalid signature (wrong amount)", async function () {
    const amount = parseUSDC("100");
    const wrongAmount = parseUSDC("200");
    const nonce = await vault.nonces(user1.address);
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    const signature = await getWithdrawSignature(
      owner,
      user1.address,
      amount, // Signed for 100
      nonce,
      expiry
    );

    await expect(
      vault.connect(user1).withdrawWithSignature(wrongAmount, nonce, expiry, signature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should revert with wrong nonce", async function () {
    const amount = parseUSDC("100");
    const nonce = await vault.nonces(user1.address);
    const wrongNonce = nonce + 1n;
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    const signature = await getWithdrawSignature(
      owner,
      user1.address,
      amount,
      wrongNonce,
      expiry
    );

    await expect(
      vault.connect(user1).withdrawWithSignature(amount, wrongNonce, expiry, signature)
    ).to.be.revertedWith("Invalid nonce");
  });

  it("should revert with expired signature", async function () {
    const amount = parseUSDC("100");
    const nonce = await vault.nonces(user1.address);
    const expiry = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

    const signature = await getWithdrawSignature(
      owner,
      user1.address,
      amount,
      nonce,
      expiry
    );

    await expect(
      vault.connect(user1).withdrawWithSignature(amount, nonce, expiry, signature)
    ).to.be.revertedWith("Signature expired");
  });
  
  it("should revert if user tries to replay signature", async function () {
    const amount = parseUSDC("100");
    const nonce = await vault.nonces(user1.address);
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    const signature = await getWithdrawSignature(
      owner,
      user1.address,
      amount,
      nonce,
      expiry
    );

    await vault.connect(user1).withdrawWithSignature(amount, nonce, expiry, signature);
    
    // Try again with same signature
    await expect(
      vault.connect(user1).withdrawWithSignature(amount, nonce, expiry, signature)
    ).to.be.revertedWith("Invalid nonce");
  });
});
