<template>
  <div class="project-detail-container">
    <!-- 控制区域：tabs + toolbar + pagination，对齐 A/B/C 区域宽度 -->
    <div class="control-wrapper">
      <!-- 第一层：主Tab切换 -->
      <div class="main-tabs">
        <button
          @click="setTab('initial')"
          class="tab-btn"
          :class="{ 'active': currentTab === 'initial' }"
        >
          初验项目明细
        </button>
        <button
          @click="setTab('final')"
          class="tab-btn"
          :class="{ 'active': currentTab === 'final' }"
        >
          终验项目明细
        </button>
      </div>

      <!-- 第二层：工具栏 -->
      <div class="toolbar-section">
        <div class="toolbar-left">
          <!-- 二级状态过滤器 -->
          <div class="status-filter-group">
            <button
              @click="setStatusFilter('all')"
              class="status-btn"
              :class="{ 'active': statusFilter === 'all' }"
            >
              全部
            </button>
            <button
              @click="setStatusFilter('accepted')"
              class="status-btn"
              :class="{ 'active': statusFilter === 'accepted' }"
            >
              已验收
            </button>
            <button
              @click="setStatusFilter('pending')"
              class="status-btn"
              :class="{ 'active': statusFilter === 'pending' }"
            >
              待验收/待结算
            </button>
          </div>
        </div>

        <div class="toolbar-right">
          <!-- 列设置（公共组件；日期列与倒计时列固定展示，不参与勾选） -->
          <ColumnSelector
            :availableColumns="selectableColumnLabels"
            v-model:selectedColumns="selectedColumnLabels"
            :defaultColumns="DEFAULT_PROJECT_COLUMNS"
          />

          <!-- 搜索框（公共组件） -->
          <TableSearchBox
            v-model:query="searchQuery"
            v-model:mode="searchMode"
            v-model:matchMode="searchMatchMode"
            @change="handleSearch"
          />

          <!-- 导出按钮 -->
          <button
            @click="exportToExcel"
            class="export-btn"
            :disabled="!filteredRows.length"
          >
            导出Excel
          </button>

          <!-- 生成分享图片按钮 -->
          <button
            @click="openImageExport"
            class="image-export-btn"
            :disabled="!filteredRows.length"
          >
            📷 生成图片
          </button>
        </div>
      </div>
    </div><!-- /.control-wrapper (tabs + toolbar) -->

    <!-- 第三层：数据表格 — 独立撑满视口宽度 -->
    <div class="table-breakout">
      <div class="table-section">
        <div ref="tableContainerRef" class="table-container">
          <DataTable
            :columns="visibleColumns"
            :rows="displayRows"
            :is-empty="filteredRows.length === 0"
            table-class="table"
            head-row-class=""
            head-cell-class=""
            body-row-class=""
            body-cell-class=""
          >
            <!-- 项目名称：链接下钻 -->
            <template #cell-link="{ cell }">
              <a
                href="#"
                class="project-name"
                @click.prevent="openProjectDetail(cell.projectId)"
              >
                {{ cell.text }}
              </a>
            </template>

            <!-- 项目状态：验收红绿灯 + 状态标签 -->
            <template #cell-status="{ cell }">
              <span class="traffic-status-group">
                <span
                  v-if="cell.traffic"
                  class="traffic-tag"
                  :class="cell.traffic.cssClass"
                >
                  {{ cell.traffic.label }}
                </span>
                <span class="status-tag" :class="cell.statusClass">
                  {{ cell.statusText }}
                </span>
              </span>
            </template>

            <!-- 验收倒计时：初验 / 终验两行 -->
            <template #cell-countdown="{ cell }">
              <div class="countdown">
                <div class="countdown-row">
                  <span class="phase">初验</span>
                  <template v-if="cell.countdown.initial.state === 'done'">
                    <span class="dot gray"></span><span class="done">已验收</span>
                  </template>
                  <template v-else-if="cell.countdown.initial.state === 'na'">
                    <span class="na">—</span>
                  </template>
                  <template v-else>
                    <span class="dot" :class="cell.countdown.initial.color"></span>
                    <span class="days" :class="cell.countdown.initial.color">
                      {{ cell.countdown.initial.text }}
                    </span>
                  </template>
                </div>
                <div class="countdown-row">
                  <span class="phase">终验</span>
                  <template v-if="cell.countdown.final.state === 'done'">
                    <span class="dot gray"></span><span class="done">已验收</span>
                  </template>
                  <template v-else-if="cell.countdown.final.state === 'na'">
                    <span class="na">—</span>
                  </template>
                  <template v-else>
                    <span class="dot" :class="cell.countdown.final.color"></span>
                    <span class="days" :class="cell.countdown.final.color">
                      {{ cell.countdown.final.text }}
                    </span>
                  </template>
                </div>
              </div>
            </template>

            <template #empty>
              <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p class="empty-text">暂无数据</p>
              </div>
            </template>
          </DataTable>
        </div>
      </div>
    </div><!-- /.table-breakout -->

    <!-- 图片导出对话框 -->
    <ImageExportModal
      v-if="showImageExport"
      :table-ref="tableContainerRef"
      :title-text="imageExportTitle"
      @close="showImageExport = false"
    />

    <!-- 第四层：底部分页器 — 对齐 A/B/C 区域宽度 -->
    <div class="control-wrapper" style="margin-top: 1px;">
      <div class="pagination-section" v-if="filteredRows.length > 0">
        <div class="pagination-left">
          <select
            v-model="pageSize"
            class="page-size-select"
            @change="handlePageSizeChange"
          >
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
          </select>
        </div>

        <div class="pagination-center">
          <div class="page-nav">
            <button
              @click="prevPage"
              :disabled="currentPage === 1"
              class="nav-btn"
            >
              &lt;
            </button>

            <span class="page-info">
              第 {{ currentPage }} 页，共 {{ totalPages }} 页
            </span>

            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages"
              class="nav-btn"
            >
              &gt;
            </button>
          </div>
        </div>

        <div class="pagination-right">
          <div class="pagination-info">
            共 {{ filteredRows.length }} 条
          </div>
        </div>
      </div>
    </div><!-- /.control-wrapper (pagination) -->
  </div>
</template>

<script setup>
/**
 * D 区域项目明细表
 *
 * 表格状态（搜索 / 分页 / 列显隐）来自 useDataTable 内核，渲染交给 DataTable；
 * 业务筛选（项目类型 / Tab + 日期范围 / 验收状态）与导出、截图留在这里。
 * 列模型与行映射见 utils/projectTableColumns.js、utils/projectTableRow.js（纯函数，可单测）。
 */
import { computed, ref, watch } from 'vue';
import ColumnSelector from '../common/ColumnSelector.vue';
import ImageExportModal from '../common/ImageExportModal.vue';
import TableSearchBox from '../common/TableSearchBox.vue';
import DataTable from '../common/DataTable.vue';
import { filterBySearchQuery, pickAllValues } from '../../utils/tableSearch';
import { useDataTable } from '../../composables/useDataTable';
import { downloadTable } from '../../utils/excelExport';
import { isAmountColumn } from '../../utils/tableModel';
import {
  DEFAULT_PROJECT_COLUMNS,
  buildProjectColumns,
  extractColumnNames,
  getColumnValue,
} from '../../utils/projectTableColumns';
import {
  buildProjectRow,
  getCountdownExport,
  tabLabelOf,
} from '../../utils/projectTableRow';

const props = defineProps({
  projects: {
    type: Array,
    required: true,
  },
  projectType: {
    type: String,
    default: '全部',
  },
  dateRange: {
    type: Object,
    default: () => ({ start: '', end: '' }),
  },
});

const emit = defineEmits(['export', 'open-detail']);

const currentTab = ref('initial');
const statusFilter = ref('all');

// 可选 Excel 列名：数据变化时取所有项目键的并集
const excelColumnNames = ref([...DEFAULT_PROJECT_COLUMNS]);
watch(() => props.projects, (projects) => {
  if (projects && projects.length > 0) {
    excelColumnNames.value = extractColumnNames(projects);
  }
}, { immediate: true });

// 列模型：Excel 列 + 固定日期列 + 固定倒计时列
const allColumns = computed(() => buildProjectColumns({
  columnNames: excelColumnNames.value,
  tab: currentTab.value,
}));

// 搜索取值口径（匹配规则统一由 utils/tableSearch 提供）
const getBasicSearchValues = (project) => [
  project.projectName,
  project.manager,
  project.projectCode,
  project['项目编号'],
];

const getGlobalSearchValues = (project) => pickAllValues(project, ['id']);

// 判断日期是否在选定时间范围内（与既有口径一致：日期缺失或范围不完整即排除）
const isDateInRange = (dateStr) => {
  if (!dateStr) return false;
  const hasRange = props.dateRange?.start && props.dateRange?.end;
  if (!hasRange) return false;
  const date = new Date(dateStr);
  return date >= new Date(props.dateRange.start) && date <= new Date(props.dateRange.end);
};

// 业务筛选：项目类型 → Tab + 时间范围 → 验收状态；搜索交给内核
const businessRows = computed(() => {
  let filtered = props.projects;

  if (props.projectType !== '全部') {
    filtered = filtered.filter((project) => project.projectType === props.projectType);
  }

  filtered = filtered.filter((project) => {
    const planDate = currentTab.value === 'initial'
      ? project.planInitialDate
      : project.planFinalDate;
    return isDateInRange(planDate);
  });

  if (statusFilter.value !== 'all') {
    filtered = filtered.filter((project) => {
      const actualDate = currentTab.value === 'initial'
        ? project.actualInitialDate
        : project.actualFinalDate;
      return statusFilter.value === 'accepted' ? !!actualDate : !actualDate;
    });
  }

  return filtered;
});

const {
  visibleColumns,
  selectableColumnLabels,
  selectedColumnLabels,
  searchQuery,
  searchMode,
  searchMatchMode,
  handleSearch,
  filteredRows,
  paginatedRows,
  pageSize,
  currentPage,
  totalPages,
  prevPage,
  nextPage,
  handlePageSizeChange,
  resetPage,
} = useDataTable({
  columns: allColumns,
  rows: businessRows,
  searchValues: {
    getBasicValues: getBasicSearchValues,
    getGlobalValues: getGlobalSearchValues,
  },
  initialSelectedLabels: DEFAULT_PROJECT_COLUMNS,
  // 换台账后数据里没有的列要从勾选集合里清掉
  pruneMissingColumns: true,
});

// 行模型：可见列 × 项目行 → 单元格（含链接 / 状态 / 金额 / 倒计时类型）
const displayRows = computed(() => paginatedRows.value.map((project) => buildProjectRow(project, {
  columns: visibleColumns.value,
  tab: currentTab.value,
})));

const setTab = (tab) => {
  currentTab.value = tab;
  resetPage();
};

const setStatusFilter = (status) => {
  statusFilter.value = status;
  resetPage();
};

/**
 * 导出 Excel
 * 导出列 = 当前可见的 Excel 列 + 当前 Tab 的两个日期列 + 初验/终验两个倒计时列
 * （与既有导出结构保持一致，金额列导出为数值并按 #,##0.00 格式化）
 */
const exportToExcel = () => {
  if (!filteredRows.value.length) return;

  const tabLabel = tabLabelOf(currentTab.value);
  const excelColumns = visibleColumns.value
    .filter((col) => !col.fixed)
    .map((col) => col.label);
  const headers = [
    ...excelColumns,
    `计划${tabLabel}时间`,
    `实际${tabLabel}时间`,
    '初验倒计时',
    '终验倒计时',
  ];

  const data = filteredRows.value.map((project) => {
    const row = {};
    excelColumns.forEach((column) => {
      const value = getColumnValue(project, column);
      row[column] = isAmountColumn(column) ? (parseFloat(value) || 0) : value;
    });

    row[`计划${tabLabel}时间`] = currentTab.value === 'initial'
      ? project.planInitialDate
      : project.planFinalDate;
    row[`实际${tabLabel}时间`] = currentTab.value === 'initial'
      ? (project.actualInitialDate || '-')
      : (project.actualFinalDate || '-');
    row['初验倒计时'] = getCountdownExport(project.planInitialDate, project.actualInitialDate);
    row['终验倒计时'] = getCountdownExport(project.planFinalDate, project.actualFinalDate);

    return headers.map((header) => row[header] ?? '');
  });

  downloadTable({
    headers,
    data,
    sheetName: '项目明细',
    fileName: `项目明细_${new Date().toISOString().slice(0, 10)}.xlsx`,
  });
};

const openProjectDetail = (projectId) => {
  // 由 ProjectDetailSection 决定后续行为
  emit('open-detail', projectId);
};

// 图片导出：直接引用组件内 DOM（原实现用 document.querySelector，多实例时不安全）
const showImageExport = ref(false);
const tableContainerRef = ref(null);
const imageExportTitle = computed(() => {
  const tabLabel = tabLabelOf(currentTab.value);
  const dateRangeStr = props.dateRange?.start ? `${props.dateRange.start?.slice(0, 7)}` : '';
  return `项目全景面板 — ${dateRangeStr} ${tabLabel}明细`;
});

const openImageExport = () => {
  showImageExport.value = true;
};
</script>

<style scoped>
/* 项目明细容器 — 无独立背景，由子元素分别控制 */
.project-detail-container {
  overflow: visible;
}

/* 控制区域居中容器 — tabs、toolbar、pagination 对齐 A/B/C 区域宽度 */
.control-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  background-color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: visible;
  border-radius: 0.5rem;
}

/* 表格区域 — 独立突破 max-width，撑满视口宽度 */
.table-breakout {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  background-color: white;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
}

/* 图片导出按钮 */
.image-export-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: #fff;
  color: #374151;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.image-export-btn:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}
.image-export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 验收倒计时列 */
:deep(.countdown-cell) {
  min-width: 130px;
  padding: 6px 10px;
}
:deep(.countdown) {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
:deep(.countdown-row) {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  white-space: nowrap;
}
:deep(.countdown-row .phase) {
  color: #6b7280;
  min-width: 28px;
}
:deep(.countdown-row .dot) {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
:deep(.countdown-row .dot.red) { background: #ef4444; }
:deep(.countdown-row .dot.yellow) { background: #f59e0b; }
:deep(.countdown-row .dot.green) { background: #22c55e; }
:deep(.countdown-row .dot.gray) { background: #9ca3af; }
:deep(.countdown-row .days) {
  font-weight: 600;
}
:deep(.countdown-row .days.red) { color: #ef4444; }
:deep(.countdown-row .days.yellow) { color: #d97706; }
:deep(.countdown-row .days.green) { color: #16a34a; }
:deep(.countdown-row .done) {
  color: #9ca3af;
  font-size: 12px;
}
:deep(.countdown-row .na) {
  color: #d1d5db;
  font-size: 12px;
}

/* 第一层：主Tab切换 - 左对齐 */
.main-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background-color: #f9fafb;
}

.tab-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* 第二层：工具栏 - space-between 布局 */
.toolbar-section {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  justify-content: flex-end;
}

/* 二级状态过滤器 */
.status-filter-group {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-btn:hover {
  background-color: #f9fafb;
}

.status-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* 搜索框样式见 components/common/TableSearchBox.vue */

/* 导出按钮 */
.export-btn {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #374151;
  font-size: 0.813rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.export-btn:hover {
  background-color: #f9fafb;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 第三层：数据表格 */
.table-section {
  padding: 1.5rem;
}

.table-container {
  overflow-x: auto;
}

/* 表格本体由 DataTable 内核渲染，样式经 :deep 穿透 */
:deep(.table) {
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0 auto;
}

:deep(.table th) {
  position: relative;
  text-align: center;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

:deep(.resize-handle) {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background-color 0.15s;
  z-index: 1;
}

:deep(.resize-handle:hover) {
  background-color: #3b82f6;
}

:deep(.table.is-resizing) {
  user-select: none;
  cursor: col-resize;
}

:deep(.table td) {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
  white-space: nowrap;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 项目编号列：允许换行 */
:deep(.table td.col-project-code) {
  white-space: normal;
  word-break: break-word;
  max-width: 160px;
  overflow: visible;
  text-overflow: clip;
}

/* 项目名称列：允许换行，不截断 */
:deep(.table td.col-project-name) {
  white-space: normal;
  word-break: break-word;
  max-width: 320px;
  overflow: visible;
  text-overflow: clip;
}

:deep(.table tr:last-child td) {
  border-bottom: none;
}

/* 项目名称链接 */
:deep(.project-name) {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

:deep(.project-name:hover) {
  text-decoration: underline;
}

/* 金额对齐 */
:deep(.amount-header) {
  text-align: right;
}

:deep(.amount) {
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

/* 状态标签 */
:deep(.status-tag) {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.status-completed) {
  background-color: #d1fae5;
  color: #065f46;
}

:deep(.status-pending) {
  background-color: #fef3c7;
  color: #92400e;
}

/* 验收红绿灯标签 */
:deep(.traffic-status-group) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

:deep(.traffic-tag) {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

:deep(.traffic-completed) {
  background-color: #d1fae5;
  color: #065f46;
}

:deep(.traffic-pending) {
  background-color: #fed7aa;
  color: #9a3412;
}

:deep(.traffic-delayed) {
  background-color: #fee2e2;
  color: #991b1b;
}

/* 空状态 */
:deep(.empty-state) {
  text-align: center;
  padding: 3rem;
}

:deep(.empty-icon) {
  width: 32px;
  height: 32px;
  color: #9ca3af;
  margin-bottom: 1rem;
}

:deep(.empty-text) {
  color: #6b7280;
  font-size: 0.875rem;
}

/* 第四层：底部分页器 - 右对齐 */
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.pagination-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.pagination-right {
  font-size: 0.875rem;
  color: #6b7280;
}

.page-size-select {
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
  background-color: white;
  cursor: pointer;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #6b7280;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background-color: #f9fafb;
  color: #374151;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
  padding: 0 1rem;
}

@media (max-width: 1300px) {
  .toolbar-section {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    flex: 0 0 100%;
  }

  .toolbar-right {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar-section {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .toolbar-right {
    justify-content: stretch;
  }

  .pagination-section {
    flex-direction: column;
    gap: 1rem;
  }

  .pagination-left,
  .pagination-center,
  .pagination-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
