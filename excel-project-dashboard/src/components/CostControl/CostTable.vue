<template>
  <!-- 与 D 区域同构：工具栏/分页对齐 A/B/C 区域宽度，表格区通铺视口宽度并随窗口变化 -->
  <div class="overflow-visible">
    <!-- 工具栏：超支筛选 + 列设置 + 搜索 + 导出 -->
    <div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-sm">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">超支筛选</span>
        <button
          v-for="option in filterOptions"
          :key="option.value"
          class="h-8 px-3 rounded border text-xs font-medium transition-colors"
          :class="overFilter === option.value
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'"
          @click="setOverFilter(option.value)"
        >
          {{ option.label }}
        </button>

        <!-- 表头筛选（Excel 风格）：有生效筛选时才出现，避免工具栏长期挂着无用按钮 -->
        <button
          v-if="activeFilterCount > 0"
          class="h-8 rounded border border-blue-300 bg-blue-50 px-3 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
          title="清除所有表头筛选与排序"
          @click="clearHeaderFilters"
        >
          清除表头筛选（{{ activeFilterCount }}）
        </button>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <!-- 列设置（公共组件）：可选成本列 + 项目清单列，「默认」= 成本列 -->
        <ColumnSelector
          v-model:selectedColumns="selectedColumnLabels"
          :availableColumns="allColumnLabels"
          :defaultColumns="defaultColumnLabels"
        />

        <!-- 搜索框（公共组件） -->
        <TableSearchBox
          v-model:query="searchQuery"
          v-model:mode="searchMode"
          v-model:matchMode="searchMatchMode"
          basic-fields-hint="项目编号、项目名称、项目经理、业务部所。"
          global-fields-hint="项目全部字段（含台账原始列、成本分类与合计）以及超支 / 正常、成本分类名等文案。"
          @change="handleSearch"
        />

        <!-- 业务部所展示方式：只影响展示与导出，不影响搜索取值口径 -->
        <label class="inline-flex h-9 items-center gap-1.5 rounded border border-gray-300 pl-3 pr-2 text-sm text-gray-500">
          <span class="whitespace-nowrap">业务部所</span>
          <select
            v-model="departmentMode"
            class="cursor-pointer bg-transparent text-sm text-gray-700 outline-none"
          >
            <option
              v-for="option in DEPARTMENT_DISPLAY_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <button
          class="inline-flex items-center h-9 px-4 rounded border border-gray-300 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="filteredRows.length === 0"
          @click="handleExport"
        >
          导出Excel
        </button>
        <button
          class="inline-flex items-center h-9 px-4 rounded border border-gray-300 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="filteredRows.length === 0"
          @click="openImageExport"
        >
          📷 生成图片
        </button>
      </div>
    </div>

    <!--
      明细表格：突破 main-container 的 max-width 撑满视口宽度（同 D 区域 .table-breakout），
      表格区随窗口宽度变化；表头可拖动调整列宽
    -->
    <div class="ml-[calc(50%_-_50vw)] w-screen border-y border-gray-200 bg-white">
      <div class="p-6">
        <div ref="tableContainerRef" class="overflow-x-auto">
          <DataTable
            :columns="visibleColumns"
            :rows="displayRows"
            :is-empty="filteredRows.length === 0"
            empty-text="当前筛选条件下暂无成本数据"
            :filters="columnFilters"
            :sort="sortState"
            :open-filter-key="openFilterKey"
            :filter-options="openFilterOptions"
            :filter-total="openFilterSourceRows.length"
            @toggle-filter="toggleFilterKey"
            @close-filter="closeFilter"
            @update:filter="setColumnFilter"
            @update:sort="setColumnSort"
          >
            <!-- 业务单元格：内核只认 cell.type，具体长什么样由区域决定 -->
            <template #cell-status="{ row }">
              <span
                class="inline-flex px-2 py-1 rounded-full text-xs font-semibold"
                :class="row.hasOverBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
              >
                {{ row.hasOverBudget ? '超支' : '正常' }}
              </span>
            </template>
            <template #cell-action="{ row }">
              <button
                class="inline-flex h-7 items-center rounded border px-2.5 text-xs font-medium transition-colors"
                :class="row.hasOverBudget
                  ? 'border-red-300 text-red-600 hover:bg-red-100'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-100'"
                @click="openDetail(row)"
              >
                详情
              </button>
            </template>
          </DataTable>
        </div>
      </div>
    </div>

    <!-- 分页：与工具栏同宽居中，避免被通铺的表格区带偏 -->
    <div
      v-if="filteredRows.length > 0"
      class="mx-auto flex max-w-[1400px] items-center justify-between rounded-lg bg-white p-4 shadow-sm"
    >
      <select
        v-model.number="pageSize"
        class="h-9 px-3 border border-gray-300 rounded text-sm text-gray-700"
      >
        <option :value="10">10条/页</option>
        <option :value="20">20条/页</option>
        <option :value="50">50条/页</option>
      </select>

      <div class="flex items-center gap-3">
        <button
          class="h-9 w-9 rounded border border-gray-300 text-gray-600 disabled:opacity-50"
          :disabled="currentPage === 1"
          @click="prevPage"
        >
          &lt;
        </button>
        <span class="text-sm text-gray-700">第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
        <button
          class="h-9 w-9 rounded border border-gray-300 text-gray-600 disabled:opacity-50"
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >
          &gt;
        </button>
      </div>

      <div class="text-sm text-gray-500">共 {{ filteredRows.length }} 条</div>
    </div>

    <!-- 成本明细下钻弹窗（项目 → 科目 → 支出合同） -->
    <CostDetailModal :visible="detailVisible" :row="detailRow" @close="closeDetail" />

    <!-- 图片导出对话框（复用 D 区域公共组件） -->
    <ImageExportModal
      v-if="showImageExport"
      :table-ref="tableContainerRef"
      :title-text="imageExportTitle"
      :file-name="IMAGE_FILE_NAME"
      @close="showImageExport = false"
    />
  </div>
</template>

<script setup>
/**
 * E 区域成本明细表
 *
 * 表格状态（搜索 / 表头筛选 / 排序 / 分页 / 列显隐）全部来自 useDataTable 内核，
 * 渲染交给 DataTable；本组件只声明「列定义 + 行映射 + 业务单元格插槽 + 导出」。
 */
import { computed, ref, watch } from 'vue';
import { filterCostRows, downloadCostAnalysis } from '../../data/costData';
import { OverBudgetFilter } from '../../constants/costCategory';
import { useDataTable } from '../../composables/useDataTable';
import { createRowModel } from '../../utils/tableModel';
import DataTable from '../common/DataTable.vue';
import CostDetailModal from './CostDetailModal.vue';
import ImageExportModal from '../common/ImageExportModal.vue';
import ColumnSelector from '../common/ColumnSelector.vue';
import TableSearchBox from '../common/TableSearchBox.vue';
import { pickAllValues } from '../../utils/tableSearch';
import { buildCostColumns, buildCostCell, defaultCostColumnLabels } from '../../utils/costTableColumns';
import { DepartmentDisplay, DEPARTMENT_DISPLAY_OPTIONS } from '../../utils/departmentDisplay';

const props = defineProps({
  // calculateCostAnalysis 的 rows 结果
  rows: {
    type: Array,
    default: () => [],
  },
});

const overFilter = ref(OverBudgetFilter.ALL);
// 业务部所展示方式：默认全部展示，保持原有行为
const departmentMode = ref(DepartmentDisplay.FULL);

// 详情弹窗：保存当前下钻的项目行
const detailVisible = ref(false);
const detailRow = ref(null);

const filterOptions = [
  { label: '全部', value: OverBudgetFilter.ALL },
  { label: '仅超支', value: OverBudgetFilter.OVER },
  { label: '未超支', value: OverBudgetFilter.NORMAL },
];

// 分类列由数据驱动，新增成本分类后表格自动扩展；
// 列设置里同时提供「项目清单」（台账）的其余列，但默认只勾选成本列
const allColumns = computed(() => buildCostColumns(props.rows));
const defaultColumnLabels = computed(() => defaultCostColumnLabels(allColumns.value));

// 搜索取值口径
const getBasicSearchValues = (row) => [
  row.projectCode,
  row.projectName,
  row.manager,
  row.department,
];

/**
 * 全局搜索不纳入的字段：id（无意义）与 categories（内含合同明细对象，字符串化后只是噪音）。
 * 其余字段——台账原始列（项目清单列）+ 程序字段 + 成本派生字段——全部参与搜索。
 */
const GLOBAL_SEARCH_EXCLUDED_KEYS = ['id', 'categories'];

/**
 * 全局搜索取值口径：行内全部字段 + 成本口径的可读文案。
 * 后三项是界面文案（超支 / 正常、超支成本类型、成本分类名），并不以原始字段存在，
 * 但用户会照着表格去搜，所以必须保留。
 */
const getGlobalSearchValues = (row) => [
  ...pickAllValues(row, GLOBAL_SEARCH_EXCLUDED_KEYS),
  row.hasOverBudget ? '超支' : '正常',
  row.overCategories.join('、'),
  ...row.categories.map((item) => item.label),
];

const {
  visibleColumns,
  allColumnLabels,
  selectedColumnLabels,
  searchQuery,
  searchMode,
  searchMatchMode,
  handleSearch,
  columnFilters,
  sortState,
  openFilterKey,
  activeFilterCount,
  openFilterOptions,
  openFilterSourceRows,
  setColumnFilter,
  setColumnSort,
  toggleFilterKey,
  closeFilter,
  clearHeaderFilters,
  pageSize,
  currentPage,
  totalPages,
  paginatedRows,
  prevPage,
  nextPage,
  filteredRows,
} = useDataTable({
  columns: allColumns,
  // 业务筛选（超支）在链路之外，交给内核做搜索 → 列筛选 → 排序 → 分页
  rows: () => filterCostRows(props.rows, overFilter.value),
  // 默认勾选成本列（= 当前展示的列），项目清单列需在列设置里手动勾选
  initialSelectedLabels: () => defaultColumnLabels.value,
  searchValues: {
    getBasicValues: getBasicSearchValues,
    getGlobalValues: getGlobalSearchValues,
  },
});

const setOverFilter = (value) => {
  overFilter.value = value;
};

// 数据换了（重新上传台账）：旧筛选引用的取值可能已不存在，会让表格看起来"空了"，直接重置
watch(() => props.rows, () => {
  clearHeaderFilters();
});

// 行 × 可见列的单元格模型，使表格渲染与列模型解耦
const displayRows = computed(() => paginatedRows.value.map((row) => createRowModel(
  row,
  visibleColumns.value.map((col) => buildCostCell(row, col, { departmentMode: departmentMode.value })),
  {
    key: row.id,
    rowClass: row.hasOverBudget ? 'bg-red-50' : 'hover:bg-gray-50',
  },
)));

// 图片导出：复用 D 区域的公共弹窗组件，仅需提供表格 DOM 与标题
const IMAGE_FILE_NAME = '项目全景面板_成本管控';
const showImageExport = ref(false);
const tableContainerRef = ref(null);

const imageExportTitle = computed(() => {
  const current = filterOptions.find((option) => option.value === overFilter.value);
  return `项目全景面板 — 成本管控（${current?.label || '全部'}）`;
});

const openImageExport = () => {
  showImageExport.value = true;
};

// 导出列与表格当前可见列一致，且业务部所跟随当前展示方式（所见即所得）
const handleExport = () => {
  downloadCostAnalysis(
    filteredRows.value,
    undefined,
    visibleColumns.value.map((col) => col.label),
    { departmentMode: departmentMode.value },
  );
};

const openDetail = (row) => {
  detailRow.value = row;
  detailVisible.value = true;
};

const closeDetail = () => {
  detailVisible.value = false;
};
</script>
