# Perpetual Exchange - Implementation Plan

**Date:** 2026-03-12
**Status:** Pending User Review

---

## Requirements Restatement

构建一个最小可运行的永续合约交易所，包含：
1. **Vault 智能合约** - USDC 存取款
2. **Mock USDC** - 本地测试代币与水龙头
3. **后端 API (NestJS)** - 认证、余额、订单、持仓
4. **交易引擎** - 市价单处理、仓位管理、PnL 计算
5. **Indexer** - 监听链上事件
6. **对冲系统** - Hyperliquid 对冲 (支持 Mock 模式)
7. **前端 (Next.js)** - 钱包连接、交易界面
8. **PostgreSQL** - 数据存储
9. **Docker Compose** - 一键启动

---

## Implementation Phases (Detailed Breakdown)

### Phase 1: 项目脚手架 (Foundation)

**1.1 创建项目目录结构**
- 创建根目录 `perpetual-exchange/`
- 创建子目录：`frontend/`, `backend/`, `contracts/`, `docs/`
- 创建根目录 `.gitignore`, `README.md`, `docker-compose.yml`

**1.2 配置 Docker Compose**
- 定义 PostgreSQL 服务 (image: postgres:15, port: 5432)
- 定义 Hardhat Node 服务 (port: 8545)
- 配置共享网络 `perp-network`
- 配置数据卷 `postgres-data`

**1.3 初始化 NestJS 后端**
- 使用 `@nestjs/cli` 创建项目于 `backend/`
- 安装依赖：`@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `pg`
- 配置环境变量模板 `.env.example`

**1.4 初始化 Next.js 前端**
- 使用 `create-next-app` 创建项目于 `frontend/`
- 安装依赖：`wagmi`, `viem`, `@tanstack/react-query`, `tailwindcss`
- 配置环境变量模板 `.env.example`

**1.5 初始化 Hardhat 合约项目**
- 使用 `npm init hardhat` 创建项目于 `contracts/`
- 安装依赖：`hardhat`, `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`
- 配置 `hardhat.config.ts` (本地网络 localhost:8545)

---

### Phase 2: Vault 智能合约与 Mock Token

**2.1 编写 MockUSDC.sol**
- 继承 OpenZeppelin `ERC20` + `Ownable`
- 添加 `mint(address to, uint256 amount)` 函数 (onlyOwner)
- 配置 solidity 版本 ^0.8.0

**2.2 编写 Vault.sol**
- 依赖 IERC20 接口
- 状态变量：`IERC20 public usdc`, `mapping(address => uint256) public balances`
- 函数：`deposit(uint256)`, `withdraw(uint256)`
- 事件：`Deposit`, `Withdraw`
- 添加 ReentrancyGuard

**2.3 编写部署脚本 `scripts/deploy.ts`**
- 部署 MockUSDC
- 部署 Vault (传入 MockUSDC 地址)
- 输出合约地址到 JSON 文件

**2.4 编写 Mint 脚本 `scripts/mint.ts`**
- 接收参数：`--address`, `--amount`
- 调用 MockUSDC.mint()
- 输出交易哈希和余额

**2.5 编写 Hardhat 测试 `test/Vault.test.ts`**
- 测试存款流程
- 测试提款流程
- 测试余额不足情况
- 测试重入攻击防护

---

### Phase 3: 数据库层

**3.1 初始化 Prisma**
- 安装 `prisma`, `@prisma/client`
- 运行 `npx prisma init`
- 配置 `DATABASE_URL` 连接字符串

**3.2 创建 Prisma Schema**
- 定义 `User` model (id, address, createdAt)
- 定义 `Balance` model (id, userId, balance, updatedAt)
- 定义 `Position` model (id, userId, symbol, size, entryPrice, side, updatedAt)
- 定义 `Order` model (id, userId, symbol, size, side, price, status, createdAt)
- 定义 `ProcessedEvent` model (id, signature, type, processedAt)
- 添加适当索引和关联

**3.3 生成 Migration**
- 运行 `npx prisma migrate dev --name init`
- 验证生成的 SQL
- 创建 PrismaClient 单例模块

---

### Phase 4: 后端 API - 认证与余额

**4.1 创建 Auth 模块**
- 生成 NestJS module: `nest g module auth`
- 创建 `AuthService` 实现 `verifySignature(address, message, signature)`
- 创建 `POST /auth/login` endpoint
- 返回 session token 或 JWT

**4.2 创建 Faucet 模块 (Dev)**
- 生成 NestJS module: `nest g module faucet`
- 创建 `POST /faucet` endpoint
- 调用 MockUSDC.mint() 给请求者地址
- 限制：每个地址每日最多 mint 一次

**4.3 创建 Balance 模块**
- 生成 NestJS module: `nest g module balance`
- 创建 `GET /balance` endpoint
- 查询 Prisma Balance 表
- 返回可用余额

**4.4 创建 Deposit 模块**
- 生成 NestJS module: `nest g module deposit`
- 创建 `POST /deposit` endpoint
- 生成存款授权信息 (Vault 地址，spender 等)

**4.5 创建 Withdraw 模块**
- 生成 NestJS module: `nest g module withdraw`
- 创建 `POST /withdraw` endpoint
- 验证用户余额充足
- 调用 Vault.withdraw()
- 记录提款请求状态

---

### Phase 5: Indexer (事件监听器)

**5.1 生成合约 ABI**
- 从 Hardhat artifacts 复制 Vault ABI
- 保存到 `backend/src/abis/Vault.json`

**5.2 创建 Indexer 服务**
- 创建 `IndexerModule`
- 创建 `IndexerService` 连接 Hardhat Node
- 实例化 Vault 合约 (只读)

**5.3 实现事件监听**
- 监听 `Deposit` 事件：`contract.on("Deposit", callback)`
- 监听 `Withdraw` 事件
- 解析事件参数 (user, amount)

**5.4 实现幂等性处理**
- 从事件提取 `transactionHash + logIndex` 作为唯一签名
- 查询 `ProcessedEvent` 表检查是否已处理
- 未处理则插入记录并处理

**5.5 实现余额更新**
- Deposit: `balance += amount`
- Withdraw: `balance -= amount`
- 使用 Prisma 事务更新

---

### Phase 6: 交易引擎

**6.1 创建 Order 模块**
- 生成 NestJS module: `nest g module order`
- 创建 `POST /order` endpoint
- 定义请求 DTO: `{ symbol, size, side }`

**6.2 创建 Price Service**
- 创建 `PriceService` 获取标记价格
- 集成 Hyperliquid API (`/info` endpoint)
- 实现价格缓存 (TTL: 5 秒)
- 实现 fallback/mock price

**6.3 实现仓位计算逻辑**
- 创建 `PositionService`
- 实现 `openPosition()`: 新建仓位
- 实现 `addToPosition()`: 加仓
- 实现 `reducePosition()`: 减仓
- 实现 `closePosition()`: 平仓
- 实现 `flipPosition()`: 反向

**6.4 实现 PnL 计算**
- Long: `pnl = size * (markPrice - entryPrice)`
- Short: `pnl = size * (entryPrice - markPrice)`
- 创建 `calculatePnL()` 函数

**6.5 创建持仓查询**
- 创建 `GET /position` endpoint
- 返回当前持仓 + 未实现 PnL

**6.6 实现订单撮合**
- 市价单立即以当前 mark price 成交
- 更新用户余额 (扣除保证金)
- 创建 Order 记录 (status: FILLED)
- 触发 Position 更新

---

### Phase 7: 对冲系统

**7.1 创建 Hedging 模块**
- 生成 NestJS module: `nest g module hedging`
- 创建 `HedgingService`

**7.2 实现 Mock Hedging**
- 环境变量 `HEDGING_MODE=mock|real`
- Mock 模式：仅记录日志到 `hedge_orders` 表
- 不发送真实请求

**7.3 实现 Hyperliquid 客户端**
- 创建 `HyperliquidClient` 类
- 实现 `placeOrder()` 方法
- 实现 `getPosition()` 方法
- 处理 API 认证 (私钥签名)

**7.4 实现对冲逻辑**
- 监听内部仓位变化
- 用户开 Long → Hyperliquid 开 Short
- 用户开 Short → Hyperliquid 开 Long
- 计算对冲数量

**7.5 实现对冲状态追踪**
- 记录每笔对冲订单
- 追踪对冲仓位 PnL
- 定时对账 (内部仓位 vs 对冲仓位)

---

### Phase 8: 前端

**8.1 配置 Wagmi/Viem**
- 创建 `wagmi.config.ts`
- 配置 chains (Hardhat localhost)
- 配置 connectors (Injected)
- 创建 `Web3Provider` 组件

**8.2 实现钱包连接**
- 创建 `ConnectWallet` 组件
- 显示连接状态
- 显示地址（截断）
- 支持断开连接

**8.3 实现登录流程**
- 创建 `useLogin()` hook
- 生成签名消息
- 调用 `POST /auth/login`
- 存储 session token

**8.4 创建存款页面 `/deposit`**
- 显示当前余额
- 显示 Vault 地址
- "Mint Test USDC" 按钮 (调用 `/faucet`)
- "Approve" 按钮 (ERC20 approve)
- "Deposit" 按钮 (调用 Vault.deposit)

**8.5 创建交易页面 `/trade`**
- 显示当前价格
- 创建订单表单 (symbol, size, side: Long/Short)
- 显示预估保证金
- 提交订单调用 `POST /order`

**8.6 创建持仓页面 `/positions`**
- 列表显示当前持仓
- 显示 entry price, mark price, size
- 实时计算并显示 PnL
- "Close Position" 按钮

**8.7 创建提款页面 `/withdraw`**
- 显示可提取余额
- 输入提款金额
- 调用 `POST /withdraw`
- 显示提款状态

---

### Phase 9: 集成与测试

**9.1 配置本地运行脚本**
- 创建 `scripts/start-dev.sh`
- 依次启动：docker-compose → backend → frontend

**9.2 端到端流程测试**
- 连接钱包
- 领取测试币
- 存款到 Vault
- 下市价单
- 验证持仓
- 提款

**9.3 编写 README**
- 项目概述
- 架构图
- 快速开始指南
- API 文档
- 环境变量说明

---

## Dependencies

```
Phase 1 → Phase 2, Phase 3
Phase 2 → Phase 5 (Indexer 需要合约部署)
Phase 3 → Phase 4 (API 需要数据库)
Phase 4 + Phase 5 → Phase 6 (交易引擎需要余额系统)
Phase 6 → Phase 7 (对冲需要仓位信息)
Phase 4 + Phase 6 → Phase 8 (前端需要 API)
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hardhat Network 不稳定 | HIGH | 使用固定版本，提供详细日志 |
| Hyperliquid API 限流 | MEDIUM | 实现缓存和重试逻辑 |
| 签名验证逻辑复杂 | MEDIUM | 使用 ethers.js 标准库 |
| 前端钱包连接兼容性问题 | MEDIUM | 使用 Wagmi 库处理兼容性 |
| 事件监听重复处理 | HIGH | 严格幂等性设计 |

---

## Estimated Complexity

**总体复杂度：MEDIUM-HIGH**

| Phase | 时间估算 | 复杂度 |
|-------|----------|--------|
| Phase 1 | 1-2h | Low |
| Phase 2 | 2-3h | Medium |
| Phase 3 | 1h | Low |
| Phase 4 | 2-3h | Medium |
| Phase 5 | 2-3h | Medium |
| Phase 6 | 3-4h | High |
| Phase 7 | 2-3h | High |
| Phase 8 | 4-6h | High |
| Phase 9 | 2-3h | Medium |
| **Total** | **19-30h** | |

---

## Success Criteria

- [ ] Docker Compose 一键启动所有服务
- [ ] 用户可以连接钱包并登录
- [ ] 用户可以领取测试币 (Mock USDC)
- [ ] 用户可以存入 USDC
- [ ] 用户可以下市价单
- [ ] 用户可以看到持仓和 PnL
- [ ] 系统自动在 Hyperliquid 对冲 (或 Mock 对冲)
- [ ] 用户可以提款

---

## Notes

等待用户确认后再开始执行。
