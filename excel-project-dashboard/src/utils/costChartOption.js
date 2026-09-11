/**
 * E 区域「超支项目分布（按项目类型）」图表配置 — 纯函数，便于单元测试
 *
 * 口径单一来源：数据由 costData.summarize 产出的 summary.typeTotals 提供，
 * 图表只负责展示，不在组件内二次遍历统计，保证与明细表「状态」列、超支筛选、导出四处一致。
 */

/** 超支语义色：柱（数量）用红色系，折线（金额）用橙色系 */
export const OVER_BUDGET_BAR_COLOR = '#ef4444';
export const OVER_BUDGET_LINE_COLOR = '#f59e0b';

const BAR_SERIES_NAME = '超支项目数';
const LINE_SERIES_NAME = '超支金额';

const amountFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });

/** 金额展示：千分位、无小数 */
export const formatAmount = (value) => amountFormatter.format(value || 0);

/** 项目数展示：整数 + 单位 */
export const formatCount = (value) => `${value || 0} 个`;

/** 横轴名称过长时截断，完整名由 tooltip / title 展示 */
const truncateLabel = (label, maxLength = 8) => {
  const text = String(label ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

/** 悬停提示按系列分别格式化：数量不带货币符号，金额带 ¥ 千分位 */
const tooltipFormatter = (params) => {
  const items = Array.isArray(params) ? params : [params];
  if (items.length === 0) return '';

  const rows = items.map((item) => {
    const value = item.seriesName === BAR_SERIES_NAME ? formatCount(item.value) : `¥${formatAmount(item.value)}`;
    return `${item.marker}${item.seriesName}：${value}`;
  });

  return [items[0].axisValue, ...rows].join('<br/>');
};

/**
 * 构建双轴图配置：左轴 = 超支项目数（柱），右轴 = 超支金额（折线）
 * @param {Array} typeTotals summarize().typeTotals，元素为
 *   { label, total, overProjectCount, overAmount, overRate }
 * @returns {Object} ECharts option（无数据时返回空 x 轴的安全配置，不报错）
 */
export const buildOverBudgetOption = (typeTotals = []) => {
  const totals = Array.isArray(typeTotals) ? typeTotals : [];

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: tooltipFormatter,
    },
    legend: { data: [BAR_SERIES_NAME, LINE_SERIES_NAME], top: 0 },
    grid: { left: 72, right: 72, top: 44, bottom: 28 },
    xAxis: {
      type: 'category',
      data: totals.map((item) => item.label),
      axisTick: { alignWithLabel: true },
      axisLabel: { interval: 0, formatter: (value) => truncateLabel(value) },
    },
    yAxis: [
      {
        type: 'value',
        name: '超支项目数',
        // 数量是整数，避免出现 0.5 这类刻度
        minInterval: 1,
        axisLabel: { formatter: (value) => formatAmount(value) },
      },
      {
        type: 'value',
        name: '超支金额',
        // 两轴网格线只保留左轴，避免横线重叠
        splitLine: { show: false },
        axisLabel: { formatter: (value) => formatAmount(value) },
      },
    ],
    series: [
      {
        name: BAR_SERIES_NAME,
        type: 'bar',
        barMaxWidth: 48,
        itemStyle: { color: OVER_BUDGET_BAR_COLOR },
        data: totals.map((item) => item.overProjectCount || 0),
      },
      {
        name: LINE_SERIES_NAME,
        type: 'line',
        yAxisIndex: 1,
        smooth: false,
        symbolSize: 8,
        itemStyle: { color: OVER_BUDGET_LINE_COLOR },
        lineStyle: { color: OVER_BUDGET_LINE_COLOR, width: 2 },
        data: totals.map((item) => item.overAmount || 0),
      },
    ],
  };
};
