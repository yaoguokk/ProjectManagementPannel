<template>
  <!--
    /cost 成本管控：筛选 + E 区域（口径规则条 + 超支分布图 + 明细表）
    筛选条件与概览 / 明细页共用同一份 store 状态。
  -->
  <div class="space-y-6">
    <FilterSection :section="filterSection" />
    <CostSection :section="costSection" />

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
import CostSection from '../components/sections/CostSection.vue';
import EmptyState from '../components/common/EmptyState.vue';

const dataStore = useDataStore();

const filterSection = getSection('filter');
const costSection = getSection('cost');

const isEmpty = computed(() => dataStore.applyFilters().length === 0);
const resetFilters = () => dataStore.resetFilters();
</script>
