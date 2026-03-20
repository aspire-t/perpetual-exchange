// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title Vault
 * @notice 永续交易所金库合约 (第二阶段安全修复)
 * @dev 处理 USDC 存款、取款和仓位管理
 *
 * 安全修复记录:
 * - 第一阶段：存款锁定、仓位 ID、重入保护、owner 权限、签名保护
 * - 第二阶段：价格预言机、偿付能力检查、手续费机制、清算机制
 */
contract Vault is Ownable, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice USDC 代币地址
    IERC20 public immutable usdc;

    /// @notice Chainlink 价格预言机
    AggregatorV3Interface public priceFeed;

    /// @notice EIP712 TypeHash - 显式包含 chainId
    bytes32 private constant WITHDRAW_TYPEHASH = keccak256("Withdraw(address sender,uint256 amount,uint256 nonce,uint256 expiry,uint256 chainId)");

    /// @notice 下一个仓位 ID
    uint256 private _nextPositionId;

    /// @notice 用户存款总额 (包含已锁定)
    uint256 public totalUserDeposits;

    /// @notice 累计协议费用
    uint256 public totalFeesCollected;

    // ========== 费用配置 (10000 = 100%) ==========
    /// @notice 开仓手续费率 0.1% (10 bps)
    uint256 public constant OPEN_FEE_BPS = 10;
    /// @notice 平仓手续费率 0.1% (10 bps)
    uint256 public constant CLOSE_FEE_BPS = 10;
    /// @notice 最大价格偏差 5% (500 bps)
    uint256 public constant MAX_PRICE_DEVIATION_BPS = 500;
    /// @notice 保证金率 5% (500 bps)
    uint256 public constant MAINTENANCE_MARGIN_BPS = 500;
    /// @notice 清算奖励 2% (200 bps)
    uint256 public constant LIQUIDATION_REWARD_BPS = 200;

    /// @notice 用户总存款映射
    mapping(address => uint256) public deposits;

    /// @notice 用户已锁定存款映射 (开仓时锁定)
    mapping(address => uint256) public lockedDeposits;

    /// @notice 仓位映射 - 通过 ID 访问
    mapping(uint256 => Position) public positions;

    /// @notice 用户仓位 ID 列表
    mapping(address => uint256[]) public userPositionIds;

    /// @notice 用户签名 nonce 映射
    mapping(address => uint256) public nonces;

    /// @notice 自定义错误

    error AmountZero();
    error InsufficientDeposit();
    error InsufficientVaultBalance();
    error InsufficientAvailableDeposit();
    error InvalidPositionType();
    error SizeExceedsPosition();
    error PositionTypeMismatch();
    error PositionNotOpen();
    error NoPosition();
    error InvalidSignature();
    error SignatureExpired();
    error InvalidNonce();
    error InvalidChainId();
    error InsufficientFeeBalance();
    error InvalidPriceFeed();
    error PriceDeviationTooHigh(uint256 oraclePrice, uint256 inputPrice, uint256 maxDeviation);
    error StalePrice(uint256 updatedAt, uint256 maxDelay);
    error InsufficientSolvency();
    error HealthyPosition(uint256 healthFactor);
    error InvalidPriceFeedAddress();

    /// @notice 仓位结构体
    struct Position {
        address owner;      // 仓位所有者
        uint128 size;       // 仓位大小 (128 bits 足够)
        uint128 entryPrice; // 入场价格
        bool isLong;        // true = 多头，false = 空头
        bool isOpen;        // 是否开启
    }

    // ========== 事件 ==========

    event Deposit(address indexed user, uint256 amount, uint256 timestamp);
    event Withdraw(address indexed user, uint256 amount, uint256 timestamp);
    event PositionOpened(
        address indexed user,
        uint256 indexed positionId,
        bool isLong,
        uint256 size,
        uint256 entryPrice,
        uint256 fee,
        uint256 timestamp
    );
    event PositionClosed(
        address indexed user,
        uint256 indexed positionId,
        uint256 exitPrice,
        int256 pnl,
        uint256 fee,
        uint256 timestamp
    );
    event PositionLiquidated(
        address indexed user,
        uint256 indexed positionId,
        address indexed liquidator,
        uint256 exitPrice,
        uint256 reward,
        uint256 timestamp
    );
    event PriceFeedUpdated(address oldFeed, address newFeed);
    event FeeRateUpdated(string feeType, uint256 oldRate, uint256 newRate);

    /**
     * @dev 构造函数
     * @param usdcAddress USDC 代币地址
     * @param priceFeedAddress Chainlink 价格源地址
     */
    constructor(address usdcAddress, address priceFeedAddress) Ownable(msg.sender) EIP712("Vault", "1") {
        require(usdcAddress != address(0), "Invalid USDC address");
        require(priceFeedAddress != address(0), "Invalid price feed address");
        usdc = IERC20(usdcAddress);
        priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    /**
     * @notice 存入 USDC 到金库
     * @param amount 存款金额 (6 位小数)
     */
    function deposit(uint256 amount) external {
        if (amount == 0) revert AmountZero();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalUserDeposits += amount;

        emit Deposit(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice 提取用户存款
     * @param amount 提取金额 (6 位小数)
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert AmountZero();

        // 检查可用存款 = 总存款 - 已锁定存款
        uint256 availableDeposit = deposits[msg.sender] - lockedDeposits[msg.sender];
        if (availableDeposit < amount) revert InsufficientDeposit();
        if (usdc.balanceOf(address(this)) < amount) revert InsufficientVaultBalance();

        // Effects: 先更新状态
        deposits[msg.sender] -= amount;
        totalUserDeposits -= amount;

        // Interactions: 最后转账
        usdc.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice 使用签名提取存款
     */
    function withdrawWithSignature(
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external nonReentrant {
        if (block.timestamp > expiry) revert SignatureExpired();
        if (nonce != nonces[msg.sender]) revert InvalidNonce();

        // 显式验证签名 s 值规范性（防止延展性攻击）
        _validateSignatureSValue(signature);

        bytes32 structHash = keccak256(abi.encode(
            WITHDRAW_TYPEHASH,
            msg.sender,
            amount,
            nonce,
            expiry,
            block.chainid
        ));

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, signature);
        if (signer != owner()) revert InvalidSignature();

        // Effects: 先更新 nonce
        nonces[msg.sender]++;

        if (amount == 0) revert AmountZero();

        // 检查可用存款
        uint256 availableDeposit = deposits[msg.sender] - lockedDeposits[msg.sender];
        if (availableDeposit < amount) revert InsufficientDeposit();
        if (usdc.balanceOf(address(this)) < amount) revert InsufficientVaultBalance();

        // Effects: 更新状态
        deposits[msg.sender] -= amount;
        totalUserDeposits -= amount;

        // Interactions: 最后转账
        usdc.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Owner 提取协议费用
     */
    function withdrawFees(address to, uint256 amount) external onlyOwner {
        if (amount == 0) revert AmountZero();

        // 可提取金额 = 合约余额 - 用户存款总额
        uint256 available = usdc.balanceOf(address(this)) - totalUserDeposits;
        if (amount > available) revert InsufficientFeeBalance();

        usdc.safeTransfer(to, amount);
    }

    /**
     * @notice 更新价格预言机地址
     * @param newFeed 新价格源地址
     */
    function setPriceFeed(address newFeed) external onlyOwner {
        if (newFeed == address(0)) revert InvalidPriceFeedAddress();
        address oldFeed = address(priceFeed);
        priceFeed = AggregatorV3Interface(newFeed);
        emit PriceFeedUpdated(oldFeed, newFeed);
    }

    /**
     * @notice 获取最新预言机价格
     * @return price 价格
     * @return updatedAt 更新时间
     */
    function getLatestPrice() public view returns (uint256 price, uint256 updatedAt) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAtAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();

        require(answer > 0, "Invalid price from oracle");
        require(updatedAtAt > 0, "Stale price round");
        require(answeredInRound >= roundId, "Stale price round");

        return (uint256(answer), updatedAtAt);
    }

    /**
     * @notice 验证价格是否在允许偏差范围内
     * @param inputPrice 输入价格
     */
    function _validatePrice(uint256 inputPrice) internal view {
        (uint256 oraclePrice, ) = getLatestPrice();

        // 计算最大和最小允许价格
        uint256 maxPrice = oraclePrice * (10000 + MAX_PRICE_DEVIATION_BPS) / 10000;
        uint256 minPrice = oraclePrice * (10000 - MAX_PRICE_DEVIATION_BPS) / 10000;

        if (inputPrice > maxPrice || inputPrice < minPrice) {
            revert PriceDeviationTooHigh(oraclePrice, inputPrice, MAX_PRICE_DEVIATION_BPS);
        }
    }

    /**
     * @notice 开仓 (多头或空头)
     * @param positionType 0 = 多头，1 = 空头
     * @param size 仓位大小 (6 位小数)
     * @param price 入场价格
     * @return positionId 仓位 ID
     */
    function openPosition(
        uint8 positionType,
        uint256 size,
        uint256 price
    ) external returns (uint256 positionId) {
        if (positionType > 1) revert InvalidPositionType();
        if (size == 0) revert AmountZero();
        if (price == 0) revert AmountZero();

        // 验证价格与预言机偏差
        _validatePrice(price);

        // 检查可用存款
        uint256 availableDeposit = deposits[msg.sender] - lockedDeposits[msg.sender];
        if (availableDeposit < size) revert InsufficientAvailableDeposit();

        bool isLong = positionType == 0;

        // 计算开仓费用
        uint256 openFee = (size * OPEN_FEE_BPS) / 10000;
        uint256 totalRequired = size + openFee;

        // 检查是否有足够存款支付费用
        if (availableDeposit < totalRequired) revert InsufficientAvailableDeposit();

        // Effects: 锁定抵押品 + 费用
        lockedDeposits[msg.sender] += size;

        // 收取费用 (从存款中扣除)
        deposits[msg.sender] -= openFee;
        totalUserDeposits -= openFee;
        totalFeesCollected += openFee;

        // Effects: 创建新仓位
        positionId = _nextPositionId++;
        positions[positionId] = Position({
            owner: msg.sender,
            size: uint128(size),
            entryPrice: uint128(price),
            isLong: isLong,
            isOpen: true
        });

        // 记录用户仓位 ID
        userPositionIds[msg.sender].push(positionId);

        emit PositionOpened(
            msg.sender,
            positionId,
            isLong,
            size,
            price,
            openFee,
            block.timestamp
        );
    }

    /**
     * @notice 平仓并计算盈亏
     * @param positionId 仓位 ID
     * @return pnl 盈亏 (正数 = 盈利，负数 = 亏损)
     */
    function closePosition(
        uint256 positionId
    ) external returns (int256 pnl) {
        Position storage position = positions[positionId];

        if (!position.isOpen) revert PositionNotOpen();
        if (position.owner != msg.sender) revert PositionNotOpen();

        uint256 size = position.size;
        uint256 entryPrice = position.entryPrice;
        bool isLong = position.isLong;

        // 获取预言机价格作为出场价
        (uint256 exitPrice, ) = getLatestPrice();

        // 计算 PnL
        pnl = _calculatePnL(entryPrice, exitPrice, size, isLong);

        // 计算平仓费用 (仅对盈利收费)
        uint256 closeFee = 0;
        if (pnl > 0) {
            closeFee = (uint256(pnl) * CLOSE_FEE_BPS) / 10000;
        }

        // 释放锁定的抵押品
        lockedDeposits[msg.sender] -= size;

        // 偿付能力检查：确保金库有足够资金支付盈利
        if (pnl > 0) {
            uint256 netPnl = uint256(pnl) - closeFee;
            uint256 vaultBalance = usdc.balanceOf(address(this));
            // 检查：金库余额 >= 用户存款总额 + 净盈利
            if (vaultBalance < totalUserDeposits + netPnl) {
                revert InsufficientSolvency();
            }
        }

        // 更新用户存款
        if (pnl > 0) {
            uint256 netPnl = uint256(pnl) - closeFee;
            deposits[msg.sender] += netPnl;
            totalUserDeposits += netPnl;
        } else {
            uint256 loss = uint256(-pnl);
            if (deposits[msg.sender] < loss) revert InsufficientDeposit();
            deposits[msg.sender] -= loss;
            totalUserDeposits -= loss;
        }

        // 收取平仓费用
        if (closeFee > 0) {
            totalFeesCollected += closeFee;
        }

        // Close position
        position.isOpen = false;
        position.size = 0;

        emit PositionClosed(
            msg.sender,
            positionId,
            exitPrice,
            pnl,
            closeFee,
            block.timestamp
        );
    }

    /**
     * @notice 清算不健康的仓位
     * @param positionId 仓位 ID
     * @param targetUser 仓位所有者
     * @return reward 清算奖励
     */
    function liquidate(
        uint256 positionId,
        address targetUser
    ) external returns (uint256 reward) {
        Position storage position = positions[positionId];

        if (!position.isOpen) revert PositionNotOpen();
        if (position.owner != targetUser) revert PositionNotOpen();

        // 计算健康因子
        uint256 healthFactor = _calculateHealthFactor(position);

        // 检查是否可以清算 (健康因子 < 1.0)
        if (healthFactor >= 10000) {
            revert HealthyPosition(healthFactor);
        }

        uint256 size = position.size;
        uint256 entryPrice = position.entryPrice;
        bool isLong = position.isLong;

        // 获取预言机价格
        (uint256 exitPrice, ) = getLatestPrice();

        // 计算 PnL
        int256 pnl = _calculatePnL(entryPrice, exitPrice, size, isLong);

        // 计算保证金 (仓位大小)
        uint256 margin = size;

        // 计算未实现亏损
        uint256 unrealizedLoss = pnl < 0 ? uint256(-pnl) : 0;

        // 计算剩余保证金
        uint256 remainingMargin = margin > unrealizedLoss ? margin - unrealizedLoss : 0;

        // 计算清算奖励 (剩余保证金的 2%)
        reward = (remainingMargin * LIQUIDATION_REWARD_BPS) / 10000;

        // 释放锁定的抵押品
        lockedDeposits[targetUser] -= size;

        // 用户获得剩余保证金 - 清算奖励
        if (remainingMargin > reward) {
            deposits[targetUser] += remainingMargin - reward;
            // totalUserDeposits 不变，因为只是从锁定转为可用
        }

        // 清算者获得奖励
        if (reward > 0) {
            deposits[msg.sender] += reward;
            totalUserDeposits += reward;
        }

        // 如果亏损，从用户存款中扣除
        if (unrealizedLoss > 0) {
            if (deposits[targetUser] >= unrealizedLoss) {
                deposits[targetUser] -= unrealizedLoss;
                totalUserDeposits -= unrealizedLoss;
            } else {
                // 亏损超过保证金，协议承担损失
                // 这在现实场景中需要保险基金等机制
                // 这里简化处理
            }
        }

        // Close position
        position.isOpen = false;
        position.size = 0;

        emit PositionLiquidated(
            targetUser,
            positionId,
            msg.sender,
            exitPrice,
            reward,
            block.timestamp
        );
    }

    /**
     * @notice 计算仓位健康因子
     * @param position 仓位
     * @return healthFactor 健康因子 * 10000 (10000 = 1.0)
     */
    function _calculateHealthFactor(Position memory position) internal view returns (uint256) {
        // 获取当前价格
        (uint256 currentPrice, ) = getLatestPrice();

        // 计算未实现 PnL
        int256 unrealizedPnl = _calculatePnL(
            position.entryPrice,
            currentPrice,
            position.size,
            position.isLong
        );

        // 计算当前保证金 (用户存款中的可用部分 + 锁定部分)
        uint256 margin = position.size; // 开仓时锁定的保证金

        // 计算调整后保证金
        uint256 adjustedMargin;
        if (unrealizedPnl > 0) {
            adjustedMargin = margin + uint256(unrealizedPnl);
        } else {
            adjustedMargin = margin > uint256(-unrealizedPnl)
                ? margin - uint256(-unrealizedPnl)
                : 0;
        }

        // 计算维持保证金 = 仓位大小 * 保证金率
        uint256 maintenanceMargin = (position.size * MAINTENANCE_MARGIN_BPS) / 10000;

        // 健康因子 = 调整后保证金 / 维持保证金
        if (maintenanceMargin == 0) {
            return type(uint256).max;
        }

        return (adjustedMargin * 10000) / maintenanceMargin;
    }

    /**
     * @notice 获取仓位健康因子 (外部调用)
     * @param positionId 仓位 ID
     * @return healthFactor 健康因子 * 10000
     */
    function getHealthFactor(uint256 positionId) external view returns (uint256) {
        Position memory position = positions[positionId];
        if (!position.isOpen) return type(uint256).max;
        return _calculateHealthFactor(position);
    }

    /**
     * @notice 计算盈亏
     */
    function _calculatePnL(
        uint256 entryPrice,
        uint256 exitPrice,
        uint256 size,
        bool isLong
    ) internal pure returns (int256 pnl) {
        if (isLong) {
            // 多头：价格上涨时盈利
            if (exitPrice > entryPrice) {
                pnl = int256((exitPrice - entryPrice) * size / entryPrice);
            } else {
                pnl = -int256((entryPrice - exitPrice) * size / entryPrice);
            }
        } else {
            // 空头：价格下跌时盈利
            if (exitPrice < entryPrice) {
                pnl = int256((entryPrice - exitPrice) * size / entryPrice);
            } else {
                pnl = -int256((exitPrice - entryPrice) * size / entryPrice);
            }
        }
    }

    /**
     * @notice 验证签名 s 值
     */
    function _validateSignatureSValue(bytes calldata signature) internal pure {
        bytes32 s;
        assembly {
            s := calldataload(add(signature.offset, 64))
        }
        require(
            uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0,
            "Invalid signature s-value"
        );
    }

    /**
     * @notice 获取金库 USDC 余额
     */
    function getBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /**
     * @notice 检查用户是否有开启的仓位
     */
    function hasOpenPosition(address user) external view returns (bool) {
        uint256[] memory positionIds = userPositionIds[user];
        for (uint256 i = 0; i < positionIds.length; i++) {
            if (positions[positionIds[i]].isOpen) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice 获取用户所有仓位 ID
     */
    function getUserPositionIds(address user) external view returns (uint256[] memory) {
        return userPositionIds[user];
    }

    /**
     * @notice 获取用户可用存款
     */
    function getAvailableDeposit(address user) external view returns (uint256) {
        return deposits[user] - lockedDeposits[user];
    }

    /**
     * @notice 获取仓位详情
     */
    function getPosition(uint256 positionId) external view returns (
        address owner,
        uint256 size,
        uint256 entryPrice,
        bool isLong,
        bool isOpen
    ) {
        Position memory pos = positions[positionId];
        return (pos.owner, pos.size, pos.entryPrice, pos.isLong, pos.isOpen);
    }

    /**
     * @notice 计算开仓费用
     * @param size 仓位大小
     * @return fee 费用
     */
    function calculateOpenFee(uint256 size) external pure returns (uint256) {
        return (size * OPEN_FEE_BPS) / 10000;
    }

    /**
     * @notice 计算平仓费用
     * @param pnl 盈亏
     * @return fee 费用
     */
    function calculateCloseFee(int256 pnl) external pure returns (uint256) {
        if (pnl <= 0) return 0;
        return (uint256(pnl) * CLOSE_FEE_BPS) / 10000;
    }
}
