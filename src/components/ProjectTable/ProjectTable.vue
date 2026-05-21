<template>
  <div class="project-table">
    <div class="table-header">
      <div class="tabs">
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

      <div class="toolbar">
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

        <button
          @click="exportToExcel"
          class="export-btn"
          :disabled="!filteredProjects.length"
        >
          导出Excel
        </button>
      </div>
    </div>

    <div class="status-filters">
      <button
        @click="setStatusFilter('all')"
        class="status-btn"
        :class="{ 'active': statusFilter === 'all' }"
      >
        全部
      </button>
      <button
        @click="setStatusFilter('completed')"
        class="status-btn"
        :class="{ 'active': statusFilter === 'completed' }"
      >
        已按期完成
      </button>
      <button
        @click="setStatusFilter('incomplete')"
        class="status-btn"
        :class="{ 'active': statusFilter === 'incomplete' }"
      >
        未完成/延期
      </button>
    </div>

    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>项目编号</th>
            <th>项目名称</th>
            <th>项目经理</th>
            <th>所属部门</th>
            <th>项目类型</th>
            <th>立项收入</th>
            <th>计划{{ currentTab === 'initial' ? '初验' : '终验' }}时间</th>
            <th>实际{{ currentTab === 'initial' ? '初验' : '终验' }}时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in filteredProjects" :key="project.id">
            <td>{{ project.projectCode }}</td>
            <td>
              <a
                href="#"
                class="project-name"
                @click.prevent="openProjectDetail(project.id)"
              >
                {{ project.projectName }}
              </a>
            </td>
            <td>{{ project.manager }}</td>
            <td>{{ project.department }}</td>
            <td>{{ project.projectType }}</td>
            <td class="amount">{{ formatCurrency(project.budget) }}</td>
            <td>{{ project.planDate }}</td>
            <td>{{ project.actualDate || '-' }}</td>
            <td>
              <span
                class="status-tag"
                :class="getStatusClass(project.status)"
              >
                {{ project.status }}
              </span>
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

    <div class="pagination" v-if="filteredProjects.length > 0">
      <div class="pagination-info">
        共 {{ filteredProjects.length }} 条
      </div>

      <div class="pagination-controls">
        <select
          v-model="pageSize"
          class="page-size-select"
          @change="handlePageSizeChange"
        >
          <option value="10">10条/页</option>
          <option value="20">20条/页</option>
          <option value="50">50条/页</option>
        </select>

        <div class="page-nav">
          <button
            @click="prevPage"
            :disabled="currentPage === 1"
            class="nav-btn"
          >
            &lt;
          </button>

          <span class="page-info">
            第 {{ currentPage }} 页
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  projects: {
    type: Array,
    required: true
  },
  projectType: {
    type: String,
    default: 'all'
  }
});

const emit = defineEmits(['export', 'open-detail']);

const currentTab = ref('initial');
const searchQuery = ref('');
const statusFilter = ref('all');
const pageSize = ref(10);
const currentPage = ref(1);

const filteredProjects = computed(() => {
  let filtered = props.projects;

  // 按项目类型过滤
  if (props.projectType !== 'all') {
    filtered = filtered.filter(project =>
      project.projectType === (props.projectType === 'business' ? '经营项目' : '自筹项目')
    );
  }

  // 按Tab过滤
  filtered = filtered.filter(project => {
    if (currentTab.value === 'initial') {
      return project.planInitialDate && project.actualInitialDate;
    } else {
      return project.planFinalDate && project.actualFinalDate;
    }
  });

  // 按状态过滤
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(project => {
      const isCompleted = project.status === '已完成';
      const isIncomplete = project.status === '未完成';
      const isDelayed = project.status === '已延期';

      if (statusFilter.value === 'completed') {
        return isCompleted;
      } else if (statusFilter.value === 'incomplete') {
        return isIncomplete || isDelayed;
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
    case '已完成':
      return 'status-completed';
    case '未完成':
      return 'status-incomplete';
    case '已延期':
      return 'status-delayed';
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
.project-table {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background-color: #f3f4f6;
}

.tab-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-box {
  position: relative;
  width: 300px;
}

.search-box input {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  width: 1.25rem;
  height: 1.25rem;
}

.export-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background-color: #f3f4f6;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.status-btn:hover {
  background-color: #f3f4f6;
}

.status-btn.active {
  background-color: #3b82f6;
  color: white;
  border-color: #3b82f6;
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
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  border-bottom: 2px solid #e5e7eb;
}

.table td {
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.table tr:last-child td {
  border-bottom: none;
}

.project-name {
  color: #3b82f6;
  text-decoration: none;
}

.project-name:hover {
  text-decoration: underline;
}

.amount {
  text-align: right;
}

.status-tag {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-completed {
  background-color: #10b981;
  color: white;
}

.status-incomplete {
  background-color: #f59e0b;
  color: white;
}

.status-delayed {
  background-color: #ef4444;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 3rem;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.empty-text {
  color: #6b7280;
  font-size: 0.875rem;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.pagination-info {
  font-size: 0.875rem;
  color: #6b7280;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-size-select {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.page-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nav-btn {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.25rem;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background-color: #f3f4f6;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 0.875rem;
  color: #6b7280;
  padding: 0 0.5rem;
}
</style>
