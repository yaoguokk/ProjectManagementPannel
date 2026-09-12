<template>
  <div class="app">
    <!-- Toast提示 -->
    <Toast />

    <!-- 顶部导航：条目来自路由表（NAV_ITEMS），新增页面只改 router/index.js -->
    <header class="app-header">
      <div class="app-header-inner">
        <span class="app-brand">项目全景面板</span>
        <nav class="app-nav">
          <RouterLink
            v-for="item in NAV_ITEMS"
            :key="item.name"
            :to="navLocation(item, route.query)"
            class="app-nav-link"
            active-class="app-nav-link-active"
          >
            {{ ROUTE_TITLES[item.name] }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <!-- 面包屑：末级标题跟随当前路由 -->
    <Breadcrumbs />

    <main class="main-content">
      <div class="main-container">
        <RouterView />
      </div>
    </main>
  </div>
</template>

<script setup>
import { RouterLink, RouterView, useRoute } from 'vue-router';
import Toast from './components/common/Toast.vue';
import Breadcrumbs from './components/common/Breadcrumbs.vue';
import { NAV_ITEMS, ROUTE_TITLES } from './router';
import { navLocation } from './utils/filterQuery';
import { useFilterQuerySync } from './composables/useFilterQuerySync';

const route = useRoute();

// 筛选条件 ↔ URL query 双向同步：布局层调用一次，所有视图共享
useFilterQuerySync();

// 导航跳转统一带 query（navLocation）：否则切页会把筛选条件重置成默认值
</script>

<style scoped>
.app {
  min-height: 100vh;
  background-color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.app-header {
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
}

.app-header-inner {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 0.75rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.app-brand {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.app-nav-link {
  padding: 0.375rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #4b5563;
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.app-nav-link:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.app-nav-link-active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.main-content {
  padding: 1rem;
}

.main-container {
  padding: 0 1.5rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
