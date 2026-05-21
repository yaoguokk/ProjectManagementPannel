import { ref, computed } from 'vue';
import { calculateKpiData } from '../data/projectData';
import { ProjectType } from '../constants/projectStatus';

/**
 * 项目数据管理组合式函数
 * 封装项目数据的过滤、计算和状态管理逻辑
 */
export const useProjectData = () => {
  // 过滤条件
  const filters = ref({
    dateRange: { start: '', end: '', type: 'month' },
    projectType: ProjectType.BUSINESS
  });

  // 项目数据
  const projects = ref([]);

  // KPI数据计算
  const kpiData = computed(() => {
    return calculateKpiData(projects.value, filters.value);
  });

  /**
   * 更新过滤条件
   * @param {Object} newFilters - 新的过滤条件
   */
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters };
  };

  /**
   * 应用过滤条件获取项目列表
   * @returns {Array} 过滤后的项目列表
   */
  const applyFilters = () => {
    let filtered = projects.value;

    // 按项目类型过滤
    if (filters.value.projectType !== ProjectType.ALL) {
      filtered = filtered.filter(project =>
        project.projectType === filters.value.projectType
      );
    }

    // 按时间范围过滤
    if (filters.value.dateRange && filters.value.dateRange.start && filters.value.dateRange.end) {
      const startDate = new Date(filters.value.dateRange.start);
      const endDate = new Date(filters.value.dateRange.end);

      filtered = filtered.filter(project => {
        const planInitialDate = new Date(project.planInitialDate);
        const planFinalDate = new Date(project.planFinalDate);

        return (planInitialDate >= startDate && planInitialDate <= endDate) ||
               (planFinalDate >= startDate && planFinalDate <= endDate);
      });
    }

    return filtered;
  };

  return {
    filters,
    kpiData,
    projects,
    updateFilters,
    applyFilters
  };
};