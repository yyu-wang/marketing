# CopyWise Web

CopyWise 智能营销文案助手的用户端 SPA —— Vue 3 + Vite + TypeScript + Element Plus。包含 AI 对话（SSE 流式）、项目管理、文案管理、数据看板及内嵌管理后台视图。

## 技术栈

- **Vue 3.4** + **Vite** + **TypeScript 5**（严格模式）
- **Element Plus**（按需组件解析 + 中文 locale）
- **Vue Router 4**（history 模式，懒加载 + 认证守卫） / **Pinia**
- **Axios**（统一响应解包 `{code,message,data}`，401 自动跳登录）
- **@microsoft/fetch-event-source**（SSE 流式生成，支持 Bearer Header + AbortController）
- **ECharts 5** + vue-echarts（数据看板）

## 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/login` / `/register` | LoginView / RegisterView | 认证（独立浅色主题） |
| `/` | ChatView | 新对话 |
| `/c/:id` | ChatView | 已有对话（懒创建：首条消息才建会话） |
| `/dashboard` | DashboardView | 数据看板 |
| `/projects` | ProjectsView | 项目管理 |
| `/projects/:id` | ProjectDetailView | 项目详情（文案列表） |
| `/admin/users` 等 | admin/* | 管理后台视图（需管理员权限） |

## 目录

```
src/
├── api/            # 按模块封装的接口（auth / ai / conversation / project / copy / quota / analytics / admin / upload / health）
├── stores/         # Pinia stores（auth / conversation）
├── composables/    # 组合式函数（useDevice）
├── router/         # 路由表与守卫
├── views/          # Chat / Dashboard / Projects / ProjectDetail / Login / Register / admin
├── components/     # layout / chat / project / copy / charts / common
├── utils/          # request.ts（Axios 单例）、sse.ts（SSE 封装）
├── styles/         # 全局暗色主题、星空背景、Auth 页样式
└── types/          # TS 类型
```

## 本地开发

```bash
# 1) 先启动后端（在 ../copywise-server 中）
cd ../copywise-server
docker compose up -d mysql redis
cp .env.example .env   # 填入 JWT_SECRET、AI_API_KEY
npm install
npm run migration:run
npm run start:dev
# → http://localhost:3000/api/health  /api/docs

# 2) 启动前端
cd ../copywise-web
npm install
npm run dev
# → http://localhost:5173
```

开发态 Vite Dev Server 通过 `/api` 反向代理到 `http://localhost:3000`（SSE 关闭响应压缩），无需关心跨域。

## 脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 5173，自动释放端口） |
| `npm run build` | `vue-tsc` 类型检查 + Vite 生产构建 |
| `npm run preview` | 本地预览构建产物（端口 4173） |
| `npm run type-check` | 仅做 TypeScript 类型检查 |
| `npm run lint` | ESLint 修复 |

## 环境变量

| 变量 | 默认 | 作用 |
|------|------|------|
| `VITE_API_BASE` | `/api` | 后端基地址；开发由 Vite proxy 转发，生产由网关 / Nginx 反代 |
| `VITE_APP_TITLE` | `CopyWise 智能营销文案助手` | HTML 标题与品牌名 |

Docker 构建支持通过 `--build-arg VITE_API_BASE=...` 在构建期覆写。

## 生产部署

CI 部署见仓库根目录 `.github/workflows/deploy-web.yml`；也可复用 `../copywise-server/docker-compose.yml` 中的 `web` 服务（Nginx 静态托管 + 反代后端，SSE 关闭 buffering）。
