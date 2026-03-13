# Hyperliquid Testnet Deployment Guide

## Prerequisites
1. Ensure you have Node.js and npm installed.
2. Ensure you have a Hyperliquid Testnet account with some HYPE tokens for gas.
3. Obtain your Testnet Private Key.

## Setup
1. Create a `.env` file in the `contracts` directory (if not exists, copy `.env.example`).
2. Add your private key to the `.env` file:
   ```env
   TESTNET_PRIVATE_KEY=your_private_key_here
   ```

## Deployment
To deploy the `Vault` contract to the Hyperliquid Testnet using the default USDC address (`0xa4022bdfa1e6d546f26905111fc62b0b8887d482`), run:

```bash
npx hardhat run scripts/deploy-hyperliquid.ts --network hyperliquid_testnet
```

### Custom USDC Address
If you want to use a different USDC address, set the `USDC_ADDRESS` environment variable:

```bash
USDC_ADDRESS=0xYourCustomUSDCAddress npx hardhat run scripts/deploy-hyperliquid.ts --network hyperliquid_testnet
```

## Verification
After deployment, the script will output the Vault address. You can verify the deployment on the Hyperliquid Testnet Explorer (e.g., Hyperscan Testnet).
