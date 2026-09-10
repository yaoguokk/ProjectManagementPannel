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
          {{ col.label }}
          <!-- resize-handle 仅作标识，样式由 Tailwind 类提供 -->
          <span
            class="resize-handle absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500"
            @mousedown.prevent="startResize($event, col.key)"
          ></span>
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
import { computed } from 'vue';
import { useColumnResize } from '../../composables/useColumnResize';
import { FALLBACK_COLUMN_WIDTH } from '../../utils/costTableColumns';

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
});

defineEmits(['open-detail']);

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
