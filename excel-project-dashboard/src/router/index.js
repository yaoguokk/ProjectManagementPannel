/**
 * 路由表（方案 B：vue-router + hash 模式）
 *
 * 为什么 hash 模式：产物是单文件 HTML（vite-plugin-singlefile），用户常双击 file:// 打开，
 * history 模式在 file:// 下刷新/直达会 404；hash 模式（#/cost）无此问题。
 *
 * 视图划分（基于现有 sections 容器组件零侵入复用）：
 *   /overview  概览：数据导入（A）+ 筛选（B）+ KPI（C）
 *   /projects  项目明细：筛选 + D 区域表格
 *   /cost      成本管控：筛选 + E 区域（超支分布图 + 明细表）
 * 筛选条件（项目类型 / 时间范围）同步到 URL query，可分享、可刷新保持。
 */
import { createRouter, createWebHashHistory } from 'vue-router';
import OverviewView from '../views/OverviewView.vue';
import ProjectsView from '../views/ProjectsView.vue';
import CostView from '../views/CostView.vue';

/** 页面标题：导航与面包屑共用（route.name → 中文标题） */
export const ROUTE_TITLES = {
  overview: '项目验收完成率概览',
  projects: '项目明细',
  cost: '成本管控',
};

/**
 * 导航与路由的唯一来源：新增一个页面只在这里加一条，
 * 顶部导航、路由表、面包屑自动跟进（保持三者不漂移）。
 *
 * 「数据导入」不单独占一项：A 区域已并入概览页（见 views/OverviewView.vue）。
 */
export const NAV_ITEMS = [
  { name: 'overview', path: '/overview', component: OverviewView },
  { name: 'projects', path: '/projects', component: ProjectsView },
  { name: 'cost', path: '/cost', component: CostView },
];

const routes = [
  { path: '/', redirect: '/overview' },
  ...NAV_ITEMS.map((item) => ({
    path: item.path,
    name: item.name,
    component: item.component,
    meta: { title: ROUTE_TITLES[item.name] },
  })),
  // 未匹配路径（含历史书签 /data）回到概览
  { path: '/:pathMatch(.*)*', redirect: '/overview' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
