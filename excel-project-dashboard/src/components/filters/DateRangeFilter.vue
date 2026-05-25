<template>
  <div class="date-range-filter">
    <div class="filter-group">
      <button
        @click="setDateRange('month')"
        class="quick-date-btn"
        :class="{ 'active': dateRangeType === 'month' }"
      >
        本月
      </button>
      <button
        @click="setDateRange('custom')"
        class="quick-date-btn"
        :class="{ 'active': dateRangeType === 'custom' }"
      >
        自定义
      </button>
    </div>

    <div v-if="dateRangeType === 'custom'" class="custom-date-range">
      <div class="date-input-group">
        <label class="date-label">开始日期</label>
        <input
          v-model="startDate"
          type="date"
          class="date-input"
          @change="emitDateRange"
        />
      </div>
      <div class="date-input-group">
        <label class="date-label">结束日期</label>
        <input
          v-model="endDate"
          type="date"
          class="date-input"
          @change="emitDateRange"
        />
      </div>
    </div>

    <div class="info-tooltip">
      <span class="info-icon">?</span>
      <div class="tooltip-content">
        统计计划验收日期在选定时间段内的项目金额和实际完成金额
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  dateRange: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:dateRange']);

const dateRangeType = ref('month');
const startDate = ref('');
const endDate = ref('');

// 本地日期格式化（避免 toISOString 的时区偏移）
const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 计算当前月份的日期范围
const currentMonthRange = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    start: formatLocalDate(firstDay),
    end: formatLocalDate(lastDay)
  };
});

// 初始化日期范围 — 挂载后自动 emit 确保 B/C/D 区域有初始值
if (props.dateRange.start && props.dateRange.end) {
  startDate.value = props.dateRange.start;
  endDate.value = props.dateRange.end;
  dateRangeType.value = 'custom';
} else {
  startDate.value = currentMonthRange.value.start;
  endDate.value = currentMonthRange.value.end;
}

onMounted(() => {
  emitDateRange();
});

const setDateRange = (type) => {
  dateRangeType.value = type;

  if (type === 'month') {
    startDate.value = currentMonthRange.value.start;
    endDate.value = currentMonthRange.value.end;
  }

  emitDateRange();
};

const emitDateRange = () => {
  emit('update:dateRange', {
    start: startDate.value,
    end: endDate.value,
    type: dateRangeType.value
  });
};
</script>

<style scoped>
.date-range-filter {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
}

.filter-group {
  display: flex;
  gap: 0.5rem;
}

.quick-date-btn {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-date-btn:hover {
  background-color: #f3f4f6;
}

.quick-date-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.custom-date-range {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.date-input {
  height: 2.25rem;
  padding: 0 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  width: 120px;
}

.info-tooltip {
  position: relative;
  margin-left: 1rem;
  cursor: help;
}

.info-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  background-color: #e5e7eb;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-size: 0.875rem;
  color: #6b7280;
}

.tooltip-content {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #374151;
  color: white;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  z-index: 10;
}

.info-tooltip:hover .tooltip-content {
  opacity: 1;
  visibility: visible;
}
</style>