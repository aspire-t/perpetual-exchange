// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for local Hardhat testing
 * Mintable ERC20 with 6 decimals (standard for USDC)
 */
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {}

    /**
     * @dev Mint tokens to specified address
     * @param to Recipient address
     * @param amount Amount to mint (in smallest units, i.e., 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to return 6 (USDC standard)
     * @return uint8 Number of decimals
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
