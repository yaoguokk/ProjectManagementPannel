<template>
  <nav class="breadcrumbs">
    <div class="breadcrumb-items">
      <span class="breadcrumb-item">首页</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item">项目管理系统</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item">统计分析</span>
      <span class="breadcrumb-separator">/</span>
      <span class="breadcrumb-item current">项目验收完成率概览</span>
    </div>
  </nav>
</template>

<script setup>
// 面包屑组件，展示页面层级关系
</script>

<style scoped>
.breadcrumbs {
  background-color: white;
  padding: 1rem 2rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}

.breadcrumb-items {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.breadcrumb-item {
  cursor: default;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: #3b82f6;
}

.breadcrumb-item.current {
  color: #374151;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 0.5rem;
  color: #9ca3af;
}
</style>