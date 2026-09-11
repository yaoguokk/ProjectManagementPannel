import { describe, expect, test } from 'vitest';
import { SECTIONS, getSection } from '../src/constants/sections';
import { SECTION_TONES } from '../src/constants/sectionTones';

describe('区域注册表', () => {
  test('按 order 升序渲染，id 唯一', () => {
    expect(SECTIONS.map((section) => section.id)).toEqual([
      'upload',
      'filter',
      'kpi',
      'project-detail',
      'cost',
    ]);

    const orders = SECTIONS.map((section) => section.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));

    expect(new Set(SECTIONS.map((section) => section.id)).size).toBe(SECTIONS.length);
  });

  test('每个区域都具备渲染所需字段（组件 / 徽章 / 标题 / 配色）', () => {
    SECTIONS.forEach((section) => {
      expect(section.component).toBeTruthy();
      expect(section.badge).toMatch(/^[A-Z]$/);
      expect(section.title.length).toBeGreaterThan(0);
      expect(Object.keys(SECTION_TONES)).toContain(section.tone);
    });
  });

  test('区域数据由注册表驱动：新增区域只需登记一条配置', () => {
    // 断言 Dashboard 依赖的「渲染契约」稳定
    SECTIONS.forEach((section) => {
      expect(section).toHaveProperty('id');
      expect(section).toHaveProperty('order');
      expect(section).toHaveProperty('component');
    });
  });

  test('getSection 按 id 取回配置（视图层复用区域元数据），未知 id 返回 undefined', () => {
    expect(getSection('filter').title).toBe('数据筛选');
    expect(getSection('cost').badge).toBe('E');
    expect(getSection('not-exist')).toBeUndefined();
  });
});
