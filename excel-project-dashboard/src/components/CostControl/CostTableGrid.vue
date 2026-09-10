<template>
  <!-- 表头带拖拽手柄，列宽由 useColumnResize 维护；table-layout: fixed 让宽度严格生效 -->
  <table
    class="mx-auto table-fixed border-collapse text-sm"
    :class="{ 'cursor-col-resize select-none': !!resizing }"
  >
    <colgroup>
      <col
        v-for="col in columns"
        :key="col.key"
        :style="colStyle(col.key)"
      />
    </colgroup>
    <thead>
      <tr class="bg-gray-50 text-gray-500">
        <th
          v-for="col in columns"
          :key="col.key"
          class="relative whitespace-nowrap px-3 py-3 font-semibold"
          :class="col.align === 'right' ? 'text-right' : 'text-center'"
          :style="widthStyle(col.key)"
        >
          <span class="inline-flex items-center gap-1">
            <span>{{ col.label }}</span>
            <!-- 排序标识：与下拉里的升序/降序共用同一状态 -->
            <span v-if="sortMark(col)" class="text-blue-500">{{ sortMark(col) }}</span>
            <!-- 表头筛选入口：Excel 风格漏斗图标，有筛选时高亮 -->
            <button
              v-if="isFilterable(col)"
              type="button"
              class="filter-trigger inline-flex h-4 w-4 items-center justify-center rounded transition-colors"
              :class="hasFilter(col.key) ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'"
              :title="`筛选「${col.label}」`"
              @click.stop="handleToggleFilter($event, col.key)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" class="h-3 w-3">
                <path fill-rule="evenodd" d="M3 4.75A.75.75 0 0 1 3.75 4h12.5a.75.75 0 0 1 .53 1.28l-4.53 4.53v3.94a.75.75 0 0 1-.33.62l-2.5 1.79A.75.75 0 0 1 8 15.54v-5.73L3.22 5.03A.75.75 0 0 1 3 4.75Z" clip-rule="evenodd" />
              </svg>
            </button>
          </span>
          <!-- resize-handle 仅作标识，样式由 Tailwind 类提供 -->
          <span
            class="resize-handle absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500"
            @mousedown.prevent="startResize($event, col.key)"
          ></span>

          <!-- 筛选下拉：fixed 定位在表头下方，避免被表格容器的 overflow 裁切 -->
          <ColumnFilterDropdown
            v-if="openFilterKey === col.key"
            :column="col"
            :options="filterOptions"
            :total="filterTotal"
            :filter="filters[col.key]"
            :sort-order="sort.key === col.key ? sort.order : ''"
            :anchor="anchorRect"
            @update:filter="$emit('update:filter', col.key, $event)"
            @update:sort="$emit('update:sort', col.key, $event)"
            @close="$emit('close-filter')"
          />
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="item in rows"
        :key="item.row.id"
        class="border-b border-gray-50 last:border-b-0"
        :class="item.row.hasOverBudget ? 'bg-red-50' : 'hover:bg-gray-50'"
      >
        <td
          v-for="cell in item.cells"
          :key="cell.key"
          class="truncate whitespace-nowrap px-3 py-2.5"
          :class="cell.cellClass"
          :title="cell.title || cell.text"
        >
          <template v-if="cell.type === 'status'">
            <span
              class="inline-flex px-2 py-1 rounded-full text-xs font-semibold"
              :class="item.row.hasOverBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
            >
              {{ item.row.hasOverBudget ? '超支' : '正常' }}
            </span>
          </template>
          <template v-else-if="cell.type === 'action'">
            <button
              class="inline-flex h-7 items-center rounded border px-2.5 text-xs font-medium transition-colors"
              :class="item.row.hasOverBudget
                ? 'border-red-300 text-red-600 hover:bg-red-100'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
              @click="$emit('open-detail', item.row)"
            >
              详情
            </button>
          </template>
          <template v-else>{{ cell.text }}</template>
        </td>
      </tr>
    </tbody>
  </table>

  <div v-if="isEmpty" class="py-12 text-center text-sm text-gray-500">
    当前筛选条件下暂无成本数据
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useColumnResize } from '../../composables/useColumnResize';
import { FALLBACK_COLUMN_WIDTH } from '../../utils/costTableColumns';
import { ColumnFilterKind, SortOrder, isColumnFilterActive } from '../../utils/columnFilters';
import ColumnFilterDropdown from '../common/ColumnFilterDropdown.vue';

const props = defineProps({
  // 可见列定义（含 key / label / align / width）
  columns: {
    type: Array,
    default: () => [],
  },
  // 行 × 单元格模型，由父组件构造，保证渲染与列模型解耦
  rows: {
    type: Array,
    default: () => [],
  },
  // 无数据时展示空状态
  isEmpty: {
    type: Boolean,
    default: false,
  },
  // 各列筛选状态 { [col.key]: { values, operator, number, number2 } }
  filters: {
    type: Object,
    default: () => ({}),
  },
  // 当前排序 { key, order }
  sort: {
    type: Object,
    default: () => ({ key: '', order: '' }),
  },
  // 展开的下拉所属列 key（由父组件持有，保证同时只开一个）
  openFilterKey: {
    type: String,
    default: '',
  },
  // 展开列的值列表选项（父组件按"其他列筛选之后"的数据统计）
  filterOptions: {
    type: Array,
    default: () => [],
  },
  // 展开列的统计基数
  filterTotal: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['open-detail', 'toggle-filter', 'close-filter', 'update:filter', 'update:sort']);

// 下拉锚点：打开时记录触发按钮的视口坐标，供 fixed 定位
const anchorRect = ref(null);

const isFilterable = (col) => col.filter !== ColumnFilterKind.NONE;
const hasFilter = (key) => isColumnFilterActive(props.filters?.[key]);
const sortMark = (col) => {
  if (props.sort?.key !== col.key) return '';
  if (props.sort.order === SortOrder.ASC) return '↑';
  if (props.sort.order === SortOrder.DESC) return '↓';
  return '';
};

const handleToggleFilter = (event, key) => {
  // 收起时不重算锚点，交给父组件决定开关
  anchorRect.value = props.openFilterKey === key ? null : event.currentTarget.getBoundingClientRect();
  emit('toggle-filter', key);
};

const columnKeys = computed(() => props.columns.map((col) => col.key));

// 默认宽度来自列模型；兜底避免未声明宽度的列在 fixed 布局下塌陷
const defaultWidths = computed(() =>
  Object.fromEntries(props.columns.map((col) => [col.key, col.width ?? FALLBACK_COLUMN_WIDTH]))
);

const { columnWidths, resizing, startResize } = useColumnResize(
  columnKeys,
  (key) => defaultWidths.value[key] ?? FALLBACK_COLUMN_WIDTH
);

const widthStyle = (key) => (columnWidths.value[key] ? { width: `${columnWidths.value[key]}px` } : {});

const colStyle = (key) =>
  columnWidths.value[key]
    ? { width: `${columnWidths.value[key]}px`, minWidth: `${columnWidths.value[key]}px` }
    : {};
</script>
