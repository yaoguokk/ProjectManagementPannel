<template>
  <!-- 区域 D：项目明细（projectType / dateRange 取全局筛选，表格自身状态仍归组件内） -->
  <div class="project-detail-section">
    <SectionHeader :badge="section.badge" :title="section.title" :tone="section.tone" />
    <ProjectTable
      :projects="filteredProjects"
      :projectType="filters.projectType"
      :dateRange="filters.dateRange"
      @export="handleExport"
      @open-detail="handleOpenDetail"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/dataStore';
import { useToast } from '../../composables/useToast';
import SectionHeader from '../common/SectionHeader.vue';
import ProjectTable from '../ProjectTable/ProjectTable.vue';

defineProps({
  section: { type: Object, required: true },
});

const dataStore = useDataStore();
const { filters } = storeToRefs(dataStore);
const { showSuccess, showError, showToast } = useToast();

/** 按项目类型过滤后的项目列表（派生，不落库） */
const filteredProjects = computed(() => dataStore.applyFilters());

const handleExport = (data) => {
  try {
    showSuccess('导出成功');
    console.log('导出数据:', data);
  } catch (error) {
    showError('导出失败：' + error.message);
  }
};

const handleOpenDetail = (projectId) => {
  showToast(`正在打开项目 ${projectId} 详情`, 'info');
  console.log('打开项目详情:', projectId);
};
</script>

<style scoped>
.project-detail-section {
  /* 不设背景 —— 由 ProjectTable 内部各层分别控制 */
}
</style>
