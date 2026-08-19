# Marketing Wise 管理后台

Marketing Wise 平台的管理后台，面向管理员提供用户管理与 Prompt 模板管理。独立 SPA，与用户端（marketing-web）分离部署。

## 技术栈

- **React 19** + **TypeScript 6**（strict）+ **Vite 8**
- **Ant Design 6** + **@ant-design/icons**（中文 locale）
- **Zustand 5**（全局状态，唯一操作 localStorage 的层）
- **React Router v7**（`createBrowserRouter`）
- **axios**（`/api` 基地址，Bearer Token + 401 自动登出）

## 功能

- **登录**：管理员账号登录，状态持久化（`admin-auth` key）
- **用户管理**：列表 / 搜索 / 新增 / 编辑 / 重置密码 / 删除（当前登录用户禁止删除）
- **模板管理**：Prompt 模板 CRUD

## 目录结构

```
src/
├── main.tsx                # 入口（StrictMode + createRoot）
├── App.tsx                 # ConfigProvider (zhCN) + AntApp + RouterProvider
├── router/                 # createBrowserRouter 扁平路由
├── layouts/                # AdminLayout：Sider + Header + Content + Outlet
├── pages/                  # LoginPage、users/、templates/
├── components/common/      # AuthGuard（登录 + 管理员权限双重校验）
├── stores/                 # useAuthStore（Zustand）
├── api/                    # axios 实例 + API 模块（request / auth / user / template）
├── types/                  # TS 类型（api / user / template）
├── constants/              # 常量（渠道选项、映射等）
├── utils/                  # 工具函数
└── assets/                 # 静态资源
```

## 架构分层

```
View (Page/Component) → Store (Zustand) → API (axios)
```

- **View 层**：页面与组件，只负责 UI 渲染与交互，禁止直接操作 localStorage
- **Store 层**：全局状态与持久化逻辑，唯一允许读写 localStorage 的层
- **API 层**：axios 实例与业务接口封装，统一注入 Bearer Token

## 本地开发

前置：先启动后端服务（marketing-server，端口 3000）。

```bash
cd marketing-admin
npm install
npm run dev
# → http://localhost:5174（/api 代理到 http://localhost:3000）
```

使用管理员账号登录（种子脚本：`marketing-server` 下 `npm run seed`）。

## 脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（端口 5174） |
| `npm run build` | `tsc -b` 类型检查 + Vite 生产构建 |
| `npm run lint` | Oxlint 检查 |
| `npm run preview` | 本地预览构建产物 |

## 环境变量

无运行时环境变量；API 基地址固定为 `/api`，开发由 Vite 代理转发，生产由网关 / 反向代理转发到后端。

## 新增管理页面

1. `src/types/<resource>.ts` — 定义实体接口与 CRUD Payload 类型
2. `src/api/<resource>.ts` — 实现 CRUD API 函数
3. `src/pages/<resource>/<Xxx>ListPage.tsx` — 页面组件
4. `src/router/index.tsx` — 添加受 AuthGuard 包裹的路由
5. `src/layouts/AdminLayout.tsx` — 添加侧栏菜单项
