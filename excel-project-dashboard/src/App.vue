<template>
  <div class="app">
    <!-- Toast提示 -->
    <Toast
      :show="toast.show"
      :message="toast.message"
      :type="toast.type"
      @hide="hideToast"
    />

    <main class="main-content">
      <Dashboard />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProjectData } from './composables/useProjectData';
import { useToast } from './composables/useToast';
import { ToastType } from './constants/projectStatus';
import Dashboard from './components/Dashboard/Dashboard.vue';
import Toast from './components/common/Toast.vue';
import { generateMockProjects } from './data/projectData';

// 使用组合式函数
const { filters, kpiData, updateFilters, applyFilters } = useProjectData();
const { toast, showSuccess, showError, showInfo } = useToast();

// 项目数据
const projects = ref([]);

// 初始化数据
onMounted(() => {
  loadMockData();
});

// 加载模拟数据
const loadMockData = () => {
  try {
    projects.value = generateMockProjects();
    showSuccess('数据加载成功');
  } catch (error) {
    showError('数据加载失败：' + error.message);
  }
};

// 过滤后的项目列表
const filteredProjects = computed(() => {
  return applyFilters();
});

// 处理查询
const handleQuery = () => {
  try {
    updateFilters(filters.value);
    showSuccess('查询成功');
  } catch (error) {
    showError('查询失败：' + error.message);
  }
};

// 处理导出
const handleExport = (data) => {
  try {
    showSuccess('导出成功');
    console.log('导出数据:', data);
  } catch (error) {
    showError('导出失败：' + error.message);
  }
};

// 处理项目详情
const handleOpenDetail = (projectId) => {
  showInfo(`正在打开项目 ${projectId} 详情`);
  console.log('打开项目详情:', projectId);
};

// 隐藏Toast
const hideToast = () => {
  toast.value.show = false;
};
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