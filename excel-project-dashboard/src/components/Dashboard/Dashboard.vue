<template>
  <!-- 顶部导航栏 -->
  <Breadcrumbs />

  <!-- 主容器区域 -->
  <div class="main-container">
    <!-- 区域 A：数据导入 -->
    <div class="upload-section">
      <div class="section-header">
        <span class="section-badge badge-a">A</span>
        <span class="section-title">数据导入</span>
      </div>
      <div class="upload-grid">
        <div class="upload-col">
          <UploadArea
            accept-type="business"
            title="经营项目台账上传"
            description=”请上传文件名含【经营项目台账明细列表】的Excel文件”
            @file-uploaded="handleFileUploaded"
            @file-error="handleFileError"
          />
        </div>
        <div class="upload-col">
          <UploadArea
            accept-type="self-funded"
            title="自筹项目台账上传"
            description="请上传文件名含【自筹项目台账列表】的Excel文件"
            @file-uploaded="handleFileUploaded"
            @file-error="handleFileError"
          />
        </div>
      </div>
    </div>

    <!-- 区域 B：数据筛选 -->
    <div class="filter-bar">
      <div class="section-header">
        <span class="section-badge badge-b">B</span>
        <span class="section-title">数据筛选</span>
      </div>
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

    <!-- 区域 C：KPI 概览 -->
    <div class="kpi-section">
      <div class="section-header">
        <span class="section-badge badge-c">C</span>
        <span class="section-title">KPI 概览</span>
      </div>
      <KpiCards :kpiData="kpiData" />
    </div>

    <!-- 区域 D：项目明细 -->
    <div class="project-detail-section">
      <div class="section-header">
        <span class="section-badge badge-d">D</span>
        <span class="section-title">项目明细</span>
      </div>
      <ProjectTable
        :projects="filteredProjects"
        :projectType="filters.projectType"
        :dateRange="filters.dateRange"
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
import { ref, computed, watch } from 'vue';
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

const { filters, kpiData, projects, updateFilters, applyFilters } = useProjectData();
const { toast, showSuccess, showError, showToast } = useToast();

const isLoading = ref(false);
const businessProjects = ref([]);
const selfFundedProjects = ref([]);

// 拼接项目列表：自筹在前，经营在后
const allProjects = computed(() => [
  ...selfFundedProjects.value,
  ...businessProjects.value
]);

// 同步合并后的数据到 useProjectData，触发 KPI 和筛选更新
watch(allProjects, (merged) => {
  projects.value = merged;
}, { immediate: true });

// 计算过滤后的项目列表
const filteredProjects = computed(() => {
  return applyFilters();
});

// 处理查询
const handleQuery = () => {
  showSuccess('查询成功');
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
    const newProjects = fileData.data;
    const acceptType = fileData.acceptType;

    if (acceptType === 'business') {
      businessProjects.value = newProjects;
    } else if (acceptType === 'self-funded') {
      selfFundedProjects.value = newProjects;
    }

    const countInfo = businessProjects.value.length > 0 && selfFundedProjects.value.length > 0
      ? `经营${businessProjects.value.length}个 + 自筹${selfFundedProjects.value.length}个`
      : `${newProjects.length} 个`;

    showSuccess(`成功导入 ${countInfo} 项目（${fileData.fileName}）`);
  } catch (error) {
    showError('导入数据失败：' + error.message);
  }
};

// 处理文件上传错误
const handleFileError = (error) => {
  showError(error.message);
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

/* === 区域标题（A / B / C / D） === */
.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.section-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.badge-a { background-color: #3b82f6; }
.badge-b { background-color: #8b5cf6; }
.badge-c { background-color: #10b981; }
.badge-d { background-color: #f59e0b; }

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

/* === 区域 A：数据筛选 === */
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

/* === 区域 A：数据导入 === */
.upload-section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  margin-bottom: 1.5rem;
  padding: 1.5rem;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.upload-col {
  min-width: 0;
}

/* === 区域 C：KPI 概览 === */
.kpi-section {
  margin-bottom: 1.5rem;
}

/* === 区域 D：项目明细 === */
.project-detail-section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
</style>