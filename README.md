# 中集智历

> 协同日历管理系统 - 一款面向团队的协作日历应用

## 项目简介

中集智历是一款协同日历管理系统，支持项目管理、任务分配、团队协作等功能。系统采用前后端分离架构，使用现代化的技术栈构建。

### 主要功能

- 用户认证（注册、登录、密码找回）
- 项目管理（创建、编辑、删除、邀请成员）
- 任务管理（创建、分配、状态跟踪、评论）
- 日历视图（月视图、周视图、日视图）
- 通知系统（任务提醒、项目邀请）
- 总结归档

## 技术栈

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue.js | 3.x | 渐进式JavaScript框架 |
| Vite | 5.x | 下一代前端构建工具 |
| TypeScript | 5.x | 类型安全的JavaScript |
| Tailwind CSS | 3.x | 原子化CSS框架 |
| Pinia | 2.x | Vue3官方状态管理 |
| Vue Router | 4.x | Vue3官方路由 |
| Axios | 1.x | HTTP请求库 |
| Lucide Icons | latest | 图标库 |
| ECharts | 5.x | 数据可视化 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 20.x LTS | JavaScript运行时 |
| Express | 4.x | Web应用框架 |
| TypeScript | 5.x | 类型安全的JavaScript |
| Prisma | 5.x | 现代化ORM |
| SQLite | 3.x | 轻量级数据库 |
| JWT | - | 身份认证 |
| bcryptjs | 2.x | 密码加密 |

## 项目结构

```
协同日历/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── api/           # API接口
│   │   ├── assets/        # 静态资源
│   │   ├── components/    # 公共组件
│   │   ├── composables/   # 组合式函数
│   │   ├── layouts/       # 布局组件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # 状态管理
│   │   ├── types/         # TypeScript类型
│   │   ├── utils/         # 工具函数
│   │   ├── views/         # 页面视图
│   │   ├── App.vue        # 根组件
│   │   └── main.ts        # 入口文件
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                 # 后端项目
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/   # 控制器
│   │   ├── middlewares/   # 中间件
│   │   ├── routes/        # 路由定义
│   │   ├── services/      # 业务逻辑
│   │   ├── types/         # TypeScript类型
│   │   ├── utils/         # 工具函数
│   │   └── app.ts         # 应用入口
│   ├── prisma/
│   │   ├── schema.prisma  # 数据库Schema
│   │   └── seed.ts        # 种子数据
│   ├── uploads/           # 文件上传目录
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                   # 项目文档
│   ├── 01-需求规格说明书.md
│   ├── 02-技术架构设计.md
│   ├── 03-数据库设计.md
│   ├── 04-API接口设计.md
│   ├── 05-前端设计规范.md
│   ├── 06-开发计划.md
│   └── 07-部署运维指南.md
│
└── README.md               # 项目说明
```

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0（推荐使用pnpm）

### 安装依赖

```bash
# 安装前端依赖
cd client
pnpm install

# 安装后端依赖
cd ../server
pnpm install
```

### 配置环境变量

```bash
# 复制后端环境变量模板
cd server
cp .env.example .env

# 编辑 .env 文件，修改必要配置
# 主要配置项：
# - JWT_SECRET: JWT密钥（生产环境必须修改）
# - DATABASE_URL: 数据库连接字符串
```

### 初始化数据库

```bash
cd server

# 生成Prisma客户端
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate

# 初始化种子数据
pnpm db:seed
```

### 启动开发服务器

```bash
# 启动后端服务（在server目录）
pnpm dev

# 启动前端服务（在client目录，新终端）
cd ../client
pnpm dev
```

### 访问应用

- 前端地址：http://localhost:5173
- 后端地址：http://localhost:3000
- API文档：http://localhost:3000/api/health

## 生产部署

### 构建项目

```bash
# 构建前端
cd client
pnpm build

# 构建后端
cd ../server
pnpm build
```

### 启动生产服务

```bash
cd server
pnpm start
```

### 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start dist/app.js --name cimc-calendar

# 设置开机自启
pm2 startup
pm2 save
```

## 默认账号

初始化数据库后，会创建一个超级管理员账号：

- 邮箱：admin@example.com
- 密码：admin123

**请在首次登录后立即修改密码！**

## 开发指南

### 代码规范

- 使用TypeScript进行类型检查
- 使用ESLint进行代码检查
- 组件命名使用PascalCase
- 文件命名使用camelCase或kebab-case

### Git提交规范

- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 重构
- test: 测试相关
- chore: 构建/工具相关

## 许可证

MIT License

## 联系方式

如有问题，请联系项目维护人员。
