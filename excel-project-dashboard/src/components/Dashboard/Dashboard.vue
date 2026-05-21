<template>
  <!-- 顶部导航栏 -->
  <Breadcrumbs />

  <!-- 主容器区域 -->
  <div class="main-container">
    <!-- 区域 A：全局过滤器栏 -->
    <div class="filter-bar">
      <div class="filter-container">
        <div class="filter-item">
          <label class="filter-label">时间范围</label>
          <DateRangeFilter v-model:dateRange="filters.dateRange" />
        </div>
        <div class="filter-item">
          <label class="filter-label">项目类型</label>
          <ProjectTypeFilter v-model:projectType="filters.projectType" />
        </div>
        <div class="filter-item">
          <button
            class="query-btn"
            @click="handleQuery"
            :disabled="isLoading"
          >
            {{ isLoading ? '查询中...' : '查询' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 区域 B：上传区域 -->
    <div class="upload-section">
      <UploadArea
        @file-uploaded="handleFileUploaded"
        @file-error="handleFileError"
      />
    </div>

    <!-- 区域 C：KPI概览卡片区 -->
    <div class="kpi-section">
      <KpiCards :kpiData="kpiData" />
    </div>

    <!-- 区域 D：项目明细数据区 -->
    <div class="project-detail-section">
      <ProjectTable
        :projects="filteredProjects"
        :projectType="filters.projectType"
        @export="handleExport"
        @open-detail="handleOpenDetail"
      />
    </div>

    <!-- 空状态 -->
    <EmptyState
      v-if="!isLoading && filteredProjects.length === 0"
      title="暂无数据"
      description="当前筛选条件下没有找到项目数据"
      show-action
      action-text="重置筛选"
      @action="resetFilters"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useProjectData } from '../../composables/useProjectData';
import { useToast } from '../../composables/useToast';
import { ProjectType } from '../../constants/projectStatus';
import Breadcrumbs from '../common/Breadcrumbs.vue';
import DateRangeFilter from '../filters/DateRangeFilter.vue';
import ProjectTypeFilter from '../filters/ProjectTypeFilter.vue';
import KpiCards from '../KpiCards/KpiCards.vue';
import ProjectTable from '../ProjectTable/ProjectTable.vue';
import EmptyState from '../common/EmptyState.vue';
import UploadArea from '../UploadArea/UploadArea.vue';
import { generateMockProjects } from '../../data/projectData';

const { filters, kpiData, updateFilters, applyFilters } = useProjectData();
const { toast, showSuccess, showError, showToast } = useToast();

const isLoading = ref(false);
const projects = ref([]);

// 计算过滤后的项目列表
const filteredProjects = computed(() => {
  return applyFilters();
});

// 初始化数据
onMounted(() => {
  loadMockData();
});

// 加载模拟数据
const loadMockData = () => {
  try {
    projects.value = generateMockProjects();
    showSuccess('数据加载成功');
  } catch (error) {
    showError('数据加载失败：' + error.message);
  }
};

// 处理查询
const handleQuery = () => {
  isLoading.value = true;
  try {
    // 这里可以添加实际的数据查询逻辑
    showSuccess('查询成功');
  } catch (error) {
    showError('查询失败：' + error.message);
  } finally {
    isLoading.value = false;
  }
};

// 处理导出
const handleExport = (data) => {
  try {
    showSuccess('导出成功');
    console.log('导出数据:', data);
  } catch (error) {
    showError('导出失败：' + error.message);
  }
};

// 处理项目详情
const handleOpenDetail = (projectId) => {
  showToast(`正在打开项目 ${projectId} 详情`, 'info');
  console.log('打开项目详情:', projectId);
};

// 处理文件上传成功
const handleFileUploaded = (fileData) => {
  try {
    // 将上传的项目数据添加到现有数据中
    const newProjects = fileData.data;

    // 为新数据添加必要的字段，兼容现有格式
    const enhancedProjects = newProjects.map(project => ({
      ...project,
      // 确保有必要的日期字段用于表格显示
      planInitialDate: project.planInitialDate || project.startDate,
      actualInitialDate: project.actualInitialDate || '',
      planFinalDate: project.planFinalDate || '',
      actualFinalDate: project.actualFinalDate || '',
      // 确保有项目编号
      projectCode: project.projectCode || `PRJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    }));

    // 更新项目列表
    projects.value = [...projects.value, ...enhancedProjects];

    // 更新KPI数据
    updateKPIData(enhancedProjects);

    showToast(`成功导入 ${enhancedProjects.length} 个项目`, 'success');
    console.log('导入的项目数据:', enhancedProjects);
  } catch (error) {
    showError('导入数据失败：' + error.message);
  }
};

// 处理文件上传错误
const handleFileError = (error) => {
  showError(error.message);
};

// 更新KPI数据
const updateKPIData = (newProjects) => {
  // 计算新的KPI数据
  const allProjects = [...projects.value, ...newProjects];

  // 计算初验完成情况
  const initialCompletedProjects = allProjects.filter(p => p.status === '已完成' && p.actualInitialDate);
  const initialTargetAmount = allProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const initialCompletedAmount = initialCompletedProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

  // 计算终验完成情况（简化处理）
  const finalCompletedProjects = allProjects.filter(p => p.status === '已完成' && p.actualFinalDate);

  // 更新KPI数据
  kpiData.value = {
    completionRate: Math.round((initialCompletedProjects.length / allProjects.length) * 100) || 0,
    targetAmount: initialTargetAmount,
    completedAmount: initialCompletedAmount,
    totalProjects: allProjects.length
  };
};

// 重置筛选条件
const resetFilters = () => {
  updateFilters({
    dateRange: { start: '', end: '', type: 'month' },
    projectType: ProjectType.BUSINESS
  });
};
</script>

<style scoped>
/* 主容器 */
.main-container {
  padding: 0 1.5rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Filter Bar - 区域 A */
.filter-bar {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-container {
  display: flex;
  gap: 2rem;
  align-items: flex-end;
}

.filter-item {
  flex: 1;
}

.filter-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.query-btn {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.query-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.query-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

/* KPI Section - 区域 B */
.kpi-section {
  margin-bottom: 1.5rem;
}

/* Upload Section - 区域 B */
.upload-section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  margin-bottom: 1.5rem;
  padding: 1.5rem;
}

/* KPI Section - 区域 C */
.kpi-section {
  margin-bottom: 1.5rem;
}

/* Project Detail Section - 区域 D */
.project-detail-section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
</style>