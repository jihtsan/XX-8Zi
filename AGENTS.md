# XX-8Zi Agent Guide

本文件定义本仓库的技术方向和代理工作约束。产品需求以 `docs/product-requirements.md` 为准，领域语言以 `CONTEXT.md` 为准。

## 开始工作前

1. 涉及商品、库存、订单、登录或客户数据时，先阅读 `docs/product-requirements.md` 和 `CONTEXT.md`。
2. 涉及界面、样式、组件或响应式布局时，先阅读 `docs/design.md`。
3. 涉及订单状态或库存预留时，再阅读 `docs/adr/` 下的相关决策记录。
4. 以现有配置、锁文件和代码为版本真相；框架行为只参考对应项目的官方文档。
5. 先检查工作区状态，保留用户已有变更，不把无关文件纳入提交。

## 技术方向

采用模块化单体架构。商城前台与管理后台共用一个前端应用，所有业务规则和数据写入由一个 Python API 应用负责。

| 层次 | 选择 |
| --- | --- |
| 前端 | Next.js App Router + React + TypeScript |
| 样式与组件 | Tailwind CSS + shadcn/ui；优先复用可访问性良好的基础组件 |
| 动效 | Motion for React；React Bits 仅按需引入经审查的 TypeScript + Tailwind 源码 |
| 表单 | React Hook Form + Zod |
| 后端 | Python 3.14 + FastAPI + Pydantic v2 |
| 数据访问 | SQLAlchemy 2.x async + aiosqlite |
| 数据迁移 | Alembic |
| 主数据库 | SQLite；启用 WAL、外键约束和合理的 busy timeout |
| 异步任务 | Celery + Redis；使用 Celery Beat 周期扫描超时订单 |
| 图片存储 | S3 兼容对象存储；本地开发使用兼容服务或本地适配器 |
| Python 工具链 | uv + Ruff + mypy + pytest |
| 前端工具链 | pnpm + ESLint + Prettier + Vitest + Playwright |
| API 合约 | REST JSON + OpenAPI，统一前缀 `/api/v1` |
| 部署 | 容器化部署；SQLite 文件挂载持久卷，本地使用 Docker Compose 编排依赖服务 |

依赖版本必须由锁文件固定。升级框架、数据库或运行时的大版本前，先说明迁移影响并建立 ADR。一期保持单个可写 API 实例；需要多实例写入、跨机器共享数据库或出现持续锁竞争时，先建立 ADR，再迁移到 PostgreSQL。

## 仓库结构

项目初始化后使用以下结构：

```text
/
├── apps/
│   ├── web/                 # Next.js 商城前台与管理后台
│   └── api/                 # FastAPI 模块化单体
├── docs/
│   ├── adr/                 # 架构决策记录
│   ├── design.md            # 视觉方向、组件和响应式规则
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

### 动效与视觉组件

- 颜色、透明度等简单悬停反馈优先使用 CSS；进入退出、布局、滚动和 SVG 动画使用 `motion` 包并从 `motion/react` 导入。
- 应用根部使用 `MotionConfig reducedMotion="user"`；大型位移、视差和持续动画还要通过 `useReducedMotion` 提供静态或淡入替代。
- 使用 `LazyMotion` 与 `m` 控制首屏体积；新增动效后检查产物体积、移动端帧率和布局稳定性。
- React Bits 是源码参考库，不是无条件启用的组件依赖。只引入所需的 TypeScript + Tailwind 版本，移除无关效果并接入本项目 Token。
- 引入 React Bits 源码前检查其直接依赖、键盘和触控行为、服务端渲染、静态降级与许可证；一期采用 CSS 或 Motion 版本，不引入仅为装饰服务的 GSAP、Three.js、WebGL 或平滑滚动依赖。
- React Bits 使用 MIT + Commons Clause。复制实质源码时保留版权和许可声明，并更新第三方声明；不得转售、再许可或单独分发这些组件。
- 动效只增强层级和反馈，不承载商品状态、订单状态或关键说明。详细视觉范围与验收规则见 `docs/design.md`。

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

- SQLite 是订单、库存和幂等性的唯一事实来源；Redis 不保存不可恢复的业务状态。
- 每个数据库连接启用 WAL、外键约束和 busy timeout；数据库文件必须位于可靠的本地持久卷，不放在网络文件系统中。
- 创建订单与库存预留必须在同一数据库事务中完成。
- 取消订单与释放预留必须在同一数据库事务中完成。
- 完成订单时原子减少库存总量和已预留数量，使可售库存保持不变。
- 写事务保持短小，事务内不调用短信、对象存储或其他网络服务。
- 状态流转使用稳定状态代码和带旧状态条件的 `UPDATE`；并发的确认、取消或超时任务只能有一个成功。
- 使用数据库唯一约束或幂等键阻止重复订单，不能只依赖前端按钮禁用或 Redis 锁。
- SQLite 不支持行级锁；库存扣减使用带库存条件的原子 `UPDATE`，并检查受影响行数，为竞争条件编写集成测试。

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
- 涉及 SQLite 不直接支持的表结构变更时，使用 Alembic batch migration，并验证数据和约束完整性。
- 迁移中进行大规模数据重写时，将结构变更和数据回填拆开，说明回滚方案。
- 部署前备份 SQLite 文件；备份与恢复流程必须经过演练。

## 测试与完成标准

### 后端

- 单元测试覆盖领域状态机和纯业务规则。
- SQLite 集成测试使用与生产相同的 PRAGMA 配置，覆盖订单创建、库存预留、并发下单、锁等待、确认、取消、完成和24小时超时。
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
- Motion for React：https://motion.dev/docs/react
- React Bits：https://reactbits.dev/showcase
- React Bits license：https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md
- FastAPI：https://fastapi.tiangolo.com/
- SQLAlchemy 2 asyncio：https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- SQLite WAL：https://www.sqlite.org/wal.html
- SQLite 外键：https://www.sqlite.org/foreignkeys.html
- Celery：https://docs.celeryq.dev/en/stable/
- uv：https://docs.astral.sh/uv/
