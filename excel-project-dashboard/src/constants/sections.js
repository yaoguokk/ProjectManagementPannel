/**
 * 区域注册表
 *
 * Dashboard 只做 `v-for + <component :is>` 渲染，不再硬编码任何区域的标题、颜色与顺序。
 * 新增一个区域（F/G…）的完整步骤：
 *   1. 在 src/components/sections/ 下新建容器组件（内部自行从 store 取数）；
 *   2. 在本文件登记一条配置（id / badge / title / tone / order / component）；
 * 不需要改动 Dashboard.vue、App.vue 或任何既有区域。
 *
 * tone 取值见 components/common/SectionHeader.vue 的 TONE_COLORS。
 */
import UploadSection from '../components/sections/UploadSection.vue';
import FilterSection from '../components/sections/FilterSection.vue';
import KpiSection from '../components/sections/KpiSection.vue';
import ProjectDetailSection from '../components/sections/ProjectDetailSection.vue';
import CostSection from '../components/sections/CostSection.vue';

const REGISTERED_SECTIONS = [
  {
    id: 'upload',
    badge: 'A',
    title: '数据导入',
    tone: 'blue',
    order: 1,
    component: UploadSection,
  },
  {
    id: 'filter',
    badge: 'B',
    title: '数据筛选',
    tone: 'violet',
    order: 2,
    component: FilterSection,
  },
  {
    id: 'kpi',
    badge: 'C',
    title: 'KPI 概览',
    tone: 'emerald',
    order: 3,
    component: KpiSection,
  },
  {
    id: 'project-detail',
    badge: 'D',
    title: '项目明细',
    tone: 'amber',
    order: 4,
    component: ProjectDetailSection,
  },
  {
    id: 'cost',
    badge: 'E',
    title: '成本管控',
    tone: 'red',
    order: 5,
    component: CostSection,
  },
];

/** 按 order 升序渲染的区域列表 */
export const SECTIONS = [...REGISTERED_SECTIONS].sort((a, b) => a.order - b.order);

/**
 * 按 id 取单个区域配置（视图层按需复用某个区域的徽章 / 标题 / 配色）。
 * 例：概览视图复用 E 区域的徽章与配色来承载超支分布图，避免再复制一份标题文案。
 */
export const getSection = (id) => SECTIONS.find((section) => section.id === id);
