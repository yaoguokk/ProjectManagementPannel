/**
 * 布局层：筛选条件在页面间保持不丢
 *
 * 回归背景：筛选条件以 URL query 为唯一来源（useFilterQuerySync），而顶部导航最初用
 * `{ name: item.name }` 生成跳转目标 → 切页时 query 被清空 → 自定义时间范围被重置成默认。
 * 现在导航统一走 `navLocation(item, route.query)`。
 */
import { mount, flushPromises } from '@vue/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { RouterLink } from 'vue-router';

// 视图组件与本用例无关，mock 掉避免拉起 echarts 等重依赖
vi.mock('../src/views/OverviewView.vue', () => ({ default: { name: 'OverviewView', template: '<div />' } }));
vi.mock('../src/views/ProjectsView.vue', () => ({ default: { name: 'ProjectsView', template: '<div />' } }));
vi.mock('../src/views/CostView.vue', () => ({ default: { name: 'CostView', template: '<div />' } }));

import App from '../src/App.vue';
import router from '../src/router/index.js';
import { useDataStore } from '../src/stores/dataStore';

const CUSTOM_FILTERS = { start: '2026-02-01', end: '2026-05-31', type: 'custom' };
const CUSTOM_QUERY = { start: '2026-02-01', end: '2026-05-31', range: 'custom' };

const mountApp = async (fullPath) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  await router.push(fullPath);
  await router.isReady();

  const wrapper = mount(App, {
    global: { plugins: [pinia, router], stubs: { Toast: true } },
  });
  await flushPromises();
  return wrapper;
};

const navLink = (wrapper, label) =>
  wrapper.findAllComponents(RouterLink).find((link) => link.text().includes(label));

describe('布局层导航与筛选条件', () => {
  test('从 URL 恢复筛选条件（可分享、可刷新保持）', async () => {
    await mountApp('/overview?start=2026-02-01&end=2026-05-31&range=custom');

    expect(useDataStore().filters.dateRange).toEqual(CUSTOM_FILTERS);
  });

  test('切换页面时保留筛选条件，不回到默认', async () => {
    const wrapper = await mountApp('/overview?start=2026-02-01&end=2026-05-31&range=custom');
    await navLink(wrapper, '项目明细').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/projects');
    expect(router.currentRoute.value.query).toEqual(CUSTOM_QUERY);
    expect(useDataStore().filters.dateRange).toEqual(CUSTOM_FILTERS);
  });

  test('多次切页后筛选条件仍然保留', async () => {
    const wrapper = await mountApp('/overview?start=2026-02-01&end=2026-05-31&range=custom');

    await navLink(wrapper, '项目明细').trigger('click');
    await flushPromises();
    await navLink(wrapper, '成本管控').trigger('click');
    await flushPromises();
    await navLink(wrapper, '概览').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/overview');
    expect(router.currentRoute.value.query).toEqual(CUSTOM_QUERY);
    expect(useDataStore().filters.dateRange).toEqual(CUSTOM_FILTERS);
  });

  test('默认筛选不出现在 URL 上（默认状态 URL 保持干净）', async () => {
    const wrapper = await mountApp('/overview');
    await navLink(wrapper, '成本管控').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/cost');
    expect(router.currentRoute.value.query).toEqual({});
  });
});
