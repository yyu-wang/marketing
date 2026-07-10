import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './styles/index.scss'

// 全局启用 dark token（Element Plus dark css-vars 通过 html.dark 触发）
document.documentElement.classList.add('dark')

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 先恢复登录态，再注册路由 - 避免守卫读到空 token
const auth = useAuthStore()
auth.hydrate()

app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
