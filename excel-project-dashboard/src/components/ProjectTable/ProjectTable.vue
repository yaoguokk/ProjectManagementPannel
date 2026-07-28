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
          <!-- 列设置 -->
          <ColumnSelector
            :availableColumns="allColumnNames"
            v-model:selectedColumns="visibleColumns"
            :defaultColumns="defaultColumnNames"
          />

          <!-- 搜索框 -->
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索项目名称或项目经理..."
              @input="handleSearch"
            />
            <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <!-- 导出按钮 -->
          <button
            @click="exportToExcel"
            class="export-btn"
            :disabled="!filteredProjects.length"
          >
            导出Excel
          </button>
        </div>
      </div>
    </div><!-- /.control-wrapper (tabs + toolbar) -->

    <!-- 第三层：数据表格 — 独立撑满视口宽度 -->
    <div class="table-breakout">
      <div class="table-section">
        <div class="table-container">
          <table class="table" :class="{ 'is-resizing': !!resizing }" :key="allColumns.join(',')">
            <colgroup>
              <col
                v-for="col in allColumns"
                :key="col"
                :style="columnWidths[col] ? { width: columnWidths[col] + 'px', minWidth: columnWidths[col] + 'px' } : {}"
              />
            </colgroup>
            <thead>
              <tr>
                <th
                  v-for="col in allColumns"
                  :key="col"
                  :class="{ 'amount-header': isAmountColumn(col) }"
                  :style="columnWidths[col] ? { width: columnWidths[col] + 'px' } : {}"
                >
                  {{ col }}
                  <div
                    class="resize-handle"
                    @mousedown.prevent="startResize($event, col)"
                  ></div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="project in paginatedProjects" :key="project.id">
                <td
                  v-for="col in visibleColumns"
                  :key="col"
                  :class="{ 'amount': isAmountColumn(col), 'col-project-name': col === '项目名称', 'col-project-code': col === '项目编号' }"
                  :title="getColumnValue(project, col)"
                >
                  <template v-if="col === '项目名称'">
                    <a
                      href="#"
                      class="project-name"
                      @click.prevent="openProjectDetail(project.id)"
                    >
                      {{ project['项目名称'] || project.projectName }}
                    </a>
                  </template>
                  <template v-else-if="col === '项目状态'">
                    <span class="traffic-status-group">
                      <span
                        v-if="getTrafficLight(project)"
                        class="traffic-tag"
                        :class="getTrafficLight(project).cssClass"
                      >
                        {{ getTrafficLight(project).label }}
                      </span>
                      <span
                        class="status-tag"
                        :class="getStatusClass(project['项目状态'] || project.status)"
                      >
                        {{ project['项目状态'] || project.status }}
                      </span>
                    </span>
                  </template>
                  <template v-else-if="isAmountColumn(col)">
                    {{ formatCurrency(getColumnValue(project, col)) }}
                  </template>
                  <template v-else>
                    {{ getColumnValue(project, col) }}
                  </template>
                </td>
                <td>{{ getPlanDate(project) }}</td>
                <td>{{ getActualDate(project) }}</td>
                <td class="countdown-cell">
                  <div class="countdown">
                    <div class="countdown-row">
                      <span class="phase">初验</span>
                      <template v-if="project.actualInitialDate">
                        <span class="dot gray"></span><span class="done">已验收</span>
                      </template>
                      <template v-else-if="!project.planInitialDate">
                        <span class="na">—</span>
                      </template>
                      <template v-else>
                        <span class="dot" :class="getCountdownColor(getDaysRemaining(project.planInitialDate))"></span>
                        <span class="days" :class="getCountdownColor(getDaysRemaining(project.planInitialDate))">
                          {{ getCountdownText(getDaysRemaining(project.planInitialDate)) }}
                        </span>
                      </template>
                    </div>
                    <div class="countdown-row">
                      <span class="phase">终验</span>
                      <template v-if="project.actualFinalDate">
                        <span class="dot gray"></span><span class="done">已验收</span>
                      </template>
                      <template v-else-if="!project.planFinalDate">
                        <span class="na">—</span>
                      </template>
                      <template v-else>
                        <span class="dot" :class="getCountdownColor(getDaysRemaining(project.planFinalDate))"></span>
                        <span class="days" :class="getCountdownColor(getDaysRemaining(project.planFinalDate))">
                          {{ getCountdownText(getDaysRemaining(project.planFinalDate)) }}
                        </span>
                      </template>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredProjects.length === 0" class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" class="empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p class="empty-text">暂无数据</p>
          </div>
      </div>
    </div>
    </div><!-- /.table-breakout -->

    <!-- 第四层：底部分页器 — 对齐 A/B/C 区域宽度 -->
    <div class="control-wrapper" style="margin-top: 1px;">
      <div class="pagination-section" v-if="filteredProjects.length > 0">
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
            共 {{ filteredProjects.length }} 条
          </div>
        </div>
      </div>
    </div><!-- /.control-wrapper (pagination) -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import * as XLSX from 'xlsx';
import ColumnSelector from './ColumnSelector.vue';

const props = defineProps({
  projects: {
    type: Array,
    required: true
  },
  projectType: {
    type: String,
    default: '全部'
  },
  dateRange: {
    type: Object,
    default: () => ({ start: '', end: '' })
  }
});

const emit = defineEmits(['export', 'open-detail']);

const currentTab = ref('initial');
const searchQuery = ref('');
const statusFilter = ref('all');
const pageSize = ref(10);
const currentPage = ref(1);

// 程序内部字段（这些不是Excel原始列，需要从列选择器中排除）
const PROGRAM_FIELDS = [
  'id', 'projectCode', 'projectName', 'manager', 'department',
  'projectType', 'budget', 'planInitialDate', 'planFinalDate',
  'actualInitialDate', 'actualFinalDate', 'startDate', 'status'
];

// 默认展示的Excel列（对应目前显示的7个数据列，日期列另外固定显示）
const defaultColumnNames = [
  '项目编号', '项目名称', '项目经理', '业务部所',
  '项目类型', '立项收入(元)', '项目状态'
];

// 金额类列（值需要格式化为货币）
const amountColumnKeywords = ['收入', '成本', '金额', '费用', '预算', '支出', '分包费', '外包费', '分摊', '采购', '租赁'];

// 所有可选的Excel列名（从第一个项目中提取中文字段名）
const allColumnNames = ref([...defaultColumnNames]);

// 当前选中的可见列
const visibleColumns = ref([...defaultColumnNames]);

// 默认列宽（含日期列，两个Tab共用）
const DEFAULT_COL_WIDTHS = {
  '项目编号': 160,
  '项目名称': 300,
  '项目经理': 100,
  '业务部所': 120,
  '项目类型': 100,
  '立项收入(元)': 140,
  '项目状态': 180,
  '计划初验时间': 140,
  '实际初验时间': 140,
  '计划终验时间': 140,
  '实际终验时间': 140,
  '验收倒计时': 140,
};

// 列宽调整状态
const columnWidths = ref({ ...DEFAULT_COL_WIDTHS });
const resizing = ref(null);

// 所有表格列（可见列 + 两个日期列 + 倒计时列）
const allColumns = computed(() => [
  ...visibleColumns.value,
  `计划${currentTab.value === 'initial' ? '初验' : '终验'}时间`,
  `实际${currentTab.value === 'initial' ? '初验' : '终验'}时间`,
  '验收倒计时',
]);

const startResize = (event, column) => {
  const th = event.target.closest('th');
  const currentWidth = th ? th.offsetWidth : 150;
  resizing.value = { column, startX: event.clientX, startWidth: currentWidth };
};

const onResizeMove = (event) => {
  if (!resizing.value) return;
  const delta = event.clientX - resizing.value.startX;
  const newWidth = Math.max(60, resizing.value.startWidth + delta);
  columnWidths.value = { ...columnWidths.value, [resizing.value.column]: newWidth };
};

const stopResize = () => {
  resizing.value = null;
};

watch(resizing, (val) => {
  if (val) {
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', stopResize);
  } else {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', stopResize);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', stopResize);
});

// 列变化时给新列补默认宽度，避免 table-layout:fixed 下宽度为 0
watch(allColumns, (newCols) => {
  const widths = { ...columnWidths.value };
  let changed = false;
  newCols.forEach(col => {
    if (!(col in widths)) {
      widths[col] = 120; // 新列默认 120px
      changed = true;
    }
  });
  if (changed) {
    columnWidths.value = widths;
  }
});

// 当项目数据变化时，取所有项目键的并集作为可选列
watch(() => props.projects, (newProjects) => {
  if (newProjects && newProjects.length > 0) {
    const keySet = new Set();
    newProjects.forEach(project => {
      Object.keys(project).forEach(key => {
        if (!PROGRAM_FIELDS.includes(key)) {
          keySet.add(key);
        }
      });
    });
    const excelColumns = [...keySet];
    allColumnNames.value = excelColumns;

    // 清理已被移除的选中列
    visibleColumns.value = visibleColumns.value.filter(
      col => allColumnNames.value.includes(col)
    );
  }
}, { immediate: true });

// 列名 → 程序字段回退映射（自筹项目Excel无"项目经理"/"业务部所"列名，需回退到manager/department）
const COLUMN_TO_FIELD = {
  '项目经理': 'manager',
  '业务部所': 'department',
};

// 获取列的值（优先使用Excel原始列名，若无则回退到程序字段）
const getColumnValue = (project, colName) => {
  if (project[colName] !== undefined) return project[colName];
  const field = COLUMN_TO_FIELD[colName];
  return field ? (project[field] || '') : '';
};

// 判断是否为金额列
const isAmountColumn = (colName) => {
  return amountColumnKeywords.some(keyword => colName.includes(keyword));
};

// 判断日期是否在选定时间范围内
const isDateInRange = (dateStr) => {
  if (!dateStr) return false;
  const hasRange = props.dateRange?.start && props.dateRange?.end;
  if (!hasRange) return false;
  const d = new Date(dateStr);
  return d >= new Date(props.dateRange.start) && d <= new Date(props.dateRange.end);
};

const filteredProjects = computed(() => {
  let filtered = props.projects;

  // 按项目类型过滤
  if (props.projectType !== '全部') {
    filtered = filtered.filter(project =>
      project.projectType === props.projectType
    );
  }

  // 按Tab + 时间范围过滤
  filtered = filtered.filter(project => {
    const planDate = currentTab.value === 'initial'
      ? project.planInitialDate
      : project.planFinalDate;
    return isDateInRange(planDate);
  });

  // 按状态过滤：基于实际日期是否为空
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(project => {
      const actualDate = currentTab.value === 'initial'
        ? project.actualInitialDate
        : project.actualFinalDate;

      if (statusFilter.value === 'accepted') {
        return !!actualDate;
      } else if (statusFilter.value === 'pending') {
        return !actualDate;
      }
      return true;
    });
  }

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(project =>
      project.projectName.toLowerCase().includes(query) ||
      project.manager.toLowerCase().includes(query) ||
      (project['项目编号'] || '').toLowerCase().includes(query)
    );
  }

  return filtered;
});

const totalPages = computed(() => {
  return Math.ceil(filteredProjects.value.length / pageSize.value);
});

const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredProjects.value.slice(start, end);
});

const getPlanDate = (project) => {
  return currentTab.value === 'initial' ? project.planInitialDate : project.planFinalDate;
};

const getActualDate = (project) => {
  return currentTab.value === 'initial' ? project.actualInitialDate || '-' : project.actualFinalDate || '-';
};

const parseLocalDate = (dateStr) => {
  const parts = dateStr.split('-');
  return new Date(+parts[0], parts[1] - 1, +parts[2]);
};

// 验收倒计时计算
const getDaysRemaining = (planDate) => {
  if (!planDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plan = parseLocalDate(planDate);
  return Math.ceil((plan - today) / (1000 * 60 * 60 * 24));
};

const getCountdownColor = (days) => {
  if (days === null) return '';
  if (days <= 7) return 'red';
  if (days <= 30) return 'yellow';
  return 'green';
};

const getCountdownText = (days) => {
  if (days === null) return '—';
  if (days < 0) return `超期${Math.abs(days)}天`;
  if (days === 0) return '今天';
  return `${days}天`;
};

const getCountdownExport = (planDate, actualDate) => {
  if (actualDate) return '已验收';
  if (!planDate) return '—';
  const days = getDaysRemaining(planDate);
  return getCountdownText(days);
};

const getTrafficLight = (project) => {
  const planDate = currentTab.value === 'initial'
    ? project.planInitialDate : project.planFinalDate;
  const actualDate = currentTab.value === 'initial'
    ? project.actualInitialDate : project.actualFinalDate;

  if (!planDate) return null;
  if (actualDate) return { label: '已完成', cssClass: 'traffic-completed' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plan = parseLocalDate(planDate);
  const threeMonthsBefore = new Date(plan);
  threeMonthsBefore.setMonth(threeMonthsBefore.getMonth() - 3);

  if (today >= plan) return { label: '已滞后', cssClass: 'traffic-delayed' };
  if (today >= threeMonthsBefore) return { label: '预警', cssClass: 'traffic-pending' };
  return { label: '低风险', cssClass: 'traffic-completed' };
};

const setTab = (tab) => {
  currentTab.value = tab;
  currentPage.value = 1;
};

const setStatusFilter = (status) => {
  statusFilter.value = status;
  currentPage.value = 1;
};

const handleSearch = () => {
  currentPage.value = 1;
};

const handlePageSizeChange = () => {
  currentPage.value = 1;
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case '已结算':
      return 'status-completed';
    case '待初验':
    case '待终验':
    case '待结算':
      return 'status-pending';
    default:
      return '';
  }
};

const formatCurrency = (value) => {
  if (value === 0) return '0';
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const exportToExcel = () => {
  if (!filteredProjects.value.length) return;

  // 构建导出数据：选中列 + 两个日期列 + 倒计时列
  const tabLabel = currentTab.value === 'initial' ? '初验' : '终验';
  const exportColumns = [
    ...visibleColumns.value,
    `计划${tabLabel}时间`,
    `实际${tabLabel}时间`,
    '初验倒计时',
    '终验倒计时'
  ];

  const exportRows = filteredProjects.value.map(project => {
    const row = {};
    // 选中列
    visibleColumns.value.forEach(col => {
      const val = getColumnValue(project, col);
      // 金额列导出为数字
      if (isAmountColumn(col)) {
        row[col] = parseFloat(val) || 0;
      } else {
        row[col] = val;
      }
    });
    // 日期列
    row[`计划${tabLabel}时间`] = getPlanDate(project);
    row[`实际${tabLabel}时间`] = getActualDate(project);
    // 倒计时列（基于导出当天计算）
    row['初验倒计时'] = getCountdownExport(project.planInitialDate, project.actualInitialDate);
    row['终验倒计时'] = getCountdownExport(project.planFinalDate, project.actualFinalDate);
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(exportRows, { header: exportColumns });
  // 设置金额列格式
  exportColumns.forEach((col, idx) => {
    if (isAmountColumn(col)) {
      const colLetter = XLSX.utils.encode_col(idx);
      // 为每行设置数字格式
      for (let r = 1; r <= exportRows.length; r++) {
        const cellRef = colLetter + (r + 1);
        if (ws[cellRef]) {
          ws[cellRef].z = '#,##0.00';
        }
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '项目明细');
  XLSX.writeFile(wb, `项目明细_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const openProjectDetail = (projectId) => {
  emit('open-detail', projectId);
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

/* 验收倒计时列 */
.countdown-cell {
  min-width: 130px;
  padding: 6px 10px;
}
.countdown {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.countdown-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  white-space: nowrap;
}
.countdown-row .phase {
  color: #6b7280;
  min-width: 28px;
}
.countdown-row .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.countdown-row .dot.red { background: #ef4444; }
.countdown-row .dot.yellow { background: #f59e0b; }
.countdown-row .dot.green { background: #22c55e; }
.countdown-row .dot.gray { background: #9ca3af; }
.countdown-row .days {
  font-weight: 600;
}
.countdown-row .days.red { color: #ef4444; }
.countdown-row .days.yellow { color: #d97706; }
.countdown-row .days.green { color: #16a34a; }
.countdown-row .done {
  color: #9ca3af;
  font-size: 12px;
}
.countdown-row .na {
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
  gap: 1rem;
  flex: 1;
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
  padding: 0 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn:hover {
  background-color: #f9fafb;
}

.status-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

/* 搜索框 */
.search-box {
  position: relative;
  width: 300px;
}

.search-box input {
  width: 100%;
  height: 2.25rem;
  padding: 0 1rem 0 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  width: 1.25rem;
  height: 1.25rem;
}

/* 导出按钮 */
.export-btn {
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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

.table {
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0 auto;
}

.table th {
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

.resize-handle {
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

.resize-handle:hover {
  background-color: #3b82f6;
}

.table.is-resizing {
  user-select: none;
  cursor: col-resize;
}

.table td {
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
.table td.col-project-code {
  white-space: normal;
  word-break: break-word;
  max-width: 160px;
  overflow: visible;
  text-overflow: clip;
}

/* 项目名称列：允许换行，不截断 */
.table td.col-project-name {
  white-space: normal;
  word-break: break-word;
  max-width: 320px;
  overflow: visible;
  text-overflow: clip;
}

.table tr:last-child td {
  border-bottom: none;
}

/* 项目名称链接 */
.project-name {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.project-name:hover {
  text-decoration: underline;
}

/* 金额对齐 */
.amount-header {
  text-align: right;
}

.amount {
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-completed {
  background-color: #d1fae5;
  color: #065f46;
}

.status-pending {
  background-color: #fef3c7;
  color: #92400e;
}

/* 验收红绿灯标签 */
.traffic-status-group {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.traffic-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.traffic-completed {
  background-color: #d1fae5;
  color: #065f46;
}

.traffic-pending {
  background-color: #fed7aa;
  color: #9a3412;
}

.traffic-delayed {
  background-color: #fee2e2;
  color: #991b1b;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  width: 32px;
  height: 32px;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.empty-text {
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

  .search-box {
    width: 100%;
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