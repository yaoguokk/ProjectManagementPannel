<template>
  <div class="bg-white rounded-lg shadow-sm p-5">
    <h3 class="text-base font-semibold text-gray-700">成本对比（立项 vs 实际支出）</h3>
    <p class="text-xs text-gray-500 mt-1">{{ summaryText }}</p>
    <div ref="chartRef" class="w-full h-80 mt-3"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';

const props = defineProps({
  // calculateCostAnalysis 的 summary 结果
  summary: {
    type: Object,
    default: () => ({}),
  },
});

const chartRef = ref(null);
let chartInstance = null;

const categoryTotals = computed(() => props.summary?.categoryTotals || []);

const formatAmount = (value) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value || 0);

// 单行文字概览（非 KPI 卡片）
const summaryText = computed(() => {
  const summary = props.summary || {};
  if (!summary.projectCount) return '当前筛选条件下暂无数据';
  return [
    `统计项目 ${summary.projectCount} 个`,
    `总立项成本 ¥${formatAmount(summary.totalBudget)}`,
    `总实际支出 ¥${formatAmount(summary.totalActual)}`,
    `超支金额 ¥${formatAmount(summary.overAmount)}`,
    `超支项目 ${summary.overProjectCount} 个（${summary.overRate}%）`,
  ].join(' · ');
});

const buildOption = () => {
  const totals = categoryTotals.value;
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `¥${formatAmount(value)}`,
    },
    legend: { data: ['立项成本', '实际支出'], top: 0 },
    grid: { left: 72, right: 24, top: 44, bottom: 28 },
    xAxis: {
      type: 'category',
      data: totals.map((item) => item.label),
      axisTick: { alignWithLabel: true },
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value) => formatAmount(value) },
    },
    series: [
      {
        name: '立项成本',
        type: 'bar',
        barMaxWidth: 48,
        itemStyle: { color: '#3b82f6' },
        data: totals.map((item) => item.budget),
      },
      {
        name: '实际支出',
        type: 'bar',
        barMaxWidth: 48,
        itemStyle: { color: '#f59e0b' },
        data: totals.map((item) => item.actual),
      },
    ],
  };
};

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
