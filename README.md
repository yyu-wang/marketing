# CopyWise Web

CopyWise 智能营销文案助手前端 —— Vue 3 + Vite + TypeScript + Element Plus。

## 技术栈

- Vue 3.4 + Vite 5 + TypeScript 5（严格模式）
- Element Plus（按需组件解析 + Element Plus 中文 locale）
- Vue Router 4 / Pinia
- Axios（统一响应解包 `{code,message,data}`，401 自动跳登录）
- @microsoft/fetch-event-source（SSE 流式生成，支持 Bearer Header）
- ECharts 5 + vue-echarts

## 目录

- `src/api`：按模块封装的接口
- `src/utils/request.ts`：Axios 单例与拦截器
- `src/utils/sse.ts`：SSE 流式生成封装
- `src/stores`：Pinia stores（`auth` / `quota`）
- `src/router`：路由表与守卫
- `src/views`：登录 / 注册 / 项目 / 项目详情 / 数据看板
- `src/components`：layout / project / copy / ai / charts

## 本地开发

```bash
# 1) 先启动后端（在 ../copywise-server 中）
cd ../copywise-server
docker compose up -d mysql redis
cp .env.example .env  # 填入 JWT_SECRET、AI_API_KEY
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

开发态 Vite Dev Server 通过 `/api` 反向代理到 `http://localhost:3000`，无需关心跨域。

## 生产部署（Docker Compose）

> 已在 `../copywise-server/docker-compose.yml` 中追加 `web` 服务（Nginx 静态托管 + 反代后端，SSE 关闭 buffering）。

```bash
cd ../copywise-server
vim .env                # 配置 DB / JWT_SECRET / AI_*
docker compose build
docker compose up -d
curl http://localhost/api/health
curl http://localhost/
```

## 脚本

- `npm run dev`：启动开发服务器
- `npm run build`：类型检查 + 生产构建
- `npm run preview`：本地预览构建产物
- `npm run type-check`：仅做 TypeScript 类型检查
- `npm run lint`：ESLint 修复

## 环境变量

| 变量 | 默认 | 作用 |
|---|---|---|
| `VITE_API_BASE` | `/api` | 后端基地址；开发由 Vite proxy 转发，生产由 Nginx 反代 |
| `VITE_APP_TITLE` | `CopyWise 智能营销文案助手` | HTML 标题与品牌名 |

Docker 构建支持通过 `--build-arg VITE_API_BASE=...` 在构建期覆写。
