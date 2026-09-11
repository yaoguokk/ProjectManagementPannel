<template>
  <!--
    通用表格渲染内核（纯渲染，无业务语义）

    - 吃「列模型 + 行×单元格模型」，见 utils/tableModel 的字段说明
    - 表头能力：列宽拖拽、表头筛选漏斗（列声明 filter 后出现）、排序标识
    - 业务单元格通过具名插槽注入：<template #cell-status="{ cell, row }">…</template>
    - 空态可整体替换：<template #empty>…</template>
  -->
  <table
    class="table-fixed border-collapse text-sm"
    :class="[tableClass, { 'cursor-col-resize select-none': !!resizing }]"
  >
    <colgroup>
      <col
        v-for="col in columns"
        :key="col.key"
        :style="colStyle(col.key)"
      />
    </colgroup>
    <thead>
      <tr :class="headRowClass">
        <th
          v-for="col in columns"
          :key="col.key"
          class="relative whitespace-nowrap font-semibold"
          :class="[headCellClass, alignClass(col), col.headerClass]"
          :style="widthStyle(col.key)"
          :title="col.label"
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
        :key="item.key"
        :class="[bodyRowClass, item.rowClass]"
      >
        <td
          v-for="cell in item.cells"
          :key="cell.key"
          class="truncate whitespace-nowrap"
          :class="[bodyCellClass, cell.cellClass]"
          :title="cell.title || cell.text"
        >
          <slot
            v-if="cell.type && $slots[`cell-${cell.type}`]"
            :name="`cell-${cell.type}`"
            :cell="cell"
            :row="item.row"
          />
          <template v-else>{{ cell.text }}</template>
        </td>
      </tr>
    </tbody>
  </table>

  <slot v-if="isEmpty" name="empty">
    <div class="py-12 text-center text-sm text-gray-500">{{ emptyText }}</div>
  </slot>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useColumnResize } from '../../composables/useColumnResize';
import { ColumnFilterKind, SortOrder, isColumnFilterActive } from '../../utils/columnFilters';
import { FALLBACK_COLUMN_WIDTH, alignClass, resolveColumnWidth } from '../../utils/tableModel';
import ColumnFilterDropdown from './ColumnFilterDropdown.vue';

const props = defineProps({
  // 列模型（含 key / label / align / width / filter）
  columns: {
    type: Array,
    default: () => [],
  },
  // 行模型：{ key, row, cells, rowClass? }
  rows: {
    type: Array,
    default: () => [],
  },
  // 无数据时展示空状态（可用 #empty 插槽替换）
  isEmpty: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: '暂无数据',
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
  // 展开列的值列表选项（由 useDataTable 按「其他列筛选之后」的数据统计）
  filterOptions: {
    type: Array,
    default: () => [],
  },
  // 展开列的统计基数
  filterTotal: {
    type: Number,
    default: 0,
  },
  // 样式钩子：不同区域沿用各自的表格外观，内核不强制统一视觉
  tableClass: {
    type: String,
    default: 'mx-auto',
  },
  headRowClass: {
    type: String,
    default: 'bg-gray-50 text-gray-500',
  },
  headCellClass: {
    type: String,
    default: 'px-3 py-3',
  },
  bodyRowClass: {
    type: String,
    default: 'border-b border-gray-50 last:border-b-0',
  },
  bodyCellClass: {
    type: String,
    default: 'px-3 py-2.5',
  },
});

const emit = defineEmits(['open-detail', 'toggle-filter', 'close-filter', 'update:filter', 'update:sort']);

// 下拉锚点：打开时记录触发按钮的视口坐标，供 fixed 定位
const anchorRect = ref(null);

// 必须显式声明 filter 才渲染筛选漏斗：D 区域的项目明细表没有表头筛选，不该出现入口
const isFilterable = (col) => Boolean(col.filter) && col.filter !== ColumnFilterKind.NONE;
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
  Object.fromEntries(props.columns.map((col) => [col.key, resolveColumnWidth(col)])));

const { columnWidths, resizing, startResize } = useColumnResize(
  columnKeys,
  (key) => defaultWidths.value[key] ?? FALLBACK_COLUMN_WIDTH,
);

const widthStyle = (key) => (columnWidths.value[key] ? { width: `${columnWidths.value[key]}px` } : {});

const colStyle = (key) =>
  columnWidths.value[key]
    ? { width: `${columnWidths.value[key]}px`, minWidth: `${columnWidths.value[key]}px` }
    : {};
</script>
