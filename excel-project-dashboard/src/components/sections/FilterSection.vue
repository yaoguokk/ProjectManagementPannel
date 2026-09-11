<template>
  <!-- 区域 B：数据筛选（全局筛选条件写回 store，所有区域共享） -->
  <div class="filter-bar">
    <SectionHeader :badge="section.badge" :title="section.title" :tone="section.tone" />
    <div class="filter-container flex items-end gap-x-8">
      <div class="filter-item flex-1">
        <label class="filter-label">时间范围</label>
        <DateRangeFilter v-model:dateRange="filters.dateRange" />
      </div>
      <div class="filter-item flex-1">
        <label class="filter-label">项目类型</label>
        <ProjectTypeFilter v-model:projectType="filters.projectType" />
      </div>
      <div class="filter-item flex-1">
        <button
          class="query-btn h-9"
          @click="handleQuery"
          :disabled="isLoading"
        >
          {{ isLoading ? '查询中...' : '查询' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * B 区域容器
 * filters 直接来自 store，筛选变化即刻驱动 C/D/E 的派生结果（单向数据流）。
 */
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/dataStore';
import { useToast } from '../../composables/useToast';
import SectionHeader from '../common/SectionHeader.vue';
import DateRangeFilter from '../filters/DateRangeFilter.vue';
import ProjectTypeFilter from '../filters/ProjectTypeFilter.vue';

defineProps({
  section: { type: Object, required: true },
});

const dataStore = useDataStore();
const { filters } = storeToRefs(dataStore);
const { showSuccess } = useToast();

const isLoading = ref(false);

const handleQuery = () => {
  showSuccess('查询成功');
};
</script>

<style scoped>
.filter-bar {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.query-btn {
  width: 100%;
  height: 2.25rem;
  margin-top: 1.813rem;
  padding: 0 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.query-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.query-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
</style>
