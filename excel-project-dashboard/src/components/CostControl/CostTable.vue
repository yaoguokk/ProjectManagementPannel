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
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <!-- 列设置（公共组件） -->
        <ColumnSelector
          v-model:selectedColumns="selectedColumnLabels"
          :availableColumns="allColumnLabels"
          :defaultColumns="allColumnLabels"
        />

        <!-- 搜索框（公共组件） -->
        <TableSearchBox
          v-model:query="searchQuery"
          v-model:mode="searchMode"
          v-model:matchMode="searchMatchMode"
          basic-fields-hint="项目编号、项目名称、项目经理、业务部所。"
          global-fields-hint="项目的所有成本业务字段。"
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
          <CostTableGrid
            :columns="visibleColumns"
            :rows="displayRows"
            :is-empty="filteredRows.length === 0"
            @open-detail="openDetail"
          />
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
          @click="currentPage--"
        >
          &lt;
        </button>
        <span class="text-sm text-gray-700">第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
        <button
          class="h-9 w-9 rounded border border-gray-300 text-gray-600 disabled:opacity-50"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
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
import { ref, computed, watch } from 'vue';
import { filterCostRows, downloadCostAnalysis } from '../../data/costData';
import { OverBudgetFilter } from '../../constants/costCategory';
import CostDetailModal from './CostDetailModal.vue';
import CostTableGrid from './CostTableGrid.vue';
import ImageExportModal from '../common/ImageExportModal.vue';
import ColumnSelector from '../common/ColumnSelector.vue';
import TableSearchBox from '../common/TableSearchBox.vue';
import { filterBySearchQuery } from '../../utils/tableSearch';
import { buildCostColumns, buildCostCell } from '../../utils/costTableColumns';
import { DepartmentDisplay, DEPARTMENT_DISPLAY_OPTIONS } from '../../utils/departmentDisplay';

const props = defineProps({
  // calculateCostAnalysis 的 rows 结果
  rows: {
    type: Array,
    default: () => [],
  },
});

const overFilter = ref(OverBudgetFilter.ALL);
const pageSize = ref(10);
const currentPage = ref(1);

// 搜索（语义与 D 区域一致，规则见 utils/tableSearch）
const searchQuery = ref('');
const searchMode = ref('basic');
const searchMatchMode = ref('any');

// 详情弹窗：保存当前下钻的项目行
const detailVisible = ref(false);
const detailRow = ref(null);

// 业务部所展示方式：默认全部展示，保持原有行为
const departmentMode = ref(DepartmentDisplay.FULL);

const filterOptions = [
  { label: '全部', value: OverBudgetFilter.ALL },
  { label: '仅超支', value: OverBudgetFilter.OVER },
  { label: '未超支', value: OverBudgetFilter.NORMAL },
];

// 分类列由数据驱动，新增成本分类后表格自动扩展
const allColumns = computed(() => buildCostColumns(props.rows));

const allColumnLabels = computed(() => allColumns.value.map((col) => col.label));

// 列设置选中的列名（默认全选），与 D 区域共用 ColumnSelector
const selectedColumnLabels = ref([]);
const columnsInitialized = ref(false);

// 首次拿到数据时才按「全部列」初始化，之后完全由用户选择决定。
// 保留已消失的列名不清理，避免筛选后数据暂时为空导致用户的选择被重置。
watch(() => props.rows.length, (rowCount) => {
  if (columnsInitialized.value || rowCount === 0) return;
  selectedColumnLabels.value = [...allColumnLabels.value];
  columnsInitialized.value = true;
}, { immediate: true });

// 展示列始终按自然列序输出，避免取消再勾选后列跑到末尾
const visibleColumns = computed(() => {
  if (!columnsInitialized.value) return allColumns.value;
  const selected = new Set(selectedColumnLabels.value);
  return allColumns.value.filter((col) => selected.has(col.label));
});

// 搜索取值口径
const getBasicSearchValues = (row) => [
  row.projectCode,
  row.projectName,
  row.manager,
  row.department,
];

const getGlobalSearchValues = (row) => [
  row.projectCode,
  row.projectName,
  row.manager,
  row.department,
  row.projectType,
  row.planFinalDate,
  row.actualFinalDate,
  row.hasOverBudget ? '超支' : '正常',
  row.overCategories.join('、'),
  ...row.categories.map((item) => item.label),
];

const filteredRows = computed(() =>
  filterBySearchQuery(filterCostRows(props.rows, overFilter.value), {
    query: searchQuery.value,
    mode: searchMode.value,
    matchMode: searchMatchMode.value,
    getBasicValues: getBasicSearchValues,
    getGlobalValues: getGlobalSearchValues,
  })
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value))
);

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

// 筛选条件或数据变化时回到第一页，避免停留在越界页码
watch([filteredRows, pageSize], () => {
  currentPage.value = 1;
});

const setOverFilter = (value) => {
  overFilter.value = value;
};

const handleSearch = () => {
  currentPage.value = 1;
};

// 行 × 可见列的单元格模型，使表格渲染与可见列解耦
const displayRows = computed(() =>
  paginatedRows.value.map((row) => ({
    row,
    cells: visibleColumns.value.map((col) =>
      buildCostCell(row, col, { departmentMode: departmentMode.value })
    ),
  }))
);

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
    { departmentMode: departmentMode.value }
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
