// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/// @title MockPriceFeed
/// @notice Mock Chainlink price feed for testing
contract MockPriceFeed is AggregatorV3Interface {
    int256 private _latestPrice;
    uint256 private _latestUpdatedAt;

    constructor(int256 initialPrice) {
        _latestPrice = initialPrice;
        _latestUpdatedAt = block.timestamp;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }

    function description() external pure returns (string memory) {
        return "Mock Price Feed";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            1,
            _latestPrice,
            _latestUpdatedAt,
            _latestUpdatedAt,
            1
        );
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            _latestPrice,
            _latestUpdatedAt,
            _latestUpdatedAt,
            _roundId
        );
    }

    /// @notice Set the latest price (only for testing)
    function setPrice(int256 price) external {
        _latestPrice = price;
        _latestUpdatedAt = block.timestamp;
    }

    /// @notice Get current price (for testing)
    function getPrice() external view returns (int256) {
        return _latestPrice;
    }
}
