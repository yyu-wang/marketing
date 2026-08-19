# CopyWise 智能营销文案助手

CopyWise 是一款 AI 驱动的营销文案生成工具。用户输入产品描述与目标受众，AI 生成适用于小红书、朋友圈、广告语等渠道的营销文案，支持 SSE 流式输出、多轮对话、文案管理与数据看板。

Monorepo 单仓库，包含三个子项目：

| 子项目 | 说明 | 技术栈 | 端口 |
|--------|------|--------|------|
| [copywise-server/](./copywise-server/README.md) | 后端 API 服务 | NestJS 10 + TypeORM + MySQL + Redis + SSE | 3000 |
| [copywise-web/](./copywise-web/README.md) | 用户端 SPA | Vue 3 + Element Plus + Pinia + Vite | 5173 |
| [copywise-admin/](./copywise-admin/README.md) | 管理后台 SPA | React 19 + Ant Design 6 + Zustand + Vite | 5174 |

## 功能概览

- **AI 文案生成**：SSE 流式输出，多轮对话，支持图片理解（视觉模型），按渠道定制 Prompt
- **项目管理**：项目内组织文案，服务端归属校验防越权
- **文案管理**：收藏、编辑、单条 / 批量删除
- **数据看板**：渠道占比、收藏排行、7 日趋势
- **额度控制**：Redis Lua 原子扣减 + MySQL 双写，每日按自然日重置
- **管理后台**：用户管理、Prompt 模板管理、敏感词管理

## 目录结构

```
marketing/
├── copywise-server/    # 后端 API（NestJS）
├── copywise-web/       # 用户端（Vue 3）
├── copywise-admin/     # 管理后台（React 19）
├── .github/workflows/  # CI/CD（server / web / admin 部署）
├── REQUIREMENTS.md     # 产品需求规格说明书
├── CLAUDE.md           # 项目开发指南（架构、分层、代码规范）
└── AGENTS.md
```

## 快速开始

### 1. 启动后端依赖（MySQL + Redis）

```bash
cd copywise-server
docker compose up -d mysql redis
```

### 2. 后端 API

```bash
cd copywise-server
cp .env.example .env    # 填入 JWT_SECRET、AI_API_KEY
npm install
npm run migration:run
npm run start:dev       # http://localhost:3000
```

### 3. 用户端

```bash
cd copywise-web
npm install
npm run dev             # http://localhost:5173
```

### 4. 管理后台

```bash
cd copywise-admin
npm install
npm run dev             # http://localhost:5174
```

各端 Dev Server 均将 `/api` 反向代理到 `http://localhost:3000`，无需处理跨域。管理后台需使用管理员账号登录。

## 文档索引

| 文档 | 说明 |
|------|------|
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 产品需求规格说明书（PRD） |
| [CLAUDE.md](./CLAUDE.md) | 项目开发指南：架构、分层、代码规范、数据库实体 |
| [copywise-server/README.md](./copywise-server/README.md) | 后端：模块、接口清单、环境变量 |
| [copywise-web/README.md](./copywise-web/README.md) | 用户端：技术栈、目录、开发与部署 |
| [copywise-admin/README.md](./copywise-admin/README.md) | 管理后台：技术栈、目录、开发与部署 |

## 部署

GitHub Actions 工作流位于 `.github/workflows/`，基于 self-hosted runner：

| 工作流 | 部署目标 |
|--------|---------|
| `deploy-server.yml` | 后端 API 服务 |
| `deploy-web.yml` | 用户端静态站点 |
| `deploy-admin.yml` | 管理后台静态站点 |
