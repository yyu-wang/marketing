# Marketing Wise 后端服务

Marketing Wise（智能营销文案助手）的后端实现，基于 **NestJS + TypeScript + MySQL + Redis**，提供 AI 文案生成（SSE 流式）、多轮对话、项目管理、文案管理、数据看板与管理后台 API。对应 [REQUIREMENTS.md](../REQUIREMENTS.md)（产品需求规格说明书）范围。

## 目录结构

```
src/
├── admin/              # 管理后台：user-management / template-management / sensitive-word
├── ai/                 # AI 文案生成（SSE 流式 + 敏感词过滤）
├── ai-provider/        # AIProvider 抽象与实现（Qwen / DeepSeek，OpenAI 兼容协议）
├── analytics/          # 数据看板（渠道占比 / 收藏排行 / 7 日趋势）
├── auth/               # 注册、登录、JWT 策略、个人资料
├── common/             # 全局过滤器、拦截器、装饰器、守卫
├── conversations/      # 多轮对话：会话 / 消息 / 消息版本管理
├── copy/               # 文案管理（列表 / 收藏 / 编辑 / 删除 / 批量）
├── database/           # TypeORM 配置 / 实体 / 数据源 / 种子脚本
├── local-storage/      # 本地磁盘存储（@Global）
├── project/            # 项目管理（CRUD + 级联）
├── prompts/            # 渠道 Prompt 模板配置
├── quota/              # 额度管理（Redis Lua 原子扣减 + MySQL 双写）
├── upload/             # 文件上传 + /uploads 静态代理
├── app.module.ts       # 根模块
├── health.controller.ts# 健康检查 /api/health
└── main.ts             # 应用入口
```

## 快速开始

```bash
# 1. 复制环境变量
cp .env.example .env   # 填入 JWT_SECRET、AI_API_KEY

# 2. 启动依赖
docker compose up -d mysql redis

# 3. 安装依赖
npm install

# 4. 执行数据库迁移
npm run migration:run

# 5. 开发模式
npm run start:dev
# 访问 http://localhost:3000/api/health
```

> 首次使用管理后台，可执行 `npm run seed` 创建管理员账号。

## 脚本

| 命令 | 作用 |
|------|------|
| `npm run start:dev` | 开发启动（热重载，自动释放 3000 端口） |
| `npm run build` / `start:prod` | 生产构建 / 启动 |
| `npm test` / `test:cov` | 单元测试 / 覆盖率报告 |
| `npm run migration:generate -- <Name>` | 基于实体生成迁移 |
| `npm run migration:run` / `migration:revert` | 执行 / 回滚迁移 |
| `npm run seed` | 创建管理员账号 |
| `npm run lint` / `format` | ESLint 检查 / Prettier 格式化 |

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `3000` | 服务端口 |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | - | MySQL 连接（库名 `copywise`） |
| `DB_SYNC` | `false` | 生产必须 false，仅开发可开启自动建表 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | - | Redis 连接 |
| `JWT_SECRET` | - | JWT 签名密钥（必填） |
| `JWT_EXPIRES_IN` | `7d` | 令牌有效期 |
| `QUOTA_DAILY_DEFAULT` | `10` | 每日默认额度上限 |
| `QUOTA_TZ` | `Asia/Shanghai` | 自然日重置时区（UTC+8） |
| `AI_PROVIDER` | `qwen` | AI Provider：`qwen` / `deepseek` |
| `AI_API_KEY` | - | AI 服务密钥（必填） |
| `AI_BASE_URL` | - | OpenAI 兼容接口地址 |
| `AI_MODEL` | `qwen3-omni-flash` | 纯文本模型 |
| `AI_VISION_MODEL` | `qwen3.5-omni-plus-2026-03-15` | 含图片时的视觉模型 |
| `AI_TIMEOUT_MS` | `15000` | 首字超时熔断阈值 |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | 对外访问地址（上传文件回显等） |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | `60` / `60` | IP 维度限流窗口 / 上限 |
| `UPLOAD_DIR` | `./uploads` | 上传文件存储目录 |

## 关键设计要点

| 模块 | 要点 |
|------|------|
| Auth | bcrypt cost=12；JWT 7 天有效；密码错误与用户不存在统一提示（防用户枚举） |
| AI | SSE 流式输出；首字超时熔断；失败不扣额度；敏感词过滤 |
| Conversations | 懒创建（首条消息才建会话）；消息版本历史与恢复 |
| Quota | Redis Lua 原子扣减；MySQL 双写；每日 UTC+8 重置 |
| 文件上传 | multer 内存存储、20MB 限制、JPEG/PNG/WEBP 白名单，写入本地磁盘，经 `/uploads/:key` 代理读取 |
| 鉴权 | 全局 JwtAuthGuard + `@Public()` 例外；SSE 路径允许 query token（SSE 无法设置 header） |
| 限流 | ThrottlerGuard（IP 维度） |
| 响应 / 错误 | 全局拦截器统一 `{code,message,data}`；全局过滤器统一 `{code,message,details}` |

## 接口清单

| 模块 | 方法 | 端点 |
|------|------|------|
| 健康 | GET | `/api/health` |
| 认证 | POST | `/api/auth/register` |
| 认证 | POST | `/api/auth/login` |
| 认证 | PATCH | `/api/auth/profile` |
| 认证 | GET | `/api/auth/user/:id` |
| 项目 | POST / GET | `/api/projects` |
| 项目 | GET / PUT / DELETE | `/api/projects/:id` |
| AI | GET (SSE) | `/api/ai/chat/stream` |
| 对话 | GET / POST | `/api/conversations` |
| 对话 | GET / PATCH / DELETE | `/api/conversations/:id` |
| 对话 | POST | `/api/conversations/:id/messages` |
| 对话 | PUT | `/api/conversations/:conversationId/messages/:messageId` |
| 对话 | GET | `/api/conversations/:conversationId/messages/:messageId/versions` |
| 对话 | PATCH | `/api/conversations/:conversationId/messages/:messageId/versions/:versionId/restore` |
| 文案 | GET | `/api/projects/:projectId/copies` |
| 文案 | POST | `/api/copies/from-message` |
| 文案 | PUT / PATCH / DELETE | `/api/copies/:id[/star]` |
| 文案 | DELETE | `/api/copies`（批量） |
| 额度 | GET | `/api/quota/status` |
| 看板 | GET | `/api/analytics/overview` |
| 上传 | POST | `/api/upload` |
| 上传 | GET | `/api/uploads/:key`（代理读取） |
| 管理-用户 | GET / POST | `/api/admin/users` |
| 管理-用户 | PATCH / DELETE | `/api/admin/users/:id` |
| 管理-用户 | POST | `/api/admin/users/:id/reset-password` |
| 管理-模板 | GET / POST | `/api/admin/templates` |
| 管理-模板 | PATCH / DELETE | `/api/admin/templates/:id` |
| 管理-敏感词 | GET / POST | `/api/admin/sensitive-words` |
| 管理-敏感词 | PATCH / DELETE | `/api/admin/sensitive-words/:id` |

## 测试与文档

```bash
# 单元测试（覆盖 Auth / Quota / AI 等核心模块）
npm test

# 覆盖率报告
npm run test:cov

# OpenAPI 文档（非生产环境）
# 启动服务后访问 http://localhost:3000/api/docs
# JSON 描述文件：http://localhost:3000/api/docs-json
```

## 生产部署

本地 Docker Compose 提供 `mysql` / `redis` / `api` / `web` 四个服务；CI 部署见仓库根目录 `.github/workflows/deploy-server.yml`。
