import { beforeEach, describe, expect, test } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDataStore } from '../src/stores/dataStore';
import { createDefaultContractRules } from '../src/constants/costCategory';

const DATE_RANGE = { start: '2026-01-01', end: '2026-12-31' };

const makeProject = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '信息技术部',
  projectType: '经营项目',
  '项目类型': '研究咨询类',
  planInitialDate: '2026-04-30',
  planFinalDate: '2026-06-30',
  actualInitialDate: '2026-04-20',
  actualFinalDate: '2026-06-20',
  '项目分包费(元)': '1000000',
  '软硬件采购（元）': '0',
  ...overrides,
});

describe('dataStore > 数据集与派生', () => {
  beforeEach(() => {
    // 每个用例一份全新的 pinia，避免模块级 store 在用例之间泄漏状态
    setActivePinia(createPinia());
  });

  test('项目列表按注册表合并顺序：自筹在前、经营在后', () => {
    const store = useDataStore();
    store.setDataset('business', [makeProject({ id: 'b1', projectCode: 'B' })]);
    store.setDataset('self-funded', [
      makeProject({ id: 's1', projectCode: 'S', projectType: '自筹项目' }),
    ]);

    expect(store.projects.map((project) => project.projectCode)).toEqual(['S', 'B']);
  });

  test('支出合同不进入项目列表，只作为成本模块的实际支出来源', () => {
    const store = useDataStore();
    store.setDataset('contract', [{ projectCode: 'PRJ-001', contractType: '项目分包', amount: 100 }]);

    expect(store.projects).toEqual([]);
    expect(store.contracts).toHaveLength(1);
    expect(store.getDataset('contract')).toHaveLength(1);
  });

  test('同一入口重复上传是替换而不是追加', () => {
    const store = useDataStore();
    store.setDataset('business', [makeProject({ id: 'b1' }), makeProject({ id: 'b2' })]);
    store.setDataset('business', [makeProject({ id: 'b3' })]);

    expect(store.projects.map((project) => project.id)).toEqual(['b3']);
  });

  test('未知数据集类型不会写入（注册表是唯一入口）', () => {
    const store = useDataStore();
    store.setDataset('unknown', [makeProject()]);

    expect(store.projects).toEqual([]);
    expect(store.datasets).toEqual({});
  });

  test('applyFilters 只按项目类型过滤（日期范围只影响 KPI）', () => {
    const store = useDataStore();
    store.setDataset('business', [makeProject({ id: 'b1', projectType: '经营项目' })]);
    store.setDataset('self-funded', [
      makeProject({ id: 's1', projectCode: 'S', projectType: '自筹项目' }),
    ]);

    expect(store.applyFilters()).toHaveLength(2);

    store.updateFilters({ projectType: '自筹项目' });
    expect(store.applyFilters().map((project) => project.id)).toEqual(['s1']);
  });

  test('成本派生随数据集变化：写入合同后出现超支', () => {
    const store = useDataStore();
    store.updateFilters({ dateRange: DATE_RANGE });
    store.setDataset('business', [makeProject()]);

    expect(store.costSummary.projectCount).toBe(1);
    expect(store.costSummary.overProjectCount).toBe(0);

    store.setDataset('contract', [{ projectCode: 'PRJ-001', contractType: '项目分包', amount: 1500000 }]);

    expect(store.costSummary.overProjectCount).toBe(1);
    expect(store.costSummary.overAmount).toBe(500000);
    expect(store.costRows[0].hasOverBudget).toBe(true);
  });

  test('resetAll 清空数据集并恢复默认筛选与口径规则', () => {
    const store = useDataStore();
    store.setDataset('business', [makeProject()]);
    store.updateFilters({ projectType: '自筹项目' });
    store.resetAll();

    expect(store.projects).toEqual([]);
    expect(store.contracts).toEqual([]);
    expect(store.filters.projectType).toBe('全部');
    expect(store.contractRules).toEqual(createDefaultContractRules());
  });
});
