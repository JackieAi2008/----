# 09 构建、测试、运行

## 一次性环境
```powershell
# 1) Node 20+, pnpm 8+
# 2) 复制环境
Copy-Item server\.env.example server\.env -Force
# 3) 安装
cd server; pnpm install; cd ..
cd client; pnpm install; cd ..

# 4) 数据库
cd server
pnpm prisma:generate
pnpm prisma:migrate
pnpm db:seed
```

## 开发态
```powershell
# 后端
cd server; pnpm dev          # 默认 3000
# 前端
cd client; pnpm dev          # 默认 5173
```

## 一键脚本(`backend/scripts/dev/`)
- `start-all.ps1` 启动前后端
- `stop-all.ps1` 停掉
- `smoke-test.ps1` 冒烟(健康检查 + 登录)
- `preflight-check.ps1` 上线前自检
- `backup-db.ps1` / `harden-secrets.ps1`

## 测试
- 后端:`pnpm --filter server test`(Jest,见 `server/src/__tests__/`)
  - 已覆盖:auth、project、task、export、security(jwt/password/rateLimiter)
- 前端:`pnpm --filter client test`(至少 `stores/auth.test.ts`)

## 生产构建
```powershell
cd server; pnpm build; cd ..
cd client; pnpm build; cd ..
# 启动
cd server; pnpm start
```

## 端口约定
- 前端 5173(开发)/ 反代后的 80/443
- 后端 3000
- Web Push VAPID 密钥在 `.env`
