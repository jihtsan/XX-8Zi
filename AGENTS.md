# XX-8Zi Agent Guide

本文件定义本仓库的技术方向和代理工作约束。产品需求以 `docs/product-requirements.md` 为准，领域语言以 `CONTEXT.md` 为准。

## 开始工作前

1. 涉及商品、库存、订单、登录或客户数据时，先阅读 `docs/product-requirements.md` 和 `CONTEXT.md`。
2. 涉及订单状态或库存预留时，再阅读 `docs/adr/` 下的相关决策记录。
3. 以现有配置、锁文件和代码为版本真相；框架行为只参考对应项目的官方文档。
4. 先检查工作区状态，保留用户已有变更，不把无关文件纳入提交。

## 技术方向

采用模块化单体架构。商城前台与管理后台共用一个前端应用，所有业务规则和数据写入由一个 Python API 应用负责。

| 层次 | 选择 |
| --- | --- |
| 前端 | Next.js App Router + React + TypeScript |
| 样式与组件 | Tailwind CSS + shadcn/ui；优先复用可访问性良好的基础组件 |
| 表单 | React Hook Form + Zod |
| 后端 | Python 3.14 + FastAPI + Pydantic v2 |
| 数据访问 | SQLAlchemy 2.x async + asyncpg |
| 数据迁移 | Alembic |
| 主数据库 | PostgreSQL |
| 异步任务 | Celery + Redis；使用 Celery Beat 周期扫描超时订单 |
| 图片存储 | S3 兼容对象存储；本地开发使用兼容服务或本地适配器 |
| Python 工具链 | uv + Ruff + mypy + pytest |
| 前端工具链 | pnpm + ESLint + Prettier + Vitest + Playwright |
| API 合约 | REST JSON + OpenAPI，统一前缀 `/api/v1` |
| 部署 | 容器化部署；本地使用 Docker Compose 编排依赖服务 |

依赖版本必须由锁文件固定。升级框架、数据库或运行时的大版本前，先说明迁移影响并建立 ADR。

## 仓库结构

项目初始化后使用以下结构：

```text
/
├── apps/
│   ├── web/                 # Next.js 商城前台与管理后台
│   └── api/                 # FastAPI 模块化单体
├── docs/
│   ├── adr/                 # 架构决策记录
│   └── product-requirements.md
├── infra/                   # Docker、部署和本地基础设施配置
├── AGENTS.md
└── CONTEXT.md
```

不要为商城和后台复制两套前端工程。使用同一个 Next.js 应用，通过路由组和独立布局隔离两种体验：

```text
apps/web/src/app/
├── (storefront)/            # 公开商城及客户中心
├── admin/                   # 独立后台入口与布局
└── auth/                    # 客户认证页面
```

FastAPI 按业务能力组织模块，不按 controller/service/model 等技术类型横向堆放：

```text
apps/api/app/
├── catalog/                 # 分类、商品、可售规格、图片
├── identity/                # 客户与管理员认证
├── ordering/                # 订单、状态流转、商品快照
├── inventory/               # 库存、预留、释放、损耗与审计
├── merchant_settings/       # 商家微信与展示配置
├── shared/                  # 数据库、配置、通用错误等稳定基础设施
└── main.py
```

模块通过明确的公开接口协作。共享目录只接收真正跨域且稳定的基础设施，不作为杂物目录。

## 前端规则

### 渲染边界

- 商品首页、分类、列表和详情优先使用 Server Components，以支持搜索引擎抓取和较快首屏。
- 表单、规格选择、登录状态和后台交互使用 Client Components。
- 只在需要事件、浏览器 API 或客户端状态的最小边界添加 `"use client"`。
- Next.js 不保存业务真相，也不直接写数据库；所有业务读写通过 FastAPI。

### API 与类型

- FastAPI 的 OpenAPI 是前后端接口的唯一合约来源。
- 从 OpenAPI 生成 TypeScript 类型或客户端，避免手写重复 DTO。
- 前端不得自行复制订单状态、库存公式或权限规则；稳定状态代码由 API 返回。
- 页面展示使用后端返回的参考价、可售状态和当前状态配置。

### 界面隔离

- 商城客户会话与管理员会话使用不同 cookie 名称、登录入口和路由保护。
- 后台路由必须同时在前端导航层和后端 API 层验证管理员身份。
- 商品二维码只在下单成功页和订单详情展示。
- 表单错误需要保留有效输入，并展示可操作的中文错误信息。

## 后端规则

### API 与模型

- 使用 Pydantic 模型定义请求和响应；数据库 ORM 模型不得直接作为公开响应。
- 路由层只处理 HTTP、认证和输入输出映射，业务规则放在所属领域模块的应用服务中。
- 使用统一错误结构，至少包含稳定错误代码、用户可读信息和可选字段错误。
- 数据库时间统一保存为 UTC，API 使用带时区的 ISO 8601，前端按用户时区显示。

### 事务与并发

- PostgreSQL 是订单、库存和幂等性的唯一事实来源；Redis 不保存不可恢复的业务状态。
- 创建订单与库存预留必须在同一数据库事务中完成。
- 取消订单与释放预留必须在同一数据库事务中完成。
- 完成订单时原子减少库存总量和已预留数量，使可售库存保持不变。
- 状态流转使用稳定状态代码和条件更新；并发的确认、取消或超时任务只能有一个成功。
- 使用数据库唯一约束或幂等键阻止重复订单，不能只依赖前端按钮禁用或 Redis 锁。
- 对库存行使用明确的行级锁或等价条件更新，并为竞争条件编写集成测试。

### 异步任务

- Celery Beat 周期扫描超过24小时且仍为待确认的订单；不要为每张订单创建一个长期 ETA 任务。
- 超时任务调用与普通取消相同的领域服务，并保持幂等。
- Redis 可以承担 Celery broker、短信频率限制和短期缓存，但缓存失效不得破坏业务正确性。
- 短信发送失败需要可重试；验证码、手机号和供应商响应不得以明文写入普通日志。

### 认证与安全

- 密码使用当前可靠的自适应哈希算法，通过成熟库实现。
- 客户注册和找回密码需要短信验证码；验证码具有有效期、频率和尝试次数限制。
- 浏览器会话使用 `HttpOnly`、`Secure`、合适的 `SameSite` cookie，并具备 CSRF 防护。
- 客户与管理员使用分离的认证域；管理员接口不得接受客户凭据。
- 机密信息通过环境变量或密钥管理服务注入，仓库只提交 `.env.example`。

### 数据迁移

- 所有数据库结构变更通过 Alembic migration 提交。
- migration 需要可在空数据库执行，也需要验证从上一版本升级。
- 迁移中进行大规模数据重写时，将结构变更和数据回填拆开，说明回滚方案。

## 测试与完成标准

### 后端

- 单元测试覆盖领域状态机和纯业务规则。
- PostgreSQL 集成测试覆盖订单创建、库存预留、并发下单、确认、取消、完成和24小时超时。
- API 测试覆盖客户与管理员身份隔离、越权访问和输入校验。
- 修改 Python 代码后运行 Ruff、mypy 和相关 pytest；提交前运行完整后端测试。

### 前端

- Vitest 覆盖表单、状态映射和关键交互。
- Playwright 覆盖公开浏览、登录后立即购买、客户取消待确认订单及管理员订单处理。
- 修改前端代码后运行 ESLint、Prettier 检查、TypeScript 检查和相关测试；提交前运行完整前端测试。

### 交付门槛

变更完成需要同时满足：

1. 需求中的相关验收标准有代码或测试对应。
2. OpenAPI、前端生成类型和实现保持一致。
3. 数据库迁移、事务边界、权限和失败路径已经验证。
4. 没有提交凭据、缓存、构建产物或无关文件。
5. 相关检查通过，验证命令和结果写入 PR 描述。

## Git 与变更流程

- 本项目托管在 Gitee，已获用户明确豁免创建 GitHub Issue。
- 从 `main` 创建 `codex/` 前缀的独立分支，不直接在默认分支修改。
- 只暂存本次任务文件，提交信息使用简洁的 Conventional Commits 风格。
- 推送分支并创建 Gitee Pull Request；PR 描述说明变更、验证结果和风险。
- 满足仓库审查、测试和合并要求后合并，并确认 `main` 包含变更。

## 官方参考

- Next.js App Router：https://nextjs.org/docs/app
- FastAPI：https://fastapi.tiangolo.com/
- SQLAlchemy 2 asyncio：https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- PostgreSQL 并发控制：https://www.postgresql.org/docs/current/mvcc.html
- Celery：https://docs.celeryq.dev/en/stable/
- uv：https://docs.astral.sh/uv/
