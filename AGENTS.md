# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

Marketing Wise（智能营销文案助手）— AI 驱动的营销文案生成工具，包含三个子项目：

| 项目 | 技术栈 | 端口 | 说明 |
|------|--------|------|------|
| `marketing-server/` | NestJS 10 + TypeORM + MySQL + Redis + SSE | 3000 | 后端 API 服务 |
| `marketing-web/` | Vue 3 + Element Plus + Pinia + Vite | 5173 | 用户端 SPA |
| `marketing-admin/` | React 19 + Ant Design 6 + Zustand + Vite | 5174 | 管理后台 SPA |

---

## 常用命令

### 后端 (marketing-server/)

```bash
npm run start:dev      # 开发启动 (热重载)
npm run build          # 生产构建
npm run start:prod     # 生产启动
npm run test           # 运行 Jest 单元测试
npm run test:e2e       # E2E 测试
npm run lint           # ESLint 检查
npm run format         # Prettier 格式化
npm run migration:generate -- src/database/migrations/<MigrationName>  # 生成迁移
npm run migration:run  # 执行迁移
npm run migration:revert  # 回滚迁移
```

### 前端 (marketing-web/)

```bash
npm run dev        # Vite 开发服务器 (端口 5173)
npm run build      # vue-tsc 类型检查 + Vite 构建
npm run preview    # 预览构建产物 (端口 4173)
npm run lint       # ESLint 检查
npm run type-check # 仅 vue-tsc 类型检查
```

### 管理后台 (marketing-admin/)

```bash
npm run dev        # Vite 开发服务器 (端口 5174)
npm run build      # tsc 类型检查 + Vite 构建
npm run preview    # 预览构建产物
npm run lint       # Oxlint 检查
```

### Docker 本地开发

```bash
cd marketing-server && docker compose up -d   # 启动 MySQL + Redis + API + Web
```

---

## 架构概览

### 后端分层 (NestJS)

```
Controller (薄层，仅调用 Service)
    ↓
Service (业务逻辑，所有权校验)
    ↓
Repository (TypeORM Custom Repository，数据访问)
```

- **全局设施**: JWT 认证守卫 (APP_GUARD)、ThrottlerGuard (APP_GUARD)、异常过滤器、响应转换拦截器、日志拦截器
- **@Public()** 装饰器标记无需认证的路由（health check、login、register）
- **@CurrentUser()** 参数装饰器提取 JWT payload (`{ sub, email, role }`)，可指定 key：`@CurrentUser('sub')`
- **AI Provider 模式**: `AIProvider` 接口 → `QwenProvider` 实现，工厂函数根据 `AI_PROVIDER` 环境变量动态选择
- **AI 流式响应**: Provider 生成 RxJS `Observable<string>`，Controller 通过 SSE (`@Sse()`) 推送给前端
- **Chat Prompt Builder**: `prompts/chat-prompt.ts` 构建多模态消息（文本 + 图片 data: URI），图片经 sharp 压缩
- **DTO 校验**: class-validator + class-transformer + ValidationPipe（全局 `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`）
- **Swagger**: `@nestjs/swagger`，非生产环境访问 `/api/docs`，所有接口标注 `@ApiBearerAuth('JWT')`
- **统一响应格式**: `{ code, data, message }`，分页 `{ list, total, page, pageSize }`
- **安全模式**: Service 层做所有权校验（`findOwnedOrFail()`），参数 `/api/ai/chat/stream` 路径允许 query token（SSE 无法设置 header）
- **Token 提取器**: Bearer header 优先，SSE 路径回退 query token
- **文件上传**: multer 内存存储，20MB 限制，JPEG/PNG/WEBP 白名单，写入本地磁盘（`UPLOAD_DIR`，默认 `./uploads`），经 `/uploads/:key` 代理读取

### 前端分层 (Vue 3)

```
View (页面，编排)
    ↓
Store (Pinia，状态 + 业务逻辑 + SSE 编排)
    ↓
API 层 (axios 封装 + SSE client)
    ↓
Component (纯展示)
```

- **路由**: Vue Router 4 history 模式，懒加载，`beforeEach` 认证守卫
- **HTTP**: axios 实例自动附加 Bearer Token，30s 超时，401 自动清除会话并跳转登录
- **SSE**: `@microsoft/fetch-event-source` 处理 AI 流式响应（支持 Authorization header + AbortController）
- **暗色主题**: 永久暗色模式，全局星空背景（CSS radial-gradient），毛玻璃效果（backdrop-filter），Element Plus 暗色 CSS 变量覆盖
- **Auth 页面**: 登录/注册页独立浅色主题（`auth-page.scss`），不在 AppLayout 内
- **启动顺序**: Pinia → auth.hydrate() → Router（确保路由守卫读取到已水合的 token）
- **懒创建**: 对话在用户发送第一条消息时才创建（不在进入页面时创建）
- **消息排序**: 服务端返回 DESC，getter 反转为 ASC 用于渲染
- **路径别名**: `@` → `./src`
- **Auto Import**: `unplugin-auto-import` 自动导入 Vue/Pinia/Router API，`unplugin-vue-components` 按需导入 Element Plus 组件

### 管理后台分层 (React 19)

```
View (Pages/Components，UI 渲染 + 用户交互)
    ↓
Store (Zustand，全局状态，唯一允许操作 localStorage 的层)
    ↓
API 层 (axios 封装，Bearer Token + 401 处理)
```

- **路由**: React Router v7 `createBrowserRouter` 扁平路由，`AuthGuard` 组件包裹受保护路由
- **AuthGuard**: 双重检查 — `isLoggedIn`（未登录跳转 `/login`）+ `isAdmin`（非管理员显示 403）
- **认证初始化**: Zustand store 创建时直接从 localStorage 读取 `admin-auth` key 水合状态，无需异步 hydrate
- **HTTP**: axios 实例 baseURL `/api`，15s 超时，请求拦截器注入 Bearer Token，响应拦截器 401 自动 logout
- **UI**: Ant Design 6 + `ConfigProvider` 中文 locale，零 CSS 文件，纯 inline style + Ant Design Token
- **CRUD 模式**: 页面 = 搜索栏 + Table + Modal(Form)，`destroyOnHidden` 清除表单残留，`Popconfirm` 包裹删除操作
- **自保护**: 用户管理页禁用当前登录用户的删除按钮
- **路径别名**: `@` → `./src`

---

## 数据库实体

| Entity | 表名 | 关键字段 |
|--------|------|---------|
| UserEntity | `users` | id, email (unique), passwordHash (bcrypt cost 12), role (admin/user), isActive, dailyQuota (可空，每日额度) |
| ProjectEntity | `projects` | id, userId (FK CASCADE), name (用户内唯一), productDesc, targetAudience |
| CopyEntity | `copies` | id, projectId (FK CASCADE), channel (xiaohongshu/moments/ad_slogan), content, isStarred, isEdited |
| ConversationEntity | `conversations` | id, userId (FK CASCADE), title |
| MessageEntity | `messages` | id, conversationId (FK CASCADE), role (user/assistant), content, imageUrls (JSON), status (pending/streaming/done/error) |
| MessageVersionEntity | `message_versions` | id, messageId (FK CASCADE), content (历史版本) |
| PromptTemplateEntity | `prompt_templates` | id, name, channel, content |
| QuotaRecordEntity | `quota_records` | id, userId, recordDate (user_id + record_date 唯一), usedCount, maxCount |
| SensitiveWordEntity | `sensitive_words` | id, word, category, isActive |

---

## 模块依赖（后端）

```
AppModule
  ├── ConfigModule (isGlobal)
  ├── TypeOrmModule (9 个 Entity)
  ├── ThrottlerModule
  ├── AdminModule (AuthModule + AdminGuard)
  ├── AnalyticsModule (依赖 CopyService 的聚合查询)
  ├── AuthModule (JWT + Passport，导出 AuthService + JwtStrategy)
  ├── CopyModule (V1 文案管理，导出 CopyService)
  ├── LocalStorageModule (@Global，本地磁盘存储)
  ├── UploadModule (依赖 LocalStorageService)
  ├── ConversationsModule (导出 TypeOrmModule + ConversationsService)
  ├── ProjectModule (项目 CRUD)
  ├── QuotaModule (每日生成额度，导出 QuotaService)
  ├── RedisModule (@Global，ioredis)
  └── AIModule (AIProviderModule + ConversationsModule)
```

---

## 关键约定

### 通用

- 单个文件 ≤ 500 行，单个函数 ≤ 80 行，函数参数 ≤ 4 个
- TypeScript 严格模式，禁止 `any`，禁止 `import *`
- 数字字面量（除 0、1、-1）必须定义为命名常量
- 禁止 `console.log`，使用框架内置 Logger 或 `message.error()/success()`
- Commit: Conventional Commits，分支: `feature/xxx | fix/xxx | hotfix/xxx | refactor/xxx`
- 不分层的变量/函数禁止拼音命名，禁止单字母变量（循环索引除外）

### 后端

- 每个功能模块独立 Module，Module 间通过 imports/exports 通信
- 使用 ConfigService + `.env.local/.env` 管理配置，禁止 `process.env` 裸调
- 关键操作（登录、注册、创建/修改/删除）使用 NestJS Logger 记录日志
- 数据库变更走 migration，禁止手动改表结构
- 密码 bcrypt hash，不区分"用户不存在"和"密码错误"（防用户枚举）
- API 统一前缀 `/api`

### 前端 (Vue)

- Composition API + `<script setup lang="ts">` 为默认写法
- Props 使用 `defineProps<{...}>()` 纯类型声明
- Emits 使用 `defineEmits<{...}>()` 函数签名语法
- 复用逻辑抽离为 Composable (`useXxx`) — 现有 `useDevice.ts`，新逻辑继续在此目录抽离
- 父子通信: props down / emit up，跨层级用 Pinia store
- 列表渲染 key 使用唯一业务 ID，禁止数组 index
- 副作用（定时器、事件监听、SSE stream）必须在 `onUnmounted` 清理
- 非首屏路由使用动态 `import()` 懒加载
- 组件命名: View 页面 `XxxView.vue`，组件 BEM 风格 scoped class

### 管理后台 (React)

- 函数组件 + Hooks 为默认写法，禁止 class 组件
- 复用逻辑抽离为自定义 Hook (`useXxx`)
- Props 类型以 `Props` 结尾
- Page 组件以 `Page` 结尾，命名导出
- 纯类型导入使用 `import type`（`verbatimModuleSyntax: true`）
- 禁止在渲染中创建内联函数/对象
- 新增管理页面步骤: types → api → pages → router → AdminLayout 菜单
