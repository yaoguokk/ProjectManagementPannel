<template>
  <div class="bg-white rounded-lg shadow-sm p-5">
    <h3 class="text-base font-semibold text-gray-700">超支项目分布（按项目类型）</h3>
    <p class="text-xs text-gray-500 mt-1">{{ summaryText }}</p>
    <div ref="chartRef" class="w-full h-80 mt-3"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import { buildOverBudgetOption, formatAmount } from '../../utils/costChartOption';

const props = defineProps({
  // calculateCostAnalysis 的 summary 结果（图表数据源为 summary.typeTotals）
  summary: {
    type: Object,
    default: () => ({}),
  },
});

const chartRef = ref(null);
let chartInstance = null;

const typeTotals = computed(() => props.summary?.typeTotals || []);

// 单行文字概览（非 KPI 卡片）：只保留超支口径，与图表、明细表「状态」列一致
const summaryText = computed(() => {
  const summary = props.summary || {};
  if (!summary.projectCount) return '当前筛选条件下暂无数据';
  return [
    `统计项目 ${summary.projectCount} 个`,
    `超支项目 ${summary.overProjectCount} 个（${summary.overRate}%）`,
    `超支金额 ¥${formatAmount(summary.overAmount)}`,
  ].join(' · ');
});

const buildOption = () => buildOverBudgetOption(typeTotals.value);

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }
  chartInstance.setOption(buildOption(), true);
};

const handleResize = () => chartInstance?.resize();

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
  chartInstance = null;
});

watch(() => props.summary, renderChart, { deep: true });
</script>
