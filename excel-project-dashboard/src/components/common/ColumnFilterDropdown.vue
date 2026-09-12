<template>
  <!--
    表头筛选下拉（Excel 风格）：挂在表头单元格里。
    表格容器是 overflow-x-auto，向下展开的面板会被裁切，因此用 position: fixed + 触发按钮的坐标定位。
    面板在 <th class="whitespace-nowrap"> 内，必须显式重置文本换行，
    否则数值列的 select / input 不会各占一行而是并排撑出面板被裁掉。
  -->
  <div
    ref="panelRef"
    class="column-filter-panel fixed z-[120] w-[292px] overflow-hidden rounded-lg border border-gray-200 bg-white text-left font-normal whitespace-normal shadow-xl"
    :style="panelStyle"
    @click.stop
  >
    <!-- 排序：与 Excel 一样，排序与筛选共用一个下拉 -->
    <div class="flex items-center gap-1 border-b border-gray-100 px-2 py-2">
      <button
        v-for="action in SORT_ACTIONS"
        :key="action.value"
        type="button"
        class="h-7 rounded px-2 text-xs font-medium transition-colors"
        :class="sortOrder === action.value
          ? 'bg-blue-500 text-white'
          : 'text-gray-600 hover:bg-gray-100'"
        @click="applySort(action.value)"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- 可枚举列：搜索 + 全选/反选/清除 + 取值列表（计数 + 占比） -->
    <template v-if="isValueColumn">
      <div class="border-b border-gray-100 px-2 py-2">
        <input
          v-model="keyword"
          type="text"
          class="h-8 w-full rounded border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
          placeholder="搜索取值，空格分隔多个关键字"
        />
      </div>

      <div class="flex items-center justify-between gap-2 border-b border-gray-100 px-2 py-1.5 text-xs">
        <label class="flex cursor-pointer items-center gap-1.5 text-gray-600">
          <input
            type="checkbox"
            class="h-3.5 w-3.5 accent-blue-500"
            :checked="allVisibleChecked"
            @change="toggleAllVisible"
          />
          <span>全选（{{ total }}）</span>
        </label>
        <div class="flex items-center gap-2 text-gray-500">
          <button type="button" class="hover:text-blue-600" @click="invertVisible">反选</button>
          <button type="button" class="hover:text-blue-600" @click="clearFilter">清除筛选</button>
        </div>
      </div>

      <div class="max-h-64 overflow-y-auto py-1">
        <label
          v-for="option in visibleOptions"
          :key="option.value"
          class="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-gray-50"
        >
          <input
            type="checkbox"
            class="h-3.5 w-3.5 shrink-0 accent-blue-500"
            :checked="isChecked(option.value)"
            @change="toggleValue(option.value)"
          />
          <span class="min-w-0 flex-1 truncate text-gray-700" :title="option.label">{{ option.label }}</span>
          <span class="shrink-0 text-gray-400">（{{ option.count }}）</span>
          <span class="w-12 shrink-0 text-right tabular-nums text-gray-400">{{ formatRatio(option.ratio) }}</span>
        </label>
        <div v-if="visibleOptions.length === 0" class="px-3 py-4 text-center text-xs text-gray-400">
          无匹配的取值
        </div>
      </div>
    </template>

    <!-- 数值列：条件筛选（金额列列举取值没有意义） -->
    <template v-else>
      <div class="space-y-2 px-2 py-3">
        <select
          v-model="numberOperator"
          class="h-8 w-full rounded border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
        >
          <option v-for="option in NUMBER_OPERATOR_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-model="numberValue"
          type="text"
          inputmode="decimal"
          class="h-8 w-full rounded border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
          :placeholder="numberOperator === NumberOperator.BETWEEN ? '下限（可留空）' : '数值'"
        />
        <input
          v-if="numberOperator === NumberOperator.BETWEEN"
          v-model="numberValue2"
          type="text"
          inputmode="decimal"
          class="h-8 w-full rounded border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
          placeholder="上限（可留空）"
        />
        <p class="text-[11px] leading-4 text-gray-400">支持负数；留空表示该端不限。</p>
      </div>

      <div class="flex justify-end border-t border-gray-100 px-2 py-1.5 text-xs">
        <button type="button" class="text-gray-500 hover:text-blue-600" @click="clearFilter">清除筛选</button>
      </div>
    </template>

    <!-- 底部：已选统计 + 关闭 -->
    <div class="flex items-center justify-between gap-2 border-t border-gray-100 px-2 py-1.5 text-[11px] text-gray-400">
      <span>{{ summaryText }}</span>
      <button
        type="button"
        class="h-6 rounded px-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
        @click="$emit('close')"
      >
        完成
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  ColumnFilterKind,
  NumberOperator,
  NUMBER_OPERATOR_OPTIONS,
  SortOrder,
  createColumnFilter,
  formatRatio,
} from '../../utils/columnFilters';

const props = defineProps({
  // 列定义（含 key / label / filter / getFilterValue）
  column: { type: Object, required: true },
  // 值列表选项：{ value, label, count, ratio }
  options: { type: Array, default: () => [] },
  // 统计基数（其他列筛选之后的行数），用于「全选（N）」
  total: { type: Number, default: 0 },
  // 当前筛选状态
  filter: { type: Object, default: null },
  // 当前排序方向：asc / desc / ''
  sortOrder: { type: String, default: '' },
  // 触发按钮的视口坐标（getBoundingClientRect 结果）
  anchor: { type: Object, default: null },
});

const emit = defineEmits(['update:filter', 'update:sort', 'close']);

const SORT_ACTIONS = [
  { label: '升序', value: SortOrder.ASC },
  { label: '降序', value: SortOrder.DESC },
  { label: '清除排序', value: '' },
];

const panelRef = ref(null);
const keyword = ref('');
const numberOperator = ref(NumberOperator.EQ);
const numberValue = ref('');
const numberValue2 = ref('');

const isValueColumn = computed(() => props.column.filter !== ColumnFilterKind.NUMBER);
const allValues = computed(() => props.options.map((option) => option.value));
const checkedValues = computed(() => (Array.isArray(props.filter?.values) ? props.filter.values : allValues.value));
const checkedSet = computed(() => new Set(checkedValues.value));

/** 关键字过滤：空格/逗号分隔，任一命中即展示 */
const visibleOptions = computed(() => {
  const terms = keyword.value
    .split(/[\s,，、;；]+/)
    .map((term) => term.trim().toLocaleLowerCase('zh-CN'))
    .filter(Boolean);
  if (terms.length === 0) return props.options;

  return props.options.filter((option) => {
    const label = option.label.toLocaleLowerCase('zh-CN');
    return terms.some((term) => label.includes(term));
  });
});

const allVisibleChecked = computed(() =>
  visibleOptions.value.length > 0 && visibleOptions.value.every((option) => checkedSet.value.has(option.value)));

const summaryText = computed(() => (isValueColumn.value
  ? `已选 ${checkedSet.value.size} / ${props.options.length} 类`
  : '数值条件筛选'));

/** 面板定位：贴住触发按钮，右侧越界时左移 */
const panelStyle = computed(() => {
  const rect = props.anchor;
  if (!rect) return { position: 'fixed', left: '-9999px', top: '-9999px' };

  const width = 292;
  const viewportWidth = window.innerWidth || 1024;
  const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
  return {
    position: 'fixed',
    left: `${left}px`,
    top: `${Math.round(rect.bottom + 4)}px`,
    width: `${width}px`,
  };
});

const isChecked = (value) => checkedSet.value.has(value);

/** 全选态（values=null）与显式数组之间统一收口：选满即回到「未筛选」 */
const emitValues = (values) => {
  const isFull = values.length === allValues.value.length;
  emit('update:filter', { ...createColumnFilter(), ...props.filter, values: isFull ? null : values });
};

const toggleValue = (value) => {
  const next = new Set(checkedSet.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  emitValues([...next]);
};

const toggleAllVisible = () => {
  const next = new Set(checkedSet.value);
  visibleOptions.value.forEach((option) => {
    if (allVisibleChecked.value) next.delete(option.value);
    else next.add(option.value);
  });
  emitValues([...next]);
};

const invertVisible = () => {
  const next = new Set(checkedSet.value);
  visibleOptions.value.forEach((option) => {
    if (next.has(option.value)) next.delete(option.value);
    else next.add(option.value);
  });
  emitValues([...next]);
};

const clearFilter = () => {
  keyword.value = '';
  emit('update:filter', createColumnFilter());
};

const applySort = (order) => {
  // 再次点击同一方向即取消排序，与 Excel 一致
  emit('update:sort', props.sortOrder === order ? '' : order);
};

// 数值条件：本地输入即时回传（无效输入在纯函数里被视为「未启用」，不会把表格筛空）
const syncNumberFilter = () => {
  const current = props.filter || {};
  if ((current.operator || '') === numberOperator.value
    && String(current.number ?? '') === numberValue.value
    && String(current.number2 ?? '') === numberValue2.value) return;

  emit('update:filter', {
    ...createColumnFilter(),
    operator: numberOperator.value,
    number: numberValue.value,
    number2: numberValue2.value,
  });
};

watch([numberOperator, numberValue, numberValue2], syncNumberFilter);

// 外部（如工具栏清除筛选）改动状态时，本地输入跟随，避免面板与真实筛选不一致
watch(() => props.filter, (filter) => {
  numberOperator.value = filter?.operator || NumberOperator.EQ;
  numberValue.value = filter?.number ?? '';
  numberValue2.value = filter?.number2 ?? '';
}, { deep: true, immediate: true });

const close = () => emit('close');

const handlePointerDown = (event) => {
  if (event.target instanceof Node && panelRef.value?.contains(event.target)) return;
  close();
};

const handleKeydown = (event) => {
  if (event.key === 'Escape') close();
};

onMounted(() => {
  document.addEventListener('mousedown', handlePointerDown);
  document.addEventListener('keydown', handleKeydown);
  // 滚动 / 缩放不在这里收起：由 DataTable 负责跟随触发按钮重定位，
  // 否则筛选后表格高度塌缩引发的 scroll 回弹会把正在操作的面板关掉
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handlePointerDown);
  document.removeEventListener('keydown', handleKeydown);
});
</script>
