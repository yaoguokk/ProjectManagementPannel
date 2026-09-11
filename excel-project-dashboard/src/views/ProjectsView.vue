<template>
  <!--
    /projects 项目明细：筛选 + D 区域表格
    表格自身状态（Tab / 状态筛选 / 分页 / 列设置 / 搜索）仍留在 ProjectTable 内。
  -->
  <div class="space-y-6">
    <FilterSection :section="filterSection" />
    <ProjectDetailSection :section="projectSection" />

    <EmptyState
      v-if="isEmpty"
      title="暂无数据"
      description="当前筛选条件下没有找到项目数据"
      show-action
      action-text="重置筛选"
      @action="resetFilters"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getSection } from '../constants/sections';
import { useDataStore } from '../stores/dataStore';
import FilterSection from '../components/sections/FilterSection.vue';
import ProjectDetailSection from '../components/sections/ProjectDetailSection.vue';
import EmptyState from '../components/common/EmptyState.vue';

const dataStore = useDataStore();

const filterSection = getSection('filter');
const projectSection = getSection('project-detail');

const isEmpty = computed(() => dataStore.applyFilters().length === 0);
const resetFilters = () => dataStore.resetFilters();
</script>
