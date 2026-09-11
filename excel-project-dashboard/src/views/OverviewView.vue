<template>
  <!--
    /overview 概览（默认页）：数据导入 + 筛选 + KPI
    数据导入（A 区域）归属概览页，不再单独占一个导航项；
    超支分布图属于 E 区域，只在 /cost 的成本管控页展示。
  -->
  <div class="space-y-6">
    <UploadSection :section="uploadSection" />
    <FilterSection :section="filterSection" />
    <KpiSection :section="kpiSection" />

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
import UploadSection from '../components/sections/UploadSection.vue';
import FilterSection from '../components/sections/FilterSection.vue';
import KpiSection from '../components/sections/KpiSection.vue';
import EmptyState from '../components/common/EmptyState.vue';

const dataStore = useDataStore();

const uploadSection = getSection('upload');
const filterSection = getSection('filter');
const kpiSection = getSection('kpi');

const isEmpty = computed(() => dataStore.applyFilters().length === 0);
const resetFilters = () => dataStore.resetFilters();
</script>
