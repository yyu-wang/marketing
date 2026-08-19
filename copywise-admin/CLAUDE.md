# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## 项目概述

CopyWise Admin — CopyWise 平台的管理后台，提供用户管理和模板管理功能。
- **React 19** + **TypeScript 6** (strict) + **Vite 8**
- **Ant Design 6** + **Zustand 5** + **React Router v7** + **axios**

---

## 常用命令

```bash
npm run dev      # Vite 开发服务器 (端口 5174, 代理 /api → localhost:3000)
npm run build    # tsc -b + vite build
npm run lint     # oxlint 检查
npm run preview  # 预览构建产物
```

---

## 项目结构

```
src/
  main.tsx                # 入口，StrictMode + createRoot
  App.tsx                 # ConfigProvider (zhCN) + AntApp + RouterProvider
  router/index.tsx        # createBrowserRouter 扁平路由配置
  layouts/                # AdminLayout: Sider + Header + Content + Outlet
  pages/                  # 页面组件 (LoginPage, users/, templates/)
  components/common/      # 通用组件 (AuthGuard)
  stores/                 # Zustand store (auth)
  api/                    # axios 实例 + API 模块 (request, auth, user, template)
  types/                  # TS 类型 (api, user, template)
  assets/                 # 静态资源
```

---

## 架构分层 (三层，禁止跨层调用)

```
View (Page/Component) → Store (状态 + 动作) → API (HTTP 请求)
```

- **View 层**: 页面和组件，负责 UI 渲染和用户交互，禁止直接操作 localStorage
- **Store 层**: Zustand store，管理全局状态（当前仅 `useAuthStore`），封装持久化逻辑
- **API 层**: axios 实例 + 业务 API 函数，封装 HTTP 请求和 Token 注入

---

## 代码规范

### 命名

- 页面组件: `PascalCase`，以 `Page` 结尾 → `UserListPage`、`LoginPage`
- Store: `useXxxStore` → `useAuthStore`
- API 函数: `camelCase`，动词开头 → `getUserList`、`createUser`、`deleteUser`
- 类型: `PascalCase`，Payload 以 `Payload` 结尾 → `CreateUserPayload`、`UpdateUserPayload`
- 常量: `UPPER_SNAKE_CASE` → `CHANNEL_OPTIONS`、`CHANNEL_MAP`

### 导出

- 页面、布局、通用组件: **具名导出** (`export const PageName`)
- App 组件: 通过 `main.tsx` 引入，可以使用默认导出
- 每个文件最多导出 5 个具名符号（类型文件除外）

### TypeScript

- 严格模式，禁止 `any`，禁止 `import *` 全量导入
- Props 类型以 `Props` 结尾，简单组件可使用 `React.ReactNode` 内联
- API 响应统一包在 `ApiResponse<T>` 中，分页数据用 `PaginatedData<T>`
- 使用 `type` import 导入纯类型 → `import type { User }`

### Import 排序

```tsx
// 1. React 核心
import { useEffect, useState, useCallback } from 'react';
// 2. 第三方库
import { Button, Form, Modal, message, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
// 3. 内部模块 (@/ 别名)
import { getUserList } from '@/api/user';
import { useAuthStore } from '@/stores/auth';
import type { User } from '@/types/user';
```

---

## React 组件规范

### 页面组件模式 (CRUD 页面)

```tsx
export const XxxListPage = () => {
  // 1. 状态声明 (data, total, loading, page, 筛选条件, 弹窗状态)
  // 2. fetchList = useCallback(..., [page, ...筛选条件])
  // 3. useEffect(() => { fetchList(); }, [fetchList])
  // 4. 事件处理器 (handleCreate, handleEdit, handleSubmit, handleDelete)
  // 5. columns 定义 (ColumnsType<Entity>)
  // 6. return JSX
};
```

### 组件约束

- 函数组件 + Hooks，禁止 class 组件
- 副作用（定时器、订阅）必须在 `useEffect` 返回的 cleanup 中清理
- 避免在渲染中创建内联函数/对象（依赖项稳定性）
- Modal 创建/编辑必须设置 `destroyOnHidden`，避免表单残留
- Table 必须设置 `rowKey`（使用业务 ID，禁止用 index）
- 列表渲染 key 禁止使用数组 index，必须使用唯一业务 ID

### Ant Design 使用

- 全局已包裹 `<ConfigProvider locale={zhCN}>` 和 `<AntApp>`，无需在页面中重复包裹
- message/notification 使用静态方法 → `message.success()`、`message.error()`
- 表单状态用 `Form.useForm()` + `form.validateFields()`，不手写受控 input
- 时间格式化统一使用 `dayjs`，不要用 `new Date().toLocaleString()`
- 弹窗确认使用 `<Popconfirm>` 包裹危险操作按钮

---

## 状态管理 (Zustand)

```tsx
// 选择器方式获取状态，避免不必要的重渲染
const user = useAuthStore((s) => s.user);
const { login, logout, hydrate } = useAuthStore();
```

- Store 是唯一直接操作 `localStorage` 的地方，View 层禁止直接读写 localStorage
- `hydrate()` 在 `AuthGuard` 的 `useEffect` 中调用一次，恢复登录态
- Token 持久化 key: `admin-auth`

---

## API 层

### 请求实例 (`src/api/request.ts`)

- baseURL: `/api`，timeout: 15s
- 请求拦截器: 自动从 localStorage 读取 token 附加 `Authorization: Bearer <token>`
- 响应拦截器: 401 时清除认证信息并跳转 `/login`

### API 函数规范

```ts
// GET 列表 (参数用 params 选项)
export const getXxxList = (params: Record<string, unknown>) =>
  http.get<ApiResponse<PaginatedData<Xxx>>>('/admin/xxx', { params });

// POST 创建
export const createXxx = (data: CreateXxxPayload) =>
  http.post<ApiResponse<Xxx>>('/admin/xxx', data);

// PATCH 更新
export const updateXxx = (id: number, data: UpdateXxxPayload) =>
  http.patch<ApiResponse<Xxx>>(`/admin/xxx/${id}`, data);

// DELETE 删除
export const deleteXxx = (id: number) =>
  http.delete<ApiResponse<{ deleted: boolean }>>(`/admin/xxx/${id}`);
```

- 每个资源一个 API 模块文件 (`src/api/<resource>.ts`)
- 每个函数明确标注返回类型泛型
- 无依赖的异步请求必须并行 (`Promise.all`)，禁止串行 await

---

## 路由

- 使用 `createBrowserRouter` 扁平配置，在 `src/router/index.tsx` 统一维护
- 需要登录 + 管理员权限的路由包裹在 `AuthGuard` 下
- 公开路由（如 `/login`）直接挂载
- 默认跳转用 `<Navigate to="/xxx" replace />`

---

## 安全

- 用户输入在渲染前必须转义（React 默认转义，禁止 `dangerouslySetInnerHTML`）
- 敏感信息走环境变量，禁止硬编码，`.env` 等加入 `.gitignore`
- 请求参数必须校验（前端用 Ant Form rules，后端同样校验）
- Token 存储在 localStorage，每次请求自动附加
- 状态变更操作（创建/修改/删除）需确认（Popconfirm）

---

## 文件约束

- 单个文件不超过 500 行，超过需拆分
- 单个函数不超过 80 行，超过需抽离子函数
- 单个函数参数不超过 4 个，超过用对象传参
- 模板/JSX 嵌套不超过 5 层，超过需拆分子组件
- 禁止 `console.log`，使用 `message.error()` / `message.success()` 提示

---

## 新增模块 Checklist

新增一个管理页面（如"订单管理"）时遵循：

1. `src/types/order.ts` — 定义实体接口和 CRUD Payload 类型
2. `src/api/order.ts` — 实现 CRUD API 函数
3. `src/pages/orders/OrderListPage.tsx` — 页面组件
4. `src/router/index.tsx` — 添加路由配置
5. `src/layouts/AdminLayout.tsx` — 添加侧栏菜单项
