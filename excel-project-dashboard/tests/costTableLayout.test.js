/**
 * E 区域布局回归测试
 *
 * 关注的不是样式细节，而是一个结构不变量：明细表格必须通铺视口宽度（与 D 区域一致），
 * 不能被 1400px 的工具栏 / 分页容器包住 —— 否则表格会重新被压回窄卡片。
 */
import { mount } from '@vue/test-utils';
import CostTable from '../src/components/CostControl/CostTable.vue';

const makeRow = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '信息技术公司/产品研发部',
  planFinalDate: '2026-06-30',
  actualFinalDate: '',
  projectType: '自营项目',
  categories: [
    { key: 'subcontract', label: '项目分包费', budget: 1000, actual: 1500, diff: 500, over: true, contracts: [] },
    { key: 'hardware', label: '软硬件采购', budget: 2000, actual: 1800, diff: -200, over: false, contracts: [] },
  ],
  budgetTotal: 3000,
  actualTotal: 3300,
  diffTotal: 300,
  overCategories: ['项目分包费'],
  hasOverBudget: true,
  overallOver: true,
  ...overrides,
});

const WIDE = 'max-w-[1400px]';
const BREAKOUT = 'w-screen';

const mountCostTable = () => {
  const wrapper = mount(CostTable, { props: { rows: [makeRow()] } });
  const divs = wrapper.findAll('div');
  return {
    wrapper,
    divs,
    has: (el, name) => el.classes().includes(name),
    breakout: divs.find((el) => el.classes().includes(BREAKOUT)),
    constrained: divs.filter((el) => el.classes().includes(WIDE)),
  };
};

describe('E 区域表格通铺布局', () => {
  test('最外层容器允许溢出，表格区才能突破 main-container 的 max-width', () => {
    // 组件是多根节点（弹窗与主容器同级），取文档序第一个 div 作为最外层容器
    const { divs } = mountCostTable();
    expect(divs[0].classes()).toContain('overflow-visible');
  });

  test('表格区撑满视口宽度，且不在 1400px 约束容器内', () => {
    const { breakout, constrained } = mountCostTable();

    expect(breakout).toBeTruthy();
    // calc(50% - 50vw) 负边距 + 100vw，与 D 区域 .table-breakout 同一实现
    expect(breakout.classes()).toEqual(expect.arrayContaining(['ml-[calc(50%_-_50vw)]', BREAKOUT, 'bg-white']));
    expect(breakout.find('table').exists()).toBe(true);

    expect(constrained).toHaveLength(2);
    constrained.forEach((el) => expect(el.find('table').exists()).toBe(false));
  });

  test('工具栏 / 表格 / 分页的先后顺序保持不变', () => {
    const { divs, has, breakout } = mountCostTable();
    const toolbar = divs.find((el) => has(el, WIDE) && el.text().includes('超支筛选'));
    const pagination = divs.find((el) => has(el, WIDE) && el.text().includes('条/页'));
    const order = [toolbar, breakout, pagination].map((el) => divs.indexOf(el));

    expect(toolbar && pagination).toBeTruthy();
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });

  test('通铺后每列表头仍带拖拽手柄', () => {
    const { breakout } = mountCostTable();
    const headers = breakout.findAll('th');
    expect(headers.length).toBeGreaterThan(0);
    expect(breakout.findAll('th .resize-handle')).toHaveLength(headers.length);
  });
});
