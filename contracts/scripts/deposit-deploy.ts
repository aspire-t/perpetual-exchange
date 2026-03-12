import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying MockUSDC and Vault contracts...");

  // Deploy MockUSDC
  console.log("\n1. Deploying MockUSDC...");
  const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDCFactory.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log(`   MockUSDC deployed to: ${mockUSDCAddress}`);

  // Deploy Vault
  console.log("\n2. Deploying Vault...");
  const VaultFactory = await ethers.getContractFactory("Vault");
  const vault = await VaultFactory.deploy(mockUSDCAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   Vault deployed to: ${vaultAddress}`);

  // Mint test tokens to deployer
  console.log("\n3. Minting test USDC to deployer...");
  const [deployer] = await ethers.getSigners();
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  await mockUSDC.mint(deployer.address, mintAmount);
  const balance = await mockUSDC.balanceOf(deployer.address);
  console.log(`   Deployer balance: ${ethers.formatUnits(balance, 6)} USDC`);

  // Save deployment info
  console.log("\n4. Saving deployment info...");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    timestamp: new Date().toISOString(),
    contracts: {
      MockUSDC: {
        address: mockUSDCAddress,
        deployer: deployer.address,
      },
      Vault: {
        address: vaultAddress,
        usdcAddress: mockUSDCAddress,
        deployer: deployer.address,
      },
    },
  };

  const outputPath = path.join(__dirname, "../deployments", `${hre.network.name}-deployment.json`);

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.dirname(outputPath);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`   Deployment info saved to: ${outputPath}`);

  console.log("\n=== Deployment Complete ===");
  console.log(`MockUSDC: ${mockUSDCAddress}`);
  console.log(`Vault: ${vaultAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Deployer USDC Balance: ${ethers.formatUnits(balance, 6)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
