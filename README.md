# CopyWise 后端服务

智能营销文案助手（CopyWise）的后端实现，基于 **NestJS + TypeScript + MySQL + Redis**。  
对应《产品需求规格说明书 V1.0》MVP 范围。

## 目录结构

```
src/
├── ai/                 # AI 文案生成（SSE 流式 + 敏感词 + 超时熔断）
├── ai-provider/        # Provider 抽象与具体实现（通义千问）
├── analytics/          # 数据看板（渠道占比/收藏排行/7日趋势）
├── auth/               # 注册、登录、JWT 策略
├── common/             # 全局过滤器、拦截器、装饰器、守卫
├── config/             # （预留）配置加载相关
├── copy/               # 文案管理（列表/筛选/收藏/编辑/删除）
├── database/           # TypeORM 配置 / 实体 / Redis 模块 / 数据源
├── project/            # 项目管理（CRUD + 级联）
├── prompts/            # 渠道 Prompt 模板配置
├── quota/              # 额度管理（Redis Lua 原子扣减 + MySQL 双写）
├── app.module.ts       # 根模块
├── health.controller.ts# 健康检查 /api/health
└── main.ts             # 应用入口
```

## 快速开始

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 启动依赖
docker compose up -d mysql redis

# 3. 安装依赖
npm install

# 4. 开发模式
npm run start:dev
# 访问 http://localhost:3000/api/health
```

## 关键设计要点（与 PRD 对应）

| 模块 | 要点 | PRD 章节 |
|------|------|---------|
| Auth | bcrypt cost=12；JWT 7 天有效 | 4.2 / 7.2 |
| Quota | Redis Lua 原子扣减；MySQL 双写；UTC+8 重置 | 4.4.4 / 4.7 |
| AI | SSE 流式；首字超时熔断；失败不扣额度；敏感词过滤 | 4.4 / 5.4 |
| Project/Copy | 全部接口归属校验，防越权 | 7.2 |
| 响应 | 全局拦截器统一为 `{code,message,data}` | 9.2 |
| 错误 | 全局过滤器统一为 `{code,message,details}` | 9.3 |
| 鉴权 | 全局 JwtAuthGuard + `@Public()` 例外 | 4.2.3 |
| 限流 | ThrottlerGuard（IP 维度） | 7.2 |

## 接口清单（对照 PRD 9.1）

| 模块 | 方法 | 端点 |
|------|------|------|
| 健康 | GET | `/api/health` |
| 认证 | POST | `/api/auth/register` |
| 认证 | POST | `/api/auth/login` |
| 项目 | POST/GET/GET/PUT/DELETE | `/api/projects[/:id]` |
| AI | GET (SSE) | `/api/ai/generate/stream` |
| 文案 | GET | `/api/projects/:id/copies` |
| 文案 | PUT/PATCH/DELETE | `/api/copies/:id[/star]` |
| 文案 | DELETE | `/api/copies` (批量) |
| 额度 | GET | `/api/quota/today` |
| 看板 | GET | `/api/analytics/overview` |

## 测试与文档

```bash
# 单元测试（覆盖 Auth / Quota / AI 三大核心模块）
npm test

# 覆盖率报告
npm run test:cov

# OpenAPI 文档
# 启动服务后访问 http://localhost:3000/api/docs
# JSON 描述文件：http://localhost:3000/api/docs-json
```

## 后续工作

- [x] Migration 脚本（基于 entity 生成）
- [x] Jest 单元测试（Auth / Quota / AI）
- [x] OpenAPI 文档（@nestjs/swagger）
- [ ] e2e 测试（supertest）
- [ ] 埋点事件落库（对应 PRD 6.2）
- [ ] V2：管理后台、付费模式
