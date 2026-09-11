<template>
  <!-- 区域 E：成本管控（口径规则与录入状态归 store，图表/表格只读消费） -->
  <div class="cost-section">
    <SectionHeader :badge="section.badge" :title="section.title" :tone="section.tone" />

    <!-- 口径工具栏：项目分包费在「支出合同类型」之后按关键词二次判定，改动实时生效 -->
    <ContractRuleBar v-model:rules="contractRules" :stats="costRuleStats" />

    <div v-if="contracts.length === 0" class="cost-empty">
      请先在「数据导入」上传【支出合同事项】台账，用于统计各项成本的实际支出
    </div>

    <template v-else>
      <CostChart :summary="costSummary" />
      <div class="mt-4">
        <CostTable :rows="costRows" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/dataStore';
import SectionHeader from '../common/SectionHeader.vue';
import ContractRuleBar from '../CostControl/ContractRuleBar.vue';
import CostChart from '../CostControl/CostChart.vue';
import CostTable from '../CostControl/CostTable.vue';

defineProps({
  section: { type: Object, required: true },
});

const dataStore = useDataStore();
const { contracts, contractRules, costRows, costSummary, costRuleStats } = storeToRefs(dataStore);
</script>

<style scoped>
.cost-section {
  /* 不设背景 —— 由 CostChart / CostTable 内部各自控制 */
}

.cost-empty {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
}
</style>
