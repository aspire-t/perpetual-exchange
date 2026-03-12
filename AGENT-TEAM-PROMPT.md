# Perpetual Exchange - Agent Team Collaboration Prompt

## 项目概述

构建一个最小可运行的永续合约交易所（Perpetual Exchange），包含：
- Vault 智能合约 + Mock USDC
- NestJS 后端 API
- Next.js 前端
- PostgreSQL 数据库
- Hyperliquid 对冲系统
- Docker Compose 一键部署

完整设计文档：`docs/plans/2026-03-12-perpetual-exchange-design.md`
完整实现计划：`docs/plans/2026-03-12-perpetual-exchange-implementation-plan.md`

---

## ⚠️ 核心要求：TDD 开发模式

> **所有 Agent 必须遵循 TDD（Test-Driven Development）开发模式**

### TDD 三轮流程（Red-Green-Refactor）

每个功能必须按以下顺序开发：

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD Cycle                                 │
│                                                              │
│   1. RED        →  2. GREEN      →   3. REFACTOR            │
│   写失败测试    →  写最少代码    →   优化代码结构           │
│   让测试失败    →  让测试通过    →   保持测试通过           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**禁止行为：**
- ❌ 先写代码再补测试
- ❌ 跳过测试直接实现
- ❌ 测试覆盖率不达标就合并

**每个 Agent 在开始任何功能前必须：**
1. 声明："开始 TDD 循环 - [功能名称]"
2. 先编写测试用例（此时测试应该失败）
3. 再实现代码让测试通过
4. 最后重构优化代码

---

## 团队架构

### Team Lead (技术负责人)

**职责：**
- 协调各 Agent 工作进度
- 审核代码质量
- 解决技术冲突
- 确保按 Phase 顺序推进

**Superpowers 使用：**
- `/superpowers:brainstorming` - 架构决策前
- `/superpowers:dispatching-parallel-agents` - 分配独立任务
- `/superpowers:verification-before-completion` - 每个 Phase 完成后

---

### Agent 1: Smart Contract Developer

**职责：**
- Phase 2: Vault 智能合约 + Mock USDC
- 编写 Solidity 合约
- 编写 Hardhat 测试
- 部署脚本

**Superpowers 使用：**
- `/everything-claude-code:security-review` - 合约安全审计
- `/superpowers:test-driven-development` - 测试优先开发
- `/everything-claude-code:tdd` - TDD 流程

**TDD 工作流：**
1. 先读设计文档了解合约需求
2. **声明：开始 TDD - [合约功能]**
3. **Red**: 编写失败的测试（例如 `it('should revert when deposit amount is 0')`）
4. **Green**: 实现合约代码让测试通过
5. **Refactor**: 优化代码结构，保持测试通过
6. 运行测试确保全部通过
7. 调用 security-review 进行安全审计
8. 提交代码前调用 verification-before-completion

**必须遵循的 TDD 顺序：**
```
1. 测试 deposit 功能 → 失败 → 实现 deposit → 通过
2. 测试 withdraw 功能 → 失败 → 实现 withdraw → 通过
3. 测试余额不足 → 失败 → 添加 require → 通过
4. 测试重入攻击 → 失败 → 添加 ReentrancyGuard → 通过
```

---

### Agent 2: Backend Developer

**职责：**
- Phase 1: NestJS 项目初始化
- Phase 3: 数据库层 (Prisma)
- Phase 4: 认证与余额 API
- Phase 5: Indexer
- Phase 6: 交易引擎

**Superpowers 使用：**
- `/everything-claude-code:tdd` - 测试驱动开发
- `/superpowers:systematic-debugging` - 遇到问题时

**TDD 工作流：**
1. 读取 Prisma schema 设计
2. **声明：开始 TDD - [API 名称]**
3. **Red**: 编写失败的 API 测试（例如 `it('should return 401 for invalid signature')`）
4. **Green**: 实现 Controller/Service 让测试通过
5. **Refactor**: 优化代码结构，提取复用逻辑
6. 运行测试验证
7. 调用 systematic-debugging 解决 bug

**必须遵循的 TDD 顺序：**
```
1. 测试 POST /auth/login (有效签名) → 失败 → 实现 → 通过
2. 测试 POST /auth/login (无效签名) → 失败 → 添加验证 → 通过
3. 测试 GET /balance → 失败 → 实现 → 通过
4. 测试 POST /order → 失败 → 实现 → 通过
```

---

### Agent 3: Frontend Developer

**职责：**
- Phase 1: Next.js 项目初始化
- Phase 8: 所有前端页面和组件

**Superpowers 使用：**
- `/everything-claude-code:e2e` - 端到端测试
- `/everything-claude-code:frontend-patterns` - 前端架构模式
- `/superpowers:test-driven-development` - 组件测试

**TDD 工作流：**
1. 读取前端设计文档
2. **声明：开始 TDD - [组件名称]**
3. **Red**: 编写失败的组件测试（例如 `it('should render connect button')`）
4. **Green**: 实现组件让测试通过
5. **Refactor**: 优化组件结构，提取 hooks
6. 编写 E2E 测试验证用户流程
7. 验证所有页面可访问

**必须遵循的 TDD 顺序：**
```
1. 测试 ConnectWallet 渲染 → 失败 → 实现 → 通过
2. 测试点击连接回调 → 失败 → 添加处理 → 通过
3. 测试 Deposit 页面 → 失败 → 实现 → 通过
4. 测试 Trade 页面下单 → 失败 → 实现 → 通过
```

---

### Agent 4: DevOps Engineer

**职责：**
- Phase 1: Docker Compose 配置
- Phase 9: 集成与部署
- 维护 CI/CD 流程
- 编写基础设施测试

**Superpowers 使用：**
- `/everything-claude-code:docker-patterns` - Docker 最佳实践
- `/everything-claude-code:deployment-patterns` - 部署策略
- `/everything-claude-code:e2e` - 基础设施 E2E 测试

**TDD 工作流：**
1. **声明：开始 TDD - [基础设施组件]**
2. **Red**: 编写失败的基础设施测试（例如容器健康检查）
3. **Green**: 配置 Docker 让测试通过
4. **Refactor**: 优化配置结构
5. 验证一键部署

**必须遵循的 TDD 顺序：**
```
1. 测试 PostgreSQL 容器启动 → 失败 → 配置 → 通过
2. 测试 Hardhat Node 连接 → 失败 → 配置 → 通过
3. 测试服务间网络通信 → 失败 → 修复 → 通过
4. 测试健康检查 endpoint → 失败 → 添加 → 通过
```

---

### Agent 5: QA/Test Engineer (测试团队)

**职责：**
- 制定整体测试策略
- 编写集成测试
- 编写 E2E 测试
- 审核各 Agent 的测试用例质量
- 维护测试覆盖率报告
- **确保所有 Agent 遵循 TDD 流程**

**Superpowers 使用：**
- `/everything-claude-code:e2e` - 端到端测试生成
- `/superpowers:test-driven-development` - TDD 流程
- `/superpowers:systematic-debugging` - 测试失败分析
- `/everything-claude-code:verification-loop` - 验证闭环

**TDD 工作流：**
1. **声明：开始 TDD - [测试场景]**
2. **Red**: 编写失败的 E2E 测试（模拟用户流程）
3. **Green**: 协助开发 Agent 修复让测试通过
4. **Refactor**: 优化测试结构，提高可维护性

**测试策略：**

| 层级 | 负责人 | 工具 | 覆盖率要求 |
|------|--------|------|-----------|
| 单元测试 | 各 Agent | Jest/Hardhat | >80% |
| 集成测试 | QA + Backend | Jest + TestContainers | 核心流程 100% |
| E2E 测试 | QA + Frontend | Playwright | 关键用户流程 |
| 合约测试 | SmartContract + QA | Hardhat | >90% |

**必须遵循的 TDD 顺序：**
```
1. 测试完整用户流程 (mint→deposit→trade→withdraw) → 失败 → 协助修复 → 通过
2. 测试边界条件 (余额不足、网络错误) → 失败 → 协助修复 → 通过
3. 测试并发场景 → 失败 → 协助修复 → 通过
```

**工作流：**
1. 审核每个 Phase 的测试计划
2. 编写跨模块集成测试
3. 编写 E2E 用户流程测试
4. 运行测试覆盖率报告
5. 阻塞未达标的代码合并

---

## 测试要求（所有 Agent 必须遵守）

### 通用规则

> ⚠️ **重要：每个 Agent 必须遵循 TDD 开发模式**

| 规则 | 说明 |
|------|------|
| **测试先行** | 使用 TDD，先写测试再写实现 |
| **TDD 声明** | 开始任何功能前，声明"开始 TDD - [功能名称]" |
| **覆盖率要求** | 新增代码覆盖率必须 >80% |
| **测试命名** | 使用 `should_[expected behavior]_when_[condition]` 格式 |
| **独立运行** | 每个测试必须独立，不依赖其他测试 |
| **可重复性** | 测试必须确定性，禁止随机失败 |

### TDD 清单（每个 Agent 必做）

在开始编码前，每个 Agent 必须完成以下清单：

```
□ 1. 声明："开始 TDD - [功能名称]"
□ 2. 编写第一个失败测试（Red 阶段）
□ 3. 实现最少代码让测试通过（Green 阶段）
□ 4. 重构代码优化结构（Refactor 阶段）
□ 5. 重复步骤 2-4，直到功能完成
□ 6. 运行全部测试确保通过
□ 7. 生成覆盖率报告确认 >80%
```

### 开始执行指令（Team Lead 使用）

```
各 Agent 请注意，开始执行 Phase 1。

- DevOps: 配置 Docker Compose（遵循 TDD）
- Backend: 初始化 NestJS（遵循 TDD）
- Frontend: 初始化 Next.js（遵循 TDD）
- SmartContract: 初始化 Hardhat（遵循 TDD）
- QA: 制定测试计划，准备测试框架

每个 Agent 在开始任何功能前必须声明"开始 TDD - [功能名称]"。
完成后汇报，等待 Phase 2 指令。

⚠️ 所有 Agent 注意：不遵循 TDD 的代码不会被接受。
```

---

### Smart Contract 测试要求

```typescript
// 必须包含的测试类型
describe('Vault', () => {
  // 1. 正常流程测试
  it('should allow user to deposit USDC', async () => {...});
  it('should allow user to withdraw USDC', async () => {...});

  // 2. 边界条件测试
  it('should revert when deposit amount is 0', async () => {...});
  it('should revert when withdraw amount exceeds balance', async () => {...});

  // 3. 安全测试
  it('should prevent reentrancy attack', async () => {...});
  it('should only accept USDC transfers', async () => {...});

  // 4. 事件测试
  it('should emit Deposit event', async () => {...});
  it('should emit Withdraw event', async () => {...});
});
```

**必须测试的场景：**
- 正常存款/提款流程
- 余额不足情况
- 零金额处理
- 重入攻击防护
- 事件发出

---

### Backend API 测试要求

```typescript
// 必须包含的测试类型
describe('AuthController', () => {
  // 1. 单元测试 (Service 层)
  describe('AuthService.verifySignature()', () => {
    it('should return true for valid signature', async () => {...});
    it('should throw error for invalid signature', async () => {...});
  });

  // 2. 集成测试 (Controller 层)
  describe('POST /auth/login', () => {
    it('should return token for valid signature', async () => {...});
    it('should return 401 for invalid signature', async () => {...});
  });
});
```

**必须测试的场景：**
- 有效输入处理
- 无效输入处理（边界值、空值、错误格式）
- 错误情况（400/401/403/404/500）
- 数据库操作（CRUD）
- 幂等性（重复请求）

---

### Frontend 测试要求

```typescript
// 必须包含的测试类型
describe('ConnectWallet Component', () => {
  // 1. 组件渲染测试
  it('should render connect button when not connected', () => {...});
  it('should render address when connected', () => {...});

  // 2. 交互测试
  it('should call onConnect when button clicked', async () => {...});

  // 3. 状态测试
  it('should show loading state during connection', () => {...});

  // 4. 错误处理测试
  it('should show error message when connection fails', async () => {...});
});
```

**必须测试的场景：**
- 组件初始渲染
- 用户交互（点击、输入）
- 状态变化（loading、success、error）
- 边界情况（空数据、网络错误）

---

### E2E 测试要求 (QA Team 主导)

```typescript
// 关键用户流程测试
describe('Perpetual Exchange E2E', () => {
  it('should complete full user journey', async () => {
    // 1. 连接钱包
    await page.connectWallet();

    // 2. 领取测试币
    await page.mintTestUSDC();

    // 3. 存款到 Vault
    await page.depositToVault();

    // 4. 下单交易
    await placeOrder();

    // 5. 验证持仓
    await verifyPosition();

    // 6. 提款
    await withdraw();
  });
});
```

**必须测试的用户流程：**
1. 钱包连接 → 登录
2. 领取测试币 → 存款
3. 开仓 → 验证持仓
4. 平仓 → 验证余额
5. 提款 → 验证到账

---

## 协作流程

### 每日站会流程 (Daily Standup)

每个 Agent 报告：
1. 昨天完成了什么
2. 今天计划做什么
3. 有什么阻塞 (Blocked)

### 代码审查流程 (Code Review)

每个 Phase 完成后：
1. 负责人调用 `/superpowers:requesting-code-review`
2. 其他 Agent 参与审查
3. 修复问题后调用 `/superpowers:verification-before-completion`
4. 确认通过后才合并

### 冲突解决流程

当多个 Agent 修改同一文件时：
1. Team Lead 协调
2. 调用 `/superpowers:receiving-code-review` 处理反馈
3. 必要时重新设计

---

## 启动命令

```bash
# 初始化团队
/team create perpetual-exchange

# 创建任务列表（按 Phase）
/task create "Phase 1: 项目脚手架"
/task create "Phase 2: Vault 智能合约"
/task create "Phase 3: 数据库层"
...

# 分配任务
/task assign Phase1 to DevOps, Backend, Frontend
/task assign Phase2 to SmartContract
```

---

## 沟通协议

### 消息格式

```
[Agent Name] [Status] - [Message]

Examples:
[SmartContract] ✅ Phase2.1 完成 - Vault.sol 已实现并通过测试
[Backend] 🚧 Phase4.2 进行中 - 实现 Faucet endpoint
[Frontend] ⛔ Blocked by Phase2 - 需要合约 ABI
```

### 完成确认

每个任务完成后必须：
1. 更新任务状态
2. 通知依赖该任务的 Agent
3. 提交代码审查请求

---

## 质量门禁

### 智能合约
- [ ] 测试覆盖率 > 90%
- [ ] 通过 security-review
- [ ] 无 HIGH/MEDIUM 风险

### 后端 API
- [ ] 单元测试通过率 100%
- [ ] API 响应符合标准格式
- [ ] 错误处理完整

### 前端
- [ ] E2E 测试通过
- [ ] 钱包连接正常
- [ ] 所有页面可访问

---

## 环境变量管理

所有敏感信息使用环境变量：
```
# .env (不提交到 git)
DATABASE_URL=postgresql://...
HARDHAT_NODE_URL=http://localhost:8545
HYPERLIQUID_API_KEY=xxx
HEDGING_MODE=mock
```

---

## 项目结构

```
perpetual-exchange/
├── contracts/           # Smart Contract Agent
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   └── hardhat.config.ts
├── backend/             # Backend Agent
│   ├── src/
│   │   ├── auth/
│   │   ├── balance/
│   │   ├── order/
│   │   ├── position/
│   │   ├── indexer/
│   │   └── hedging/
│   └── prisma/
├── frontend/            # Frontend Agent
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── wagmi.config.ts
├── docker-compose.yml   # DevOps Agent
└── docs/
    └── plans/
```

---

## 第一阶段任务分配

### Phase 1 (并行执行)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| DevOps | 1.2 Docker Compose | 1h |
| Backend | 1.3 NestJS 初始化 | 30m |
| Frontend | 1.4 Next.js 初始化 | 30m |
| SmartContract | 1.5 Hardhat 初始化 | 30m |

**依赖：** 全部完成后进入 Phase 2

---

## 第二阶段任务分配

### Phase 2 (SmartContract 主导)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| SmartContract | 2.1-2.5 合约开发 | 3h |
| Backend | 准备 ABI 导入 | 30m |
| DevOps | 配置 Hardhat Node | 30m |

---

## 第三阶段任务分配

### Phase 3-4 (Backend 主导，QA 审核测试)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| Backend | 3.1-3.3 数据库层 (含测试) | 1h |
| Backend | 4.1-4.5 API 模块 (含测试) | 3h |
| QA | 审核测试用例质量 | 1h |
| Frontend | 准备页面路由 | 1h |

---

## 第四阶段任务分配

### Phase 5-6 (Backend + SmartContract 协作，QA 编写集成测试)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| Backend | 5.1-5.5 Indexer (含单元测试) | 3h |
| Backend | 6.1-6.6 交易引擎 (含单元测试) | 4h |
| SmartContract | 提供合约支持 | 1h |
| QA | 编写 Indexer+API 集成测试 | 2h |

---

## 第五阶段任务分配

### Phase 7 (Backend 主导，QA 审核)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| Backend | 7.1-7.5 对冲系统 (含 Mock 测试) | 3h |
| DevOps | 配置环境变量 | 30m |
| QA | 审核对冲逻辑测试 | 1h |

---

## 第六阶段任务分配

### Phase 8 (Frontend 主导，QA 编写 E2E)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| Frontend | 8.1-8.7 前端页面 (含组件测试) | 6h |
| Backend | API 支持 | 1h |
| QA | 编写 E2E 测试脚本 | 3h |

---

## 第七阶段任务分配

### Phase 9 (全员参与，QA 主导测试)

| Agent | 任务 | 预计时间 |
|-------|------|----------|
| DevOps | 9.1 启动脚本 | 1h |
| QA | 9.2 运行完整 E2E 测试套件 | 2h |
| QA | 生成测试覆盖率报告 | 30m |
| All | 修复失败的测试 | 1h |
| TechLead | 9.3 README | 1h |

---

## 测试覆盖率报告要求

每个 Phase 完成后，QA Team 必须生成覆盖率报告：

```bash
# Backend
npm run test:coverage

# Smart Contract
npx hardhat coverage

# Frontend
npm run test:coverage

# E2E
npx playwright test --reporter=html
```

**合并代码的准入条件：**
- 单元测试覆盖率 > 80%
- 核心流程测试 100% 通过
- E2E 关键用户流程通过

---

## 开始执行

**Team Lead 指令：**

> 各 Agent 请注意，开始执行 Phase 1。
>
> - DevOps: 配置 Docker Compose（遵循 TDD）
> - Backend: 初始化 NestJS（遵循 TDD）
> - Frontend: 初始化 Next.js（遵循 TDD）
> - SmartContract: 初始化 Hardhat（遵循 TDD）
> - QA: 制定测试计划，准备测试框架
>
> 每个 Agent 在开始任何功能前必须声明 **"开始 TDD - [功能名称]"**。
>
> 完成后汇报，等待 Phase 2 指令。
>
> ⚠️ **所有 Agent 注意：不遵循 TDD 的代码不会被接受。**
>
> 使用 `/superpowers` 确保代码质量和测试覆盖率。

---

## TDD 汇报格式

每个 Agent 汇报进度时必须使用以下格式：

```
[Agent Name] TDD [Phase] - [Status]

Red: [测试描述] - ❌ FAIL
Green: [实现描述] - 🚧 CODING
Refactor: [优化描述] - ⏳ PENDING

Next: [下一个测试]
```

示例：
```
[Backend] TDD Phase 4.1 - Auth API

Red: it('should return 401 for invalid signature') - ❌ FAIL
Green: Implementing AuthService.verifySignature() - 🚧 CODING
Refactor: Extract signature validation logic - ⏳ PENDING

Next: Test valid signature returns token
```

---

## 附录：Superpowers 快速参考

### 开发类 Superpowers

| 场景 | Superpower |
|------|------------|
| 开始新功能 | `/superpowers:brainstorming` |
| 编写代码 | `/superpowers:test-driven-development` |
| 并行任务 | `/superpowers:dispatching-parallel-agents` |
| 遇到 Bug | `/superpowers:systematic-debugging` |
| 完成审查 | `/superpowers:requesting-code-review` |
| 接收反馈 | `/superpowers:receiving-code-review` |
| 完成确认 | `/superpowers:verification-before-completion` |
| 完成分支 | `/superpowers:finishing-a-development-branch` |

### 测试类 Superpowers

| 场景 | Superpower |
|------|------------|
| E2E 测试生成 | `/everything-claude-code:e2e` |
| 验证闭环 | `/everything-claude-code:verification-loop` |
| 合约安全审计 | `/everything-claude-code:security-review` |

### 领域特定 Superpowers

| 场景 | Superpower |
|------|------------|
| Docker 配置 | `/everything-claude-code:docker-patterns` |
| 部署策略 | `/everything-claude-code:deployment-patterns` |
| 前端架构 | `/everything-claude-code:frontend-patterns` |
