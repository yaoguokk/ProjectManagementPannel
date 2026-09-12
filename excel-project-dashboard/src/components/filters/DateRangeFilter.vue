<template>
  <div class="date-range-filter">
    <div class="filter-group">
      <button
        @click="setDateRange('month')"
        class="quick-date-btn"
        :class="{ 'active': dateRangeType === 'month' }"
      >
        年初至本月
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
import { ref, computed, watch } from 'vue';

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
/**
 * 记住用户在「自定义」里填过的日期区间。
 * 切到「年初至本月」会把输入框改成年初~本月末，若不留存，切回「自定义」时用户填的日期就丢了。
 */
const customRange = ref({ start: '', end: '' });

// 本地日期格式化（避免 toISOString 的时区偏移）
const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 计算年初至当前月份的日期范围（1月1日 ~ 本月最后一天）
const currentMonthRange = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, 0, 1); // 今年1月1日
  const lastDay = new Date(year, month + 1, 0); // 本月最后一天

  return {
    start: formatLocalDate(firstDay),
    end: formatLocalDate(lastDay)
  };
});

const syncFromProps = (range = {}) => {
  const hasRange = range.start && range.end;
  startDate.value = hasRange ? range.start : currentMonthRange.value.start;
  endDate.value = hasRange ? range.end : currentMonthRange.value.end;
  dateRangeType.value = range.type || 'month';

  // 外部（URL / store）带进来的是自定义区间时，同步记住它：
  // 切页会重建本组件，记住后才能「切走再切回」还原
  if (dateRangeType.value === 'custom' && hasRange) {
    customRange.value = { start: range.start, end: range.end };
  }
};

watch(() => props.dateRange, syncFromProps, { immediate: true, deep: true });

const setDateRange = (type) => {
  // 离开「自定义」前先留存当前填写值（只在从自定义切出时记，避免被「年初至本月」覆盖）
  if (dateRangeType.value === 'custom') {
    customRange.value = { start: startDate.value, end: endDate.value };
  }

  dateRangeType.value = type;

  if (type === 'month') {
    startDate.value = currentMonthRange.value.start;
    endDate.value = currentMonthRange.value.end;
  } else if (customRange.value.start && customRange.value.end) {
    // 切回自定义：还原上次填写的区间；从未填过时沿用当前值（不置空）
    startDate.value = customRange.value.start;
    endDate.value = customRange.value.end;
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
  padding: 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  font-size: 0.813rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
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
