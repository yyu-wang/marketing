import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_PATH } from './routes'

const routes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATH.LOGIN,
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: ROUTE_PATH.REGISTER,
    name: 'register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { public: true, title: '注册' },
  },
  {
    path: ROUTE_PATH.HOME,
    component: () => import('@/components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'chat-home',
        component: () => import('@/views/ChatView.vue'),
        meta: { title: '新对话' },
      },
      {
        path: 'c/:id',
        name: 'chat-conversation',
        component: () => import('@/views/ChatView.vue'),
        props: (route) => ({ conversationId: Number(route.params.id) }),
        meta: { title: '对话' },
      },
    ],
  },
  {
    path: ROUTE_PATH.NOT_FOUND,
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const baseTitle = import.meta.env.VITE_APP_TITLE || 'Marketing Wise'
  document.title = to.meta?.title ? `${to.meta.title} - ${baseTitle}` : baseTitle

  if (to.meta?.requiresAuth && !auth.isLoggedIn) {
    return { path: ROUTE_PATH.LOGIN, query: { redirect: to.fullPath } }
  }
  if (auth.isLoggedIn && (to.path === ROUTE_PATH.LOGIN || to.path === ROUTE_PATH.REGISTER)) {
    return { path: ROUTE_PATH.HOME }
  }
  return true
})

export default router
