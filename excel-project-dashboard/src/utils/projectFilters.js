/**
 * 全局筛选条件的默认值（纯函数，便于单测）
 *
 * 从 useProjectData 抽出后供 store 与组件共享：
 * store 需要它做初始值/重置，组件需要它做「重置筛选」，若放在 composable 里会与 store 形成循环依赖。
 */
import { ProjectType } from '../constants/projectStatus';

/** 默认时间范围：年初 ~ 本月末；默认项目类型：全部 */
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
    projectType: ProjectType.ALL,
  };
};
