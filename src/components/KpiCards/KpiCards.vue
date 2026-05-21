<template>
  <div class="kpi-cards">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 初验完成情况 -->
      <div class="kpi-card blue-theme">
        <div class="card-header">
          <h3 class="card-title">初验完成情况</h3>
          <div class="card-theme-indicator blue-indicator"></div>
        </div>

        <div class="card-content">
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
                :stroke-dashoffset="circleOffset"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="progress-text">
              <span class="percentage">{{ completionRate }}%</span>
            </div>
          </div>

          <div class="kpi-details">
            <div class="detail-item">
              <span class="detail-label">计划金额</span>
              <span class="detail-value">{{ formatCurrency(targetAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">完成金额</span>
              <span class="detail-value">{{ formatCurrency(completedAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目数</span>
              <span class="detail-value">{{ totalProjects }} 个</span>
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
                :stroke-dashoffset="circleOffset"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div class="progress-text">
              <span class="percentage">{{ completionRate }}%</span>
            </div>
          </div>

          <div class="kpi-details">
            <div class="detail-item">
              <span class="detail-label">计划金额</span>
              <span class="detail-value">{{ formatCurrency(targetAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">完成金额</span>
              <span class="detail-value">{{ formatCurrency(completedAmount) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">项目数</span>
              <span class="detail-value">{{ totalProjects }} 个</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 细分情况表格 -->
    <div class="breakdown-table">
      <h4 class="table-title">细分情况</h4>
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
          <tr>
            <td>经营项目</td>
            <td>{{ formatCurrency(businessTargetAmount) }}</td>
            <td>{{ formatCurrency(businessCompletedAmount) }}</td>
            <td>{{ businessCompletionRate }}%</td>
            <td>{{ businessProjects }} 个</td>
          </tr>
          <tr>
            <td>自筹项目</td>
            <td>{{ formatCurrency(selfTargetAmount) }}</td>
            <td>{{ formatCurrency(selfCompletedAmount) }}</td>
            <td>{{ selfCompletionRate }}%</td>
            <td>{{ selfProjects }} 个</td>
          </tr>
        </tbody>
      </table>
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

const emit = defineEmits(['update:kpiData']);

const completionRate = computed(() => {
  return props.kpiData.completionRate || 0;
});

const targetAmount = computed(() => {
  return props.kpiData.targetAmount || 0;
});

const completedAmount = computed(() => {
  return props.kpiData.completedAmount || 0;
});

const totalProjects = computed(() => {
  return props.kpiData.totalProjects || 0;
});

const businessTargetAmount = computed(() => {
  return props.kpiData.businessTargetAmount || 0;
});

const businessCompletedAmount = computed(() => {
  return props.kpiData.businessCompletedAmount || 0;
});

const businessCompletionRate = computed(() => {
  return props.kpiData.businessCompletionRate || 0;
});

const businessProjects = computed(() => {
  return props.kpiData.businessProjects || 0;
});

const selfTargetAmount = computed(() => {
  return props.kpiData.selfTargetAmount || 0;
});

const selfCompletedAmount = computed(() => {
  return props.kpiData.selfCompletedAmount || 0;
});

const selfCompletionRate = computed(() => {
  return props.kpiData.selfCompletionRate || 0;
});

const selfProjects = computed(() => {
  return props.kpiData.selfProjects || 0;
});

const circleOffset = computed(() => {
  const circumference = 2 * Math.PI * 54;
  return circumference - (completionRate.value / 100) * circumference;
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

.kpi-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
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

.progress-circle {
  position: relative;
  margin-bottom: 1.5rem;
}

.progress-ring {
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

.detail-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.breakdown-table {
  margin-top: 2rem;
}

.table-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
}

.table td {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.table tr:last-child td {
  border-bottom: none;
}
</style>
