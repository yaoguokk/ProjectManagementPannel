import { ref, computed } from 'vue';
import { calculateKpiData } from '@/data/projectData';
import { ProjectType } from '@/constants/projectStatus';

/**
 * 项目数据处理组合式函数
 * @returns {Object} 项目数据和计算函数
 */
export const useProjectData = () => {
  const filters = ref({
    dateRange: {
      start: '',
      end: '',
      type: 'month'
    },
    projectType: ProjectType.BUSINESS
  });

  const projects = ref([]);

  // 计算KPI数据
  const kpiData = computed(() => {
    return calculateKpiData(projects.value, filters.value);
  });

  // 更新过滤器
  const updateFilters = (newFilters) => {
    filters.value = { ...filters.value, ...newFilters };
  };

  // 重置过滤器
  const resetFilters = () => {
    filters.value = {
      dateRange: {
        start: '',
        end: '',
        type: 'month'
      },
      projectType: ProjectType.BUSINESS
    };
  };

  // 应用过滤器
  const applyFilters = () => {
    // 实现过滤逻辑
    return projects.value.filter(project => {
      // 按项目类型过滤
      if (filters.value.projectType !== ProjectType.BUSINESS && 
          filters.value.projectType !== ProjectType.SELF_FINANCED) {
        return true;
      }
      
      if (project.projectType !== filters.value.projectType) {
        return false;
      }
      
      // 按日期范围过滤
      if (filters.value.dateRange && filters.value.dateRange.start && filters.value.dateRange.end) {
        const projectDate = new Date(project.planInitialDate);
        const startDate = new Date(filters.value.dateRange.start);
        const endDate = new Date(filters.value.dateRange.end);
        
        return projectDate >= startDate && projectDate <= endDate;
      }
      
      return true;
    });
  };

  return {
    filters,
    projects,
    kpiData,
    updateFilters,
    resetFilters,
    applyFilters
  };
};
