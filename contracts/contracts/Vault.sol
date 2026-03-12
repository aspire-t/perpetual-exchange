// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Vault
 * @dev Minimal vault contract for perpetual exchange
 * Handles USDC deposits, withdrawals, and position management
 */
contract Vault is Ownable {
    using SafeERC20 for IERC20;

    // USDC token address
    IERC20 public usdc;
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event PositionOpened(
        address indexed user,
        bool isLong,
        uint256 size,
        uint256 entryPrice
    );
    event PositionClosed(
        address indexed user,
        bool isLong,
        uint256 size,
        uint256 entryPrice,
        uint256 exitPrice,
        int256 pnl
    );

    // Position type: 0 = Long, 1 = Short
    enum PositionType {
        Long,
        Short
    }

    // Position struct
    struct Position {
        uint256 size;
        uint256 entryPrice;
        bool isLong;
        bool isOpen;
    }

    // User deposits mapping
    mapping(address => uint256) public deposits;

    // User positions mapping
    mapping(address => Position) public positions;

    /**
     * @dev Constructor sets the deployer as owner and USDC address
     * @param usdcAddress Address of the USDC token contract
     */
    constructor(address usdcAddress) Ownable(msg.sender) {
        usdc = IERC20(usdcAddress);
    }

    /**
     * @dev Deposit USDC tokens into the vault
     * @param amount Amount to deposit (in smallest units, i.e., 6 decimals)
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        emit Deposit(msg.sender, amount);
    }

    /**
     * @dev Withdraw user's deposit
     * @param amount Amount to withdraw (in smallest units, i.e., 6 decimals)
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        require(usdc.balanceOf(address(this)) >= amount, "Vault balance insufficient");

        deposits[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @dev Owner can withdraw USDC from vault
     * @param to Recipient address
     * @param amount Amount to withdraw (in smallest units, i.e., 6 decimals)
     */
    function withdrawUSDC(address to, uint256 amount) external onlyOwner {
        require(usdc.balanceOf(address(this)) >= amount, "Vault balance insufficient");

        usdc.safeTransfer(to, amount);
    }

    /**
     * @dev Open a position (long or short)
     * @param positionType 0 for Long, 1 for Short
     * @param size Position size in wei
     * @param price Entry price
     */
    function openPosition(
        uint8 positionType,
        uint256 size,
        uint256 price
    ) external {
        require(positionType <= 1, "Invalid position type");
        require(size > 0, "Size must be > 0");
        require(price > 0, "Price must be > 0");
        require(deposits[msg.sender] >= size, "Insufficient deposit for position");

        bool isLong = positionType == 0;

        positions[msg.sender] = Position({
            size: size,
            entryPrice: price,
            isLong: isLong,
            isOpen: true
        });

        emit PositionOpened(msg.sender, isLong, size, price);
    }

    /**
     * @dev Close a position and calculate PnL
     * @param positionType 0 for Long, 1 for Short
     * @param size Position size to close
     * @param exitPrice Exit price
     */
    function closePosition(
        uint8 positionType,
        uint256 size,
        uint256 exitPrice
    ) external {
        Position storage position = positions[msg.sender];
        require(position.isOpen, "No open position");
        require(position.size >= size, "Size exceeds position");

        bool isLong = positionType == 0;
        require(position.isLong == isLong, "Position type mismatch");

        // Calculate PnL
        int256 pnl = _calculatePnL(
            position.entryPrice,
            exitPrice,
            size,
            isLong
        );

        // Update user deposit with PnL
        if (pnl > 0) {
            deposits[msg.sender] += uint256(pnl);
        } else {
            uint256 loss = uint256(-pnl);
            require(deposits[msg.sender] >= loss, "Insufficient deposit for loss");
            deposits[msg.sender] -= loss;
        }

        // Close position
        position.isOpen = false;
        position.size = 0;

        emit PositionClosed(
            msg.sender,
            isLong,
            size,
            position.entryPrice,
            exitPrice,
            pnl
        );
    }

    /**
     * @dev Calculate profit and loss
     * @param entryPrice Entry price
     * @param exitPrice Exit price
     * @param size Position size
     * @param isLong True for long, false for short
     * @return pnl Profit (positive) or loss (negative)
     */
    function _calculatePnL(
        uint256 entryPrice,
        uint256 exitPrice,
        uint256 size,
        bool isLong
    ) internal pure returns (int256 pnl) {
        if (isLong) {
            // Long: profit when price goes up
            if (exitPrice > entryPrice) {
                pnl = int256((exitPrice - entryPrice) * size / entryPrice);
            } else {
                pnl = -int256((entryPrice - exitPrice) * size / entryPrice);
            }
        } else {
            // Short: profit when price goes down
            if (exitPrice < entryPrice) {
                pnl = int256((entryPrice - exitPrice) * size / entryPrice);
            } else {
                pnl = -int256((exitPrice - entryPrice) * size / entryPrice);
            }
        }
    }

    /**
     * @dev Get vault USDC balance
     * @return Current vault USDC balance (in smallest units, i.e., 6 decimals)
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @dev Check if user has open position
     * @param user User address
     * @return true if position is open
     */
    function hasOpenPosition(address user) external view returns (bool) {
        return positions[user].isOpen;
    }
}
