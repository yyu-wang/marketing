# Marketing Wise 需求实施文档

> 最后更新：2026-08-19
> 状态：实施中

---

## 当前进度总览

| 优先级 | 总需求数 | 已完成 | 进行中 | 待开始 |
|--------|----------|--------|--------|--------|
| P1     | 5        | 5      | 0      | 0      |
| P2     | 7        | 7      | 0      | 0      |
| P3     | 5        | 3      | 2      | 0      |
| 合计   | 17       | 15     | 2      | 0      |

> **同步说明（2026-08-19）**
> - 本表以需求粒度统计，`已完成`=全部子项已勾选，`进行中`=部分子项未实现，`待开始`=未开始。
> - P1、P2 已全部完成；P3 仅剩**敏感词 Redis 热更新（P3-01c）/ AuthService 用户缓存（P3-02c）**。
> - 另有独立 React 管理后台 `marketing-admin/`（用户 / 模板 / 额度管理），与 `marketing-web/` 内嵌的 Vue 管理后台并存；本表未纳入该 SPA。

---

## 一、第一优先级：补全已有后端的前端页面（已完成）

> 后端 API 已完整就绪，仅需前端开发。

### 1.1 管理后台 — 路由与布局

**需求编号**: P1-01
**预估工作量**: 0.5 天
**涉及文件**: 前端新增

- [x] 新增 `/admin` 路由组，包含 `/admin/users` 和 `/admin/templates` 子路由
- [x] 创建 `AdminLayout.vue`：左侧边栏导航（用户管理 / 模板管理），右侧 `RouterView`
- [x] 路由守卫：非 admin 角色拒绝访问，跳转首页
- [x] `UserMenu.vue` 中根据 `role=admin` 显示"管理后台"入口

---

### 1.2 用户管理

**需求编号**: P1-02
**预估工作量**: 1 天
**涉及文件**: 前端新增，后端无需改动

- [x] **P1-02a 用户列表页** (`AdminUsersView.vue`)
  - 分页表格：邮箱、角色、状态（启用/停用）、注册时间
  - 顶部搜索框按邮箱模糊搜索
  - 操作列：编辑、重置密码、删除按钮
- [x] **P1-02b 新建用户对话框**
  - 表单：邮箱、密码、角色（user/admin 下拉）
  - 调 `POST /api/admin/users`
- [x] **P1-02c 编辑用户对话框**
  - 修改角色、启用/停用开关
  - 调 `PATCH /api/admin/users/:id`
  - 不能修改自己的角色、不能停用自己的账号（后端已保护，前端加提示）
- [x] **P1-02d 重置密码对话框**
  - 输入新密码，调 `POST /api/admin/users/:id/reset-password`
- [x] **P1-02e 删除用户**
  - 二次确认弹窗，调 `DELETE /api/admin/users/:id`
  - 不能删除自己（后端已保护，前端隐藏按钮）
- [x] **P1-02f 创建 API 模块** `src/api/admin.ts`
  - 封装所有 `/api/admin/users` 请求方法
- [x] **P1-02g 创建类型定义** `src/types/admin.ts`
  - `AdminUser`、`AdminUserListParams`、`CreateUserPayload`、`UpdateUserPayload`

**对应 API**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 分页列表，query: `page`, `pageSize`, `email?` |
| POST | `/api/admin/users` | 创建用户，body: `{email, password, role?}` |
| PATCH | `/api/admin/users/:id` | 更新角色/状态，body: `{role?, isActive?}` |
| POST | `/api/admin/users/:id/reset-password` | 重置密码，body: `{password}` |
| DELETE | `/api/admin/users/:id` | 删除用户 |

---

### 1.3 模板管理

**需求编号**: P1-03
**预估工作量**: 0.5 天
**涉及文件**: 前端新增，后端无需改动

- [x] **P1-03a 模板列表页** (`AdminTemplatesView.vue`)
  - 分页表格：名称、渠道、内容预览（截断）、更新时间
  - 顶部筛选：按名称搜索、按渠道下拉筛选
- [x] **P1-03b 新建/编辑模板对话框**
  - 表单：模板名称、渠道（xiaohongshu / moments / ad_slogan）、Prompt 内容（textarea）
  - 新建调 `POST /api/admin/templates`，编辑调 `PATCH /api/admin/templates/:id`
- [x] **P1-03c 删除模板**
  - 二次确认，调 `DELETE /api/admin/templates/:id`
- [x] **P1-03d API 模块补充**（合并到 `src/api/admin.ts`）
  - 封装所有 `/api/admin/templates` 请求方法

**对应 API**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/templates` | 分页列表，query: `page`, `pageSize`, `name?`, `channel?` |
| POST | `/api/admin/templates` | 创建模板，body: `{name, channel, content}` |
| PATCH | `/api/admin/templates/:id` | 更新模板 |
| DELETE | `/api/admin/templates/:id` | 删除模板 |

---

### 1.4 数据看板

**需求编号**: P1-04
**预估工作量**: 1 天
**涉及文件**: 前端新增，后端的 `AnalyticsModule` 需确认已挂载

- [x] **P1-04a 前置检查**
  - 确认 `AnalyticsModule` 已在 `AppModule` 中导入
  - 安装 `echarts` + `vue-echarts`（已在 `package.json` 依赖中，确认版本）
- [x] **P1-04b 看板页面** (`DashboardView.vue`)，路由 `/dashboard`
  - 顶部 3 张统计卡片：总文案数、总项目数、本周新增（从 overview 数据计算）
  - 渠道分布饼图（ECharts）
  - Top 5 精选文案列表
  - 7 日生成趋势折线图（ECharts）
- [x] **P1-04c 导航入口**
  - 侧边栏底部或 `UserMenu` 旁增加"数据看板"入口
- [x] **P1-04d API 模块** `src/api/analytics.ts`
  - 封装 `GET /api/analytics/overview`
- [x] **P1-04e 类型定义** `src/types/analytics.ts`
  - `AnalyticsOverview`、`ChannelDistribution`、`TopStarredCopy`、`DailyTrend`

**对应 API**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analytics/overview` | 返回 `{channelDistribution, topStarred, dailyTrend}` |

---

### 1.5 项目管理 + 文案库

**需求编号**: P1-05
**预估工作量**: 2 天
**涉及文件**: 后端挂载模块 + 前端新增

#### 1.5.1 后端：模块挂载

- [x] **P1-05a** 在 `AppModule` 中导入 `ProjectModule`
- [x] **P1-05b** 在 `AppModule` 中导入 `CopyModule`
- [x] **P1-05c** 验证所有 API 端点可正常访问
- [x] **P1-05d** 确认 `CopyEntity` 与 `ProjectEntity` 的关联正常

#### 1.5.2 前端：项目列表页

- [x] **P1-05e 路由** 新增 `/projects` 和 `/projects/:id`
- [x] **P1-05f 项目列表页** (`ProjectsView.vue`)
  - 卡片网格展示：项目名称、产品描述（截断）、目标受众、创建时间
  - 顶部"新建项目"按钮
  - 每个卡片：点击进入详情、更多菜单（编辑/删除）
- [x] **P1-05g 新建/编辑项目对话框**
  - 表单：项目名称（必填，50字）、产品描述（必填，500字）、目标受众（选填，200字）
  - 新建调 `POST /api/projects`，编辑调 `PUT /api/projects/:id`
- [x] **P1-05h 删除项目**
  - 二次确认（提示级联删除文案），调 `DELETE /api/projects/:id`

#### 1.5.3 前端：文案列表页

- [x] **P1-05i 文案列表页** (`ProjectDetailView.vue`)，路由 `/projects/:id`
  - 顶部项目信息卡片（名称、描述、受众）
  - 渠道 Tab 切换：全部 / 小红书 / 朋友圈 / 广告语
  - 文案卡片列表：内容、渠道标签、收藏状态、编辑状态、创建时间
  - 每项操作：编辑、收藏切换、删除
  - 排序切换：最新/最早
  - 批量选择 + 批量删除
- [x] **P1-05j 文案编辑对话框**
  - Textarea 编辑内容（1000字限制），调 `PUT /api/copies/:id`
- [x] **P1-05k 侧边栏导航入口**
  - 侧边栏底部增加"项目管理"入口

#### 1.5.4 API + 类型

- [x] **P1-05l API 模块** `src/api/project.ts` + `src/api/copy.ts`
- [x] **P1-05m 类型定义** `src/types/project.ts` + `src/types/copy.ts`

**对应 API**:
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/projects` | 列表 / 创建 |
| GET/PUT/DELETE | `/api/projects/:id` | 详情 / 更新 / 删除 |
| GET | `/api/projects/:projectId/copies` | 文案列表，query: `channel?`, `sort?` |
| PUT | `/api/copies/:id` | 编辑文案 |
| PATCH | `/api/copies/:id/star` | 收藏切换 |
| DELETE | `/api/copies/:id` | 删除单条 |
| DELETE | `/api/copies` | 批量删除，body: `{ids}` |

---

## 二、第二优先级：增强现有功能（已完成）

> 需前后端均有改动。

### 2.1 对话搜索

**需求编号**: P2-01
**预估工作量**: 0.5 天

**后端**:
- [x] **P2-01a** `ConversationsService.list` 增加 `keyword` 参数，按标题 LIKE 查询
- [x] **P2-01b** `GET /api/conversations` 增加可选 query 参数 `keyword`

**前端**:
- [x] **P2-01c** `ChatSidebar.vue` 顶部增加搜索输入框
- [x] **P2-01d** 输入防抖 300ms，调 `fetchList({ keyword })` 刷新列表

---

### 2.2 对话导出

**需求编号**: P2-02
**预估工作量**: 0.5 天
**涉及文件**: 纯前端

- [x] **P2-02a** `MessageList.vue` 或对话头部增加"导出"按钮
- [x] **P2-02b** 工具函数 `exportConversation(messages, title)` → 生成 Markdown 字符串
- [x] **P2-02c** 触发浏览器下载（`Blob` + `URL.createObjectURL`），文件名 `{title}-{date}.md`

---

### 2.3 消息编辑重发

**需求编号**: P2-03
**预估工作量**: 1 天

**后端**:
- [x] **P2-03a** 新增 `PUT /api/conversations/:conversationId/messages/:messageId`
  - 仅允许编辑 `role=user` 的消息
  - 编辑后删除该消息之后的所有消息（或标记为废弃）
  - 返回编辑后的 messageId，前端可重新触发生成

**前端**:
- [x] **P2-03b** `MessageBubble.vue` 用户消息增加"编辑"按钮（悬停显示）
- [x] **P2-03c** 点击编辑 → 消息内容变为可编辑 textarea → 确认后调 API → 自动重新生成 AI 回复

---

### 2.4 渠道/风格选择

**需求编号**: P2-04
**预估工作量**: 1 天

**后端**:
- [x] **P2-04a** SSE 接口 `GET /api/ai/chat/stream` 增加 query 参数 `channel`（xiaohongshu / moments / ad_slogan）
- [x] **P2-04b** `chat-prompt.ts` 根据 `channel` 参数构建不同的 system prompt
- [x] **P2-04c** 加载 `PromptTemplateEntity` 中对应渠道的模板（替代硬编码 prompt）

**前端**:
- [x] **P2-04d** `ChatInput.vue` 上方增加渠道选择器（Tab/下拉）
  - 选项：小红书 / 朋友圈 / 广告语，默认小红书
- [x] **P2-04e** 发送时携带 `channel` 参数到 SSE 请求

---

### 2.5 语气/长度控制

**需求编号**: P2-05
**预估工作量**: 0.5 天

**后端**:
- [x] **P2-05a** SSE 接口增加 query 参数 `tone`（professional / lively / literary）、`length`（short / medium / long）
- [x] **P2-05b** `chat-prompt.ts` 在 prompt 中追加语气和长度约束

**前端**:
- [x] **P2-05c** `ChatInput.vue` 增加可选配置：语气下拉、长度下拉
- [x] **P2-05d** 折叠在"高级选项"中，默认不展开

---

### 2.6 生成版本历史

**需求编号**: P2-06
**预估工作量**: 1.5 天

**后端**:
- [x] **P2-06a** 新增 `message_versions` 表迁移
  - 字段：`id`, `messageId` (FK), `version` (int), `content` (text), `createdAt`
- [x] **P2-06b** 创建 `MessageVersionEntity`
- [x] **P2-06c** `AIService.generateChat` 在生成完成时，将旧版本内容存入 `message_versions`
- [x] **P2-06d** 新增 `GET /api/conversations/:conversationId/messages/:messageId/versions`
- [x] **P2-06e** 新增 `PATCH /api/conversations/:conversationId/messages/:messageId/versions/:versionId/restore`

**前端**:
- [x] **P2-06f** `MessageBubble.vue` 助手消息增加版本切换器（版本下拉）
- [x] **P2-06g** 切换版本时用选中版本内容替换当前显示

---

### 2.7 配额系统

**需求编号**: P2-07
**预估工作量**: 1 天

**后端**:
- [x] **P2-07a** 创建 `QuotaRecordEntity`，映射已有 `quota_records` 表
- [x] **P2-07b** 创建 `QuotaService`
  - `getTodayUsage(userId)` → 今日已生成次数
  - `checkQuota(userId)` → 是否超限（每日上限默认 50 次）
  - `recordUsage(userId)` → 记录一次生成
- [x] **P2-07c** 创建 `QuotaGuard` 或在 `AIService` 中调用 `checkQuota`
  - 超限返回 429 `{code: 429, message: "今日生成次数已用完"}`
- [x] **P2-07d** 新增 `GET /api/quota/status` 返回 `{todayUsed, dailyLimit, remaining}`

**前端**:
- [x] **P2-07e** API 模块 `src/api/quota.ts`
- [x] **P2-07f** `ChatInput.vue` 下方显示"今日已用 X / 50"
- [x] **P2-07g** 额度用完时禁用输入框，提示"今日额度已用完，明天再来"

---

## 三、第三优先级：体验与运营（缺 P3-01c 敏感词 Redis 热更新、P3-02c AuthService 缓存、P3-03c 虚拟滚动）

### 3.1 敏感词库升级

**需求编号**: P3-01
**预估工作量**: 1 天

- [x] **P3-01a** 新增 `sensitive_words` 表迁移
  - 字段：`id`, `word` (varchar 100), `category` (varchar 50), `isActive` (boolean), `createdAt`
- [x] **P3-01b** 创建 `SensitiveWordEntity`
- [ ] **P3-01c** 重构 `SensitiveWordFilter`：启动时从 DB 加载词库到内存 DFA，支持 Redis Pub/Sub 热更新
- [x] **P3-01d** Admin 新增"敏感词管理"页（列表、新增、停用、删除）
- [x] **P3-01e** 敏感词命中时记录日志（`sensitive_word_hits` 表或日志文件）

---

### 3.2 Redis 缓存落地

**需求编号**: P3-02
**预估工作量**: 1 天

- [x] **P3-02a** 将 `RedisModule` 导入 `AppModule`
- [x] **P3-02b** `TemplateService` 缓存：`GET /api/admin/templates` 结果缓存 10 分钟，写操作后清除
- [ ] **P3-02c** `AuthService` 缓存用户信息（`findById` 缓存 5 分钟）
- [x] **P3-02d** Throttler 切换到 Redis 存储（`@nestjs/throttler-storage-redis`）
- [x] **P3-02e** 对话列表缓存（用户最近 100 条对话，写操作后刷新）

---

### 3.3 对话增强 — 体验细节

**需求编号**: P3-03
**预估工作量**: 0.5 天
**涉及文件**: 前端

- [x] **P3-03a** SSE 断开自动重连（指数退避：1s → 2s → 4s → 8s，最大 3 次）
- [x] **P3-03b** 网络离线检测（`navigator.onLine` + `online`/`offline` 事件），离线时显示顶部 Banner
- [x] **P3-03c** 侧边栏对话列表虚拟滚动（超过 100 条时，使用 Element Plus 虚拟列表或自行实现；因列表含日期分组头+条目变高结构，自行实现 `useVirtualList` 前缀和虚拟滚动，低于阈值时保持原渲染）
- [x] **P3-03d** 移动端响应式适配（侧边栏折叠为汉堡菜单）

---

### 3.4 从对话保存到项目

**需求编号**: P3-04
**预估工作量**: 1 天

**后端**:
- [x] **P3-04a** 新增 `POST /api/copies/from-message`
  - body: `{messageId, projectId, channel?}`
  - 将助手消息内容提取为 CopyEntity 记录
  - 自动识别内容中的平台特征设置 channel

**前端**:
- [x] **P3-04b** `MessageBubble.vue` 助手消息增加"保存到项目"按钮
- [x] **P3-04c** 弹出选择器：选择已有项目 / 新建项目 → 确认保存

---

### 3.5 部署与运维

**需求编号**: P3-05
**预估工作量**: 0.5 天

- [x] **P3-05a** 整理 `.env.example` 文件，包含所有配置项及说明
  ```
  # Server
  PORT=3000
  DB_HOST=localhost
  DB_PORT=3306
  DB_USERNAME=root
  DB_PASSWORD=
  DB_DATABASE=copywise
  JWT_SECRET=
  JWT_EXPIRES_IN=7d
  REDIS_HOST=localhost
  REDIS_PORT=6379
  AI_PROVIDER=qwen
  AI_API_KEY=
  AI_MODEL=qwen-turbo
  AI_VISION_MODEL=qwen-vl-max-latest
  AI_TIMEOUT_MS=15000
  COS_SECRET_ID=
  COS_SECRET_KEY=
  COS_BUCKET=
  COS_REGION=
  COS_CDN_DOMAIN=
  ```
- [x] **P3-05b** 验证 `docker compose up -d` 一键启动 MySQL + Redis + API + Web 四个服务
- [x] **P3-05c** 补充 `docker-compose.yml` 中 Web 服务的 nginx 配置（SSE 流代理需关闭缓冲）
- [x] **P3-05d** 前端 `UserMenu` 根据 `role=admin` 显示管理后台入口

---

## 实施建议

> 注：截至 2026-08-19，P1 全部、P2 与 P3 大部分已完成，以下为原始规划，仅作历史参考。剩余工作见顶部待办清单。

### 推荐实施顺序

```
P1-01 (管理后台路由) → P1-02 (用户管理) → P1-03 (模板管理)
                    → P1-04 (数据看板)
                    → P1-05 (项目管理+文案库)
                    → P2-04 (渠道选择，影响 AI 生成核心体验)
                    → P2-01 → P2-02 → P2-03 (对话增强)
                    → P2-07 (配额)
                    → P2-05 → P2-06
                    → P3-02 → P3-04 → P3-01 → P3-03 → P3-05
```

### 模块依赖关系

```
P1-01 管理后台路由
 ├── P1-02 用户管理
 └── P1-03 模板管理

P1-04 数据看板（独立）

P1-05 项目管理
 ├── 后端：ProjectModule + CopyModule 挂载
 └── 前端：项目列表 + 文案列表

P2-04 渠道选择 ← 影响 P3-04 保存到项目
P2-06 版本历史 ← 依赖消息编辑流程
P2-07 配额系统 ← 独立，DB 表已存在
P3-04 保存到项目 ← 依赖 P1-05 项目管理可用
```

### 后端改动汇总

| 需求 | 改动类型 | 说明 |
|------|----------|------|
| P1-05a | 模块挂载 | `AppModule` 导入 ProjectModule、CopyModule |
| P2-01a | API 扩展 | 对话列表增加 keyword 查询 |
| P2-03a | 新增 API | 编辑用户消息 |
| P2-04a-c | 增强 | SSE 接口增加 channel/tone/length 参数，加载模板 |
| P2-06a-e | 新增表+API | message_versions 表及版本管理接口 |
| P2-07a-d | 新增模块 | Quota Entity + Service + Guard + API |
| P3-01a-c | 新增表+重构 | sensitive_words 表，重构过滤器 |
| P3-02a-e | 模块接入 | Redis 缓存各处数据 |
| P3-04a | 新增 API | 消息保存到项目 |

### 前端改动汇总

| 需求 | 新增文件 | 说明 |
|------|----------|------|
| P1-01 | `AdminLayout.vue` + 路由 | 管理后台布局 |
| P1-02 | `AdminUsersView.vue` + `api/admin.ts` + `types/admin.ts` | 用户管理 |
| P1-03 | `AdminTemplatesView.vue` | 模板管理 |
| P1-04 | `DashboardView.vue` + `api/analytics.ts` + `types/analytics.ts` | 数据看板 |
| P1-05 | `ProjectsView.vue` + `ProjectDetailView.vue` + `api/project.ts` + `api/copy.ts` | 项目+文案 |
| P3-05b-d | `docker-compose.yml` + `.env.example` + nginx 配置 | 部署运维 |
