/**
 * 项目数据访问的薄适配层
 *
 * 真实状态与派生计算已收敛到 Pinia 的 dataStore（单一数据源），
 * 这里只做「store → 组合式函数」的形态转换，保持既有调用签名不变，
 * 老代码（Dashboard / 测试）无需一次性改写即可平滑迁移。
 *
 * 新代码建议直接 `useDataStore()`（可配合 storeToRefs），
 * 需要组合式函数风格时再走这里。
 */
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/dataStore';

// 保持既有导出路径可用（原先定义在本文件，现抽到 utils 以避免与 store 循环依赖）
export { createDefaultFilters } from '../utils/projectFilters';

/**
 * 项目数据管理组合式函数
 * @returns {{ filters, kpiData, projects, updateFilters, applyFilters }}
 *   filters/projects/kpiData 均为只读引用（刷新请走 updateFilters / setDataset）
 */
export const useProjectData = () => {
  const store = useDataStore();
  const { filters, kpiData, projects } = storeToRefs(store);

  return {
    filters,
    kpiData,
    projects,
    updateFilters: store.updateFilters,
    applyFilters: store.applyFilters,
  };
};
