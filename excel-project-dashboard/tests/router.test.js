/**
 * 路由表测试
 *
 * 锁住「导航 / 路由 / 标题三者同源」这一不变量：新增页面只改 NAV_ITEMS，
 * 顶部导航、路由注册、面包屑标题自动保持一致。
 */
import { describe, expect, test } from 'vitest';
import router, { NAV_ITEMS, ROUTE_TITLES } from '../src/router/index.js';

describe('路由表', () => {
  test('3 个页面全部注册，路径唯一（数据导入并入概览，不再单独成页）', () => {
    const registeredPaths = router.getRoutes().map((record) => record.path);
    NAV_ITEMS.forEach((item) => {
      expect(registeredPaths).toContain(item.path);
    });

    expect(NAV_ITEMS.map((item) => item.path)).toEqual(['/overview', '/projects', '/cost']);
    expect(new Set(NAV_ITEMS.map((item) => item.path)).size).toBe(NAV_ITEMS.length);
    expect(registeredPaths).not.toContain('/data');
  });

  test('每个导航项都有组件与中文标题', () => {
    NAV_ITEMS.forEach((item) => {
      expect(item.component).toBeTruthy();
      expect(ROUTE_TITLES[item.name]).toBeTruthy();
      expect(router.resolve({ name: item.name }).path).toBe(item.path);
    });
  });

  test('路由 meta.title 与 ROUTE_TITLES 一致（面包屑数据源）', () => {
    NAV_ITEMS.forEach((item) => {
      const record = router.resolve({ name: item.name }).matched[0];
      expect(record.meta.title).toBe(ROUTE_TITLES[item.name]);
    });
  });

  test('根路径、历史 /data 书签与未匹配路径都回到概览', async () => {
    await router.push('/');
    expect(router.currentRoute.value.path).toBe('/overview');

    await router.push('/data');
    expect(router.currentRoute.value.path).toBe('/overview');

    await router.push('/not-exist-page');
    expect(router.currentRoute.value.path).toBe('/overview');
  });
});
