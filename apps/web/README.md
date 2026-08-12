# 玄序 Web

玄序商城前台与管理后台共用的 React / Next.js App Router 兼容应用，由 Vinext 构建。

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
```

默认访问 `http://localhost:8000/api/v1`。本地开发时请让站点与 API 使用相同主机名，避免浏览器把会话 Cookie 视为跨站 Cookie。可复制 `.env.example` 为 `.env.local` 修改 API 与站点地址；完整项目建议直接在仓库根目录执行 `start.sh` 或 `start.bat`。
