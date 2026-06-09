<template>
  <div class="kpi-cards">
    <div class="kpi-cards-container">
      <!-- 初验完成情况 -->
      <div class="kpi-card blue-theme">
        <div class="card-header">
          <h3 class="card-title">初验完成情况</h3>
          <div class="card-theme-indicator blue-indicator"></div>
        </div>

        <div class="card-content">
          <div class="progress-section">
            <div class="progress-circle">
              <svg class="progress-ring" width="120" height="120">
                <circle
                  class="progress-ring-circle-bg"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="#e5e7eb"
                  stroke-width="12"
                />
                <circle
                  class="progress-ring-circle"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="#3b82f6"
                  stroke-width="12"
                  stroke-dasharray="339.292"
                  :stroke-dashoffset="initialCircleOffset"
                  stroke-linecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div class="progress-text">
                <span class="percentage">{{ initialCompletionRate }}%</span>
              </div>
            </div>
          </div>

          <div class="kpi-details">
            <div class="detail-item">
              <span class="detail-label">计划金额</span>
              <span class="detail-value">{{ formatCurrency(initialTargetAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">完成金额</span>
              <span class="detail-value">{{ formatCurrency(initialCompletedAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目数</span>
              <span class="detail-value">{{ initialCompletedProjectCount }}/{{ initialTotalProjects }} 个</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 终验完成情况 -->
      <div class="kpi-card green-theme">
        <div class="card-header">
          <h3 class="card-title">终验完成情况</h3>
          <div class="card-theme-indicator green-indicator"></div>
        </div>

        <div class="card-content">
          <div class="progress-section">
            <div class="progress-circle">
              <svg class="progress-ring" width="120" height="120">
                <circle
                  class="progress-ring-circle-bg"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="#e5e7eb"
                  stroke-width="12"
                />
                <circle
                  class="progress-ring-circle"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="transparent"
                  stroke="#10b981"
                  stroke-width="12"
                  stroke-dasharray="339.292"
                  :stroke-dashoffset="finalCircleOffset"
                  stroke-linecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div class="progress-text">
                <span class="percentage">{{ finalCompletionRate }}%</span>
              </div>
            </div>
          </div>

          <div class="kpi-details">
            <div class="detail-item">
              <span class="detail-label">计划金额</span>
              <span class="detail-value">{{ formatCurrency(finalTargetAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">完成金额</span>
              <span class="detail-value">{{ formatCurrency(finalCompletedAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目数</span>
              <span class="detail-value">{{ finalCompletedProjectCount }}/{{ finalTotalProjects }} 个</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 细分情况表格 -->
    <div class="breakdown-table">
      <h4 class="table-title">细分情况</h4>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>细分情况</th>
              <th>计划金额</th>
              <th>完成金额</th>
              <th>完成率</th>
              <th>项目数</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in breakdownData" :key="row.label">
              <tr :class="{ 'row-group-header': row.isGroupHeader }">
                <td :class="{ 'group-label': row.isGroupHeader }">{{ row.label }}</td>
                <td>{{ formatCurrency(row.targetAmount) }}</td>
                <td>{{ formatCurrency(row.completedAmount) }}</td>
                <td>{{ row.completionRate }}%</td>
                <td>{{ row.completedProjects }}/{{ row.totalProjects }} 个</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  kpiData: {
    type: Object,
    required: true
  }
});

// 初验数据
const initialData = computed(() => props.kpiData?.initial || {});
const finalData = computed(() => props.kpiData?.final || {});

const initialCompletionRate = computed(() => initialData.value.completionRate || 0);
const initialTargetAmount = computed(() => initialData.value.targetAmount || 0);
const initialCompletedAmount = computed(() => initialData.value.completedAmount || 0);
const initialTotalProjects = computed(() => initialData.value.totalProjects || 0);
const initialCompletedProjectCount = computed(() => initialData.value.completedProjectCount || 0);

// 终验数据
const finalCompletionRate = computed(() => finalData.value.completionRate || 0);
const finalTargetAmount = computed(() => finalData.value.targetAmount || 0);
const finalCompletedAmount = computed(() => finalData.value.completedAmount || 0);
const finalTotalProjects = computed(() => finalData.value.totalProjects || 0);
const finalCompletedProjectCount = computed(() => finalData.value.completedProjectCount || 0);

// 细分表格数据：经营/自筹 × 初验/终验/合计，共6行
const breakdownData = computed(() => {
  const i = initialData.value;
  const f = finalData.value;

  // 辅助：计算单行数据，除零保护
  const makeRow = (label, target, completed, totalP, completedP, isGroupHeader = false) => {
    const rate = target > 0 ? Math.round((completed / target) * 100) : 0;
    return { label, targetAmount: target, completedAmount: completed, completionRate: rate, totalProjects: totalP, completedProjects: completedP, isGroupHeader };
  };

  // 辅助：两行求和生成合计行
  const sumRows = (label, row1, row2) => {
    const target = row1.targetAmount + row2.targetAmount;
    const completed = row1.completedAmount + row2.completedAmount;
    const totalP = row1.totalProjects + row2.totalProjects;
    const completedP = row1.completedProjects + row2.completedProjects;
    return makeRow(label, target, completed, totalP, completedP, true);
  };

  const bizInitial = makeRow('经营项目 - 初验',
    i.businessTargetAmount || 0, i.businessCompletedAmount || 0,
    i.businessProjects || 0, i.businessCompletedProjectCount || 0);
  const bizFinal = makeRow('经营项目 - 终验',
    f.businessTargetAmount || 0, f.businessCompletedAmount || 0,
    f.businessProjects || 0, f.businessCompletedProjectCount || 0);
  const bizTotal = sumRows('经营项目 - 合计', bizInitial, bizFinal);

  const selfInitial = makeRow('自筹项目 - 初验',
    i.selfTargetAmount || 0, i.selfCompletedAmount || 0,
    i.selfProjects || 0, i.selfCompletedProjectCount || 0);
  const selfFinal = makeRow('自筹项目 - 终验',
    f.selfTargetAmount || 0, f.selfCompletedAmount || 0,
    f.selfProjects || 0, f.selfCompletedProjectCount || 0);
  const selfTotal = sumRows('自筹项目 - 合计', selfInitial, selfFinal);

  return [bizInitial, bizFinal, bizTotal, selfInitial, selfFinal, selfTotal];
});

const initialCircleOffset = computed(() => {
  const circumference = 2 * Math.PI * 54;
  return circumference - (initialCompletionRate.value / 100) * circumference;
});

const finalCircleOffset = computed(() => {
  const circumference = 2 * Math.PI * 54;
  return circumference - (finalCompletionRate.value / 100) * circumference;
});

const formatCurrency = (value) => {
  if (value === 0) return '¥ 0';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};
</script>

<style scoped>
.kpi-cards {
  margin-bottom: 2rem;
}

/* KPI 卡片容器 - 实现 50%:50% 等宽布局 */
.kpi-cards-container {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* 响应式设计：小屏幕时自动换行 */
@media (max-width: 768px) {
  .kpi-cards-container {
    flex-direction: column;
  }
}

.kpi-card {
  flex: 1;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  min-width: 300px; /* 防止过小屏幕挤压变形 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
}

.card-theme-indicator {
  width: 4px;
  height: 24px;
  border-radius: 2px;
}

.blue-indicator {
  background-color: #3b82f6;
}

.green-indicator {
  background-color: #10b981;
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-section {
  position: relative;
  margin-bottom: 1.5rem;
}

.progress-circle {
  position: relative;
  width: 120px;
  height: 120px;
}

.progress-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-circle-bg {
  stroke: #e5e7eb;
}

.progress-ring-circle {
  transition: stroke-dashoffset 0.5s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.percentage {
  font-size: 2rem;
  font-weight: 700;
  color: #374151;
}

.kpi-details {
  width: 100%;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

/* 细分情况表格 */
.breakdown-table {
  margin-top: 2rem;
}

.table-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.table-wrapper {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: center;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
  white-space: nowrap;
}

.table td {
  text-align: center;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.table tr:last-child td {
  border-bottom: none;
}

.row-group-header td {
  border-top: 2px solid #d1d5db;
  border-bottom: 2px solid #d1d5db;
  font-weight: 600;
  background-color: #f9fafb;
}

.row-group-header td:first-child {
  border-left: 2px solid #d1d5db;
}

.row-group-header td:last-child {
  border-right: 2px solid #d1d5db;
}

.group-label {
  color: #1f2937;
}

/* 响应式表格 */
@media (max-width: 640px) {
  .kpi-card {
    min-width: auto;
  }

  .table-wrapper {
    font-size: 0.75rem;
  }

  .table th,
  .table td {
    padding: 0.5rem;
  }
}
</style>