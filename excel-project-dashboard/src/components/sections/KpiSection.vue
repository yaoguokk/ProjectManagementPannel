<template>
  <!-- 区域 C：KPI 概览（派生数据来自 store，只读消费） -->
  <div class="kpi-section">
    <SectionHeader :badge="section.badge" :title="section.title" :tone="section.tone" />
    <KpiCards :kpiData="kpiData" />
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/dataStore';
import SectionHeader from '../common/SectionHeader.vue';
import KpiCards from '../KpiCards/KpiCards.vue';

defineProps({
  section: { type: Object, required: true },
});

const dataStore = useDataStore();
const { kpiData } = storeToRefs(dataStore);
</script>

<style scoped>
.kpi-section {
  /* 间距由 Dashboard 的 space-y-6 统一控制 */
}
</style>
