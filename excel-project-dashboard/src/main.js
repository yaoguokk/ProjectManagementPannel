import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'

// 全局状态：数据源与筛选条件由 pinia 统一承载（见 src/stores/dataStore.js）
createApp(App).use(createPinia()).use(router).mount('#app')
