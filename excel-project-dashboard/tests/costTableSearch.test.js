/**
 * E 区域关键词搜索口径
 *
 * 基础搜索：项目编号 / 项目名称 / 项目经理 / 业务部所
 * 全局搜索：行的全部字段（含台账原始列 / 项目清单列）+ 成本口径的可读文案
 *          （超支 / 正常、超支成本类型、各成本分类名）
 */
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import CostTable from '../src/components/CostControl/CostTable.vue';

const makeRow = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '甲公司/产品研发部',
  projectType: '经营项目',
  projectTypeLabel: '研究咨询类',
  planFinalDate: '2026-06-30',
  // 台账原始列（项目清单列）
  '项目状态': '待终验',
  '项目责任部门': '研发中心',
  '立项收入(元)': '1234567',
  categories: [
    { key: 'subcontract', label: '项目分包费', budget: 1000, actual: 1500, diff: 500, over: true, contracts: [] },
  ],
  budgetTotal: 1000,
  actualTotal: 1500,
  diffTotal: 500,
  overCategories: ['项目分包费'],
  hasOverBudget: true,
  overallOver: true,
  ...overrides,
});

const ROWS = [
  makeRow(),
  makeRow({
    id: 'p2',
    projectCode: 'PRJ-002',
    projectName: '数据中台项目',
    manager: '李四',
    projectType: '自筹项目',
    projectTypeLabel: '信息系统开发类',
    '项目状态': '已结算',
    '项目责任部门': '交付中心',
    '立项收入(元)': '500000',
    categories: [],
    budgetTotal: 0,
    actualTotal: 0,
    diffTotal: -100,
    overCategories: [],
    hasOverBudget: false,
    overallOver: false,
  }),
];

const mountTable = () => mount(CostTable, { props: { rows: ROWS } });

/** 结果行数：取分页处的「共 N 条」（无结果时列表为空态，pagination 不渲染） */
const resultCount = (wrapper) => {
  const match = wrapper.text().match(/共\s*(\d+)\s*条/);
  return match ? Number(match[1]) : 0;
};

const search = async (wrapper, query, { global = false } = {}) => {
  if (global) {
    await wrapper.find('select.search-mode').setValue('global');
  }
  await wrapper.find('.search-input-wrapper input').setValue(query);
};

describe('E 区域搜索口径', () => {
  test('基础搜索只覆盖项目编号 / 名称 / 经理 / 部所', async () => {
    const wrapper = mountTable();

    await search(wrapper, '智慧城市');
    expect(resultCount(wrapper)).toBe(1);

    // 台账原始列（项目责任部门）不属于基础搜索范围
    await search(wrapper, '研发中心');
    expect(resultCount(wrapper)).toBe(0);
    expect(wrapper.text()).toContain('当前筛选条件下暂无成本数据');
  });

  test('全局搜索覆盖台账原始列（项目清单列）', async () => {
    const wrapper = mountTable();

    await search(wrapper, '研发中心', { global: true });
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '已结算', { global: true }); // 台账「项目状态」列
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '1234567', { global: true }); // 台账「立项收入(元)」列
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '交付中心', { global: true });
    expect(resultCount(wrapper)).toBe(1);
  });

  test('全局搜索保留成本口径文案：超支 / 正常 / 成本分类名', async () => {
    const wrapper = mountTable();

    await search(wrapper, '超支', { global: true });
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '正常', { global: true });
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '项目分包费', { global: true });
    expect(resultCount(wrapper)).toBe(1);
  });

  test('全局搜索保留内部口径、台账项目类型原值与合计数值', async () => {
    const wrapper = mountTable();

    await search(wrapper, '自筹项目', { global: true });
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '研究咨询类', { global: true });
    expect(resultCount(wrapper)).toBe(1);

    await search(wrapper, '1500', { global: true }); // 实际合计
    expect(resultCount(wrapper)).toBe(1);
  });

  test('全局搜索支持「任意关键词（或）」与「全部关键词（与）」', async () => {
    const wrapper = mountTable();

    // 默认「或」：两个关键词分别命中两行
    await search(wrapper, '研发中心,交付中心', { global: true });
    expect(resultCount(wrapper)).toBe(2);

    // 切「与」：没有任何一行同时命中这两个词
    await wrapper.find('select.search-match-mode').setValue('all');
    expect(resultCount(wrapper)).toBe(0);

    await search(wrapper, '研发中心,待终验', { global: true });
    expect(resultCount(wrapper)).toBe(1);
  });
});
