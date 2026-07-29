import { ref, computed } from 'vue';
import { calculateKpiData } from '../data/projectData';
import { ProjectType } from '../constants/projectStatus';

export const createDefaultFilters = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return {
    dateRange: { start: formatDate(start), end: formatDate(end), type: 'month' },
    projectType: ProjectType.ALL
  };
};

/**
 * 项目数据管理组合式函数
 * 封装项目数据的过滤、计算和状态管理逻辑
 */
export const useProjectData = () => {
  // 过滤条件
  const filters = ref(createDefaultFilters());

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
   * 应用过滤条件获取项目列表（仅按项目类型过滤，日期范围只影响KPI）
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
