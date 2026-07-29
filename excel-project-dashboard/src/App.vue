<template>
  <div class="app">
    <!-- Toast提示 -->
    <Toast />

    <main class="main-content">
      <Dashboard />
    </main>
  </div>
</template>

<script setup>
import Dashboard from './components/Dashboard/Dashboard.vue';
import Toast from './components/common/Toast.vue';
</script>

<style scoped>
.app {
  min-height: 100vh;
  background-color: #f3f4f6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.main-content {
  padding: 1rem;
}
</style>
