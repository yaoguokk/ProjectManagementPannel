<template>
  <div class="project-detail-container">
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

    <!-- 第三层：数据表格 -->
    <div class="table-section">
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th
                v-for="col in visibleColumns"
                :key="col"
                :class="{ 'amount-header': isAmountColumn(col) }"
              >
                {{ col }}
              </th>
              <th>计划{{ currentTab === 'initial' ? '初验' : '终验' }}时间</th>
              <th>实际{{ currentTab === 'initial' ? '初验' : '终验' }}时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="project in paginatedProjects" :key="project.id">
              <td
                v-for="col in visibleColumns"
                :key="col"
                :class="{ 'amount': isAmountColumn(col) }"
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
                  <span
                    class="status-tag"
                    :class="getStatusClass(project['项目状态'] || project.status)"
                  >
                    {{ project['项目状态'] || project.status }}
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

    <!-- 第四层：底部分页器 -->
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
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
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

// 当项目数据变化时，更新可选列列表
watch(() => props.projects, (newProjects) => {
  if (newProjects && newProjects.length > 0) {
    const firstProject = newProjects[0];
    const excelColumns = Object.keys(firstProject).filter(
      key => !PROGRAM_FIELDS.includes(key)
    );
    // 保持用户已选列不变，但更新总列列表
    allColumnNames.value = excelColumns;
  }
}, { immediate: true });

// 获取列的值（优先使用Excel原始列名）
const getColumnValue = (project, colName) => {
  return project[colName] !== undefined ? project[colName] : '';
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
      project.manager.toLowerCase().includes(query)
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
  if (value === 0) return '¥ 0';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const exportToExcel = () => {
  emit('export', filteredProjects.value);
};

const openProjectDetail = (projectId) => {
  emit('open-detail', projectId);
};
</script>

<style scoped>
/* 项目明细容器 - 白色卡片 */
.project-detail-container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

/* 第一层：主Tab切换 - 左对齐 */
.main-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  padding: 0.5rem 1.5rem;
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
  padding: 0.375rem 0.875rem;
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
  padding: 0.5rem 1rem 0.5rem 2.5rem;
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
  padding: 0.5rem 1.25rem;
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
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
}

.table td {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
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
  padding: 0.5rem 0.75rem;
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
  width: 2rem;
  height: 2rem;
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