// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Vault
 * @dev Minimal vault contract for perpetual exchange
 * Handles deposits, withdrawals, and position management
 */
contract Vault is Ownable {
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
     * @dev Constructor sets the deployer as owner
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Accept ETH deposits
     */
    receive() external payable {
        deposits[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw user's deposit
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        require(address(this).balance >= amount, "Vault balance insufficient");

        deposits[msg.sender] -= amount;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdraw(msg.sender, amount);
    }

    /**
     * @dev Owner can withdraw ETH from vault
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawEther(address to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Vault balance insufficient");

        (bool success,) = payable(to).call{value: amount}("");
        require(success, "Withdraw failed");
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
     * @dev Get vault balance
     * @return Current vault balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
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
