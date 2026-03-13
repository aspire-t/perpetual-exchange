import { ethers } from "hardhat";

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS || "0xa4022bdfa1e6d546f26905111fc62b0b8887d482";
  
  console.log("Deploying Vault to Hyperliquid Testnet...");
  console.log("Using USDC Address:", usdcAddress);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(usdcAddress);

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();

  console.log("Vault deployed to:", vaultAddress);
  console.log("----------------------------------------------------");
  console.log("Deployment Summary:");
  console.log(`Network: Hyperliquid Testnet (Chain ID: 998)`);
  console.log(`Vault Address: ${vaultAddress}`);
  console.log(`USDC Address: ${usdcAddress}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
