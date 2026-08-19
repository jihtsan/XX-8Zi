# 玄序 · 命理饰品商城

一期包含响应式商城前台、客户订单页面、管理控制台和 Python API。商品以“矿物档案”方式展示，订单记录购买意向与库存预留；最终价格、付款、退款和交付均通过微信等站外渠道确认。

## 一键启动

macOS / Linux：

```bash
./start.sh
```

Windows：

```bat
start.bat
```

脚本会在首次运行时创建 Python 虚拟环境、安装后端依赖、启动 FastAPI，并启动前端开发服务器。

启动后访问：

- 商城：http://localhost:3000
- API 文档：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

## 开发体验账号

| 类型 | 账号 | 密码 |
| --- | --- | --- |
| 商城客户 | `13800138000` | `demo1234` |
| 后台管理员 | `admin` | `admin123!` |

开发环境注册短信验证码为 `123456`。正式部署前必须接入短信供应商、替换示例账号并启用安全 Cookie。

如需在客户创建订单后向飞书群发送内部通知，请在 `apps/api/.env` 中配置群自定义机器人的
`FEISHU_WEBHOOK_URL` 和签名校验密钥 `FEISHU_WEBHOOK_SECRET`。配置缺失或飞书请求失败不会影响
订单创建或取消；系统会以不同样式的飞书卡片通知新订单和客户取消事件。Webhook 地址和密钥不得
提交到仓库。

## 项目结构

```text
apps/
├── web/   # React + Next.js App Router 兼容前端
└── api/   # FastAPI + SQLAlchemy + SQLite API
docs/      # PRD、设计方向和架构决策
start.sh   # macOS / Linux 启动脚本
start.bat  # Windows 启动脚本
```

前端使用 Motion for React 实现克制的进入、轨道与交互动画，并尊重 reduced-motion。后端首次启动会执行 Alembic migration、创建 SQLite 数据库并写入示例商品。示例图片保留在项目中，启动时复制到本地媒体目录。

## 当前一期实现

- 商城首页与六件示例商品。
- 商品详情、规格选择和参考价展示。
- 客户注册、登录和独立管理员登录。
- 登录拦截、订单确认、库存预留、我的订单与订单详情联系商家。
- 后台商品上下架、主图和轮播图上传、图片排序、规格参考价和库存总量维护。
- 管理员订单确认、完成、取消与库存审计。
- 客户账户启停，以及商家微信号、联系说明和二维码图片上传。
- SQLite WAL、外键和 busy timeout 配置。
- API 与基础端到端数据流程测试。

运行时上传的图片保存在 `apps/api/data/uploads/` 下的商品与商家目录中，SQLite 只保存相对路径；该目录不会提交到 Git。部署时必须为 `apps/api/data` 挂载持久卷，并将 SQLite 数据库和 `uploads` 目录作为一个整体备份与恢复。

分类管理、短信发送与找回密码、24 小时 Celery 超时任务、状态显示样式配置和生产部署配置仍属于后续实现范围。

数据库升级命令：

```bash
cd apps/api
../../.venv/bin/python -m app.shared.migrate
```

migration 同时支持空数据库初始化和从一期基础结构升级；部署前仍需备份 SQLite 数据库和商品图片目录。

## 文档

- [产品需求](docs/product-requirements.md)
- [视觉设计](docs/design.md)
- [代理与技术规范](AGENTS.md)
- [领域语言](CONTEXT.md)
