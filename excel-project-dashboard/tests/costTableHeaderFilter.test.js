/**
 * E 区域表头筛选（Excel 风格）的组件级测试
 *
 * 关注真实交互链路：点表头漏斗 → 下拉里的数量/占比 → 勾选后表格行数变化 → 清除筛选恢复。
 * 断言尽量落在用户可见文本上（共 N 条、清除表头筛选（n）、行内容），避免绑死实现细节。
 */
import { mount } from '@vue/test-utils';
import CostTable from '../src/components/CostControl/CostTable.vue';

const makeRow = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '甲公司/产品研发部',
  // 内部口径仅用于 B 区域筛选；E 区域展示 / 筛选取台账原值
  projectType: '经营项目',
  projectTypeLabel: '研究咨询类',
  planFinalDate: '2026-06-30',
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

const ROWS = [
  makeRow({ id: 'p1', projectCode: 'PRJ-001', projectName: '智慧城市项目', manager: '张三' }),
  makeRow({
    id: 'p2',
    projectCode: 'PRJ-002',
    projectName: '数据中台项目',
    manager: '张三',
    projectType: '自筹项目',
    projectTypeLabel: '信息系统开发类',
    diffTotal: -100,
    hasOverBudget: false,
    overCategories: [],
  }),
  makeRow({
    id: 'p3',
    projectCode: 'PRJ-003',
    projectName: '物联感知项目',
    manager: '李四',
    projectTypeLabel: '产品销售类',
    diffTotal: 200,
    overCategories: ['软硬件采购'],
  }),
  makeRow({
    id: 'p4',
    projectCode: 'PRJ-004',
    projectName: '智能巡检项目',
    manager: '王五',
    diffTotal: -50,
    hasOverBudget: false,
    overCategories: [],
  }),
];

const mountTable = () => mount(CostTable, { props: { rows: ROWS } });

const headerOf = (wrapper, label) =>
  wrapper.findAll('th').find((th) => th.text().includes(label));

const panelOf = (wrapper) => wrapper.find('.column-filter-panel');

const openFilter = async (wrapper, label) => {
  await headerOf(wrapper, label).find('.filter-trigger').trigger('click');
};

/** 分页处的「共 N 条」 */
const totalCount = (wrapper) => Number(wrapper.text().match(/共\s*(\d+)\s*条/)[1]);

const optionLabel = (wrapper, text) =>
  panelOf(wrapper).findAll('label').find((label) => label.text().includes(text));

const buttonOf = (wrapper, text) =>
  panelOf(wrapper).findAll('button').find((button) => button.text() === text);

describe('E 区域表头筛选入口', () => {
  test('除「操作」列外每列表头都有筛选入口', () => {
    const wrapper = mountTable();
    const headers = wrapper.findAll('th');

    expect(headers).toHaveLength(18);
    expect(wrapper.findAll('th .filter-trigger')).toHaveLength(headers.length - 1);
    expect(headerOf(wrapper, '操作').find('.filter-trigger').exists()).toBe(false);
  });

  test('同时只展开一个下拉', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '项目经理');
    expect(wrapper.findAll('.column-filter-panel')).toHaveLength(1);

    await openFilter(wrapper, '状态');
    const panels = wrapper.findAll('.column-filter-panel');
    expect(panels).toHaveLength(1);
    expect(panels[0].text()).toContain('正常');
  });
});

describe('E 区域表头筛选下拉', () => {
  test('列出取值数量与占比，空值显示为 (空白)', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '超支成本类型');

    const panel = panelOf(wrapper);
    expect(panel.text()).toContain('全选（4）');
    expect(optionLabel(wrapper, '(空白)').text()).toContain('（2）');
    expect(optionLabel(wrapper, '(空白)').text()).toContain('50.0%');
  });

  test('面板搜索框按关键字缩小取值列表', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '项目经理');
    // 全选 1 项 + 3 个取值
    expect(panelOf(wrapper).findAll('label')).toHaveLength(4);

    await panelOf(wrapper).find('input[placeholder="搜索取值，空格分隔多个关键字"]').setValue('王五');
    expect(panelOf(wrapper).findAll('label')).toHaveLength(2);
  });

  test('项目类型列按台账原值展示并可筛选，不出现经营 / 自筹内部口径', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '项目类型');

    const panel = panelOf(wrapper);
    expect(panel.text()).toContain('全选（4）');
    expect(optionLabel(wrapper, '研究咨询类').text()).toContain('（2）');
    expect(optionLabel(wrapper, '信息系统开发类').text()).toContain('（1）');
    expect(optionLabel(wrapper, '产品销售类').text()).toContain('（1）');
    // 内部口径（经营 / 自筹）不得进入该列筛选取值
    expect(panel.text()).not.toContain('经营项目');
    expect(panel.text()).not.toContain('自筹项目');

    await optionLabel(wrapper, '研究咨询类').find('input[type="checkbox"]').setValue(false);
    expect(totalCount(wrapper)).toBe(2);
    expect(wrapper.find('tbody').text()).toContain('数据中台项目');
    expect(wrapper.find('tbody').text()).toContain('物联感知项目');
    expect(wrapper.find('tbody').text()).not.toContain('智慧城市项目');
  });

  test('取消全选即显式空选，勾回一个取值只留该值的行', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '项目经理');

    // 第一个复选框是「全选」：全部取消 = 显式空选，一行都不剩（分页随之隐藏）
    await panelOf(wrapper).find('input[type="checkbox"]').setValue(false);
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.text()).toContain('当前筛选条件下暂无成本数据');

    await optionLabel(wrapper, '李四').find('input[type="checkbox"]').setValue(true);
    expect(totalCount(wrapper)).toBe(1);
    expect(wrapper.find('tbody').text()).toContain('物联感知项目');
    expect(wrapper.text()).toContain('清除表头筛选（1）');
  });

  test('数值列走条件筛选：大于 0 只剩超支行', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '差额合计');

    await panelOf(wrapper).find('select').setValue('gt');
    await panelOf(wrapper).find('input[type="text"]').setValue('0');

    expect(totalCount(wrapper)).toBe(2);
    expect(wrapper.find('tbody').text()).toContain('智慧城市项目');
    expect(wrapper.find('tbody').text()).not.toContain('数据中台项目');
  });

  test('数值列输入非法时不筛空表格，并随清除筛选复原', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '差额合计');

    await panelOf(wrapper).find('input[type="text"]').setValue('abc');
    expect(totalCount(wrapper)).toBe(4);

    await buttonOf(wrapper, '清除筛选').trigger('click');
    expect(totalCount(wrapper)).toBe(4);
    expect(wrapper.text()).not.toContain('清除表头筛选');
  });
});

describe('E 区域表头排序', () => {
  test('降序按该列重排并在表头显示方向，再点一次取消', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '差额合计');

    await buttonOf(wrapper, '降序').trigger('click');
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('智慧城市项目');
    expect(headerOf(wrapper, '差额合计').text()).toContain('↓');

    await buttonOf(wrapper, '降序').trigger('click');
    expect(headerOf(wrapper, '差额合计').text()).not.toContain('↓');
  });

  test('升序把最小差额排在第一行', async () => {
    const wrapper = mountTable();
    await openFilter(wrapper, '差额合计');

    await buttonOf(wrapper, '升序').trigger('click');
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('数据中台项目');
  });
});

describe('E 区域表头筛选清除', () => {
  test('多列筛选叠加 + 一键清除', async () => {
    const wrapper = mountTable();

    await openFilter(wrapper, '状态');
    await optionLabel(wrapper, '超支').find('input[type="checkbox"]').setValue(false);
    expect(totalCount(wrapper)).toBe(2);

    await openFilter(wrapper, '项目经理');
    await optionLabel(wrapper, '王五').find('input[type="checkbox"]').setValue(false);
    // 状态=正常 且 经理≠王五 → 只剩「数据中台项目」
    expect(totalCount(wrapper)).toBe(1);
    expect(wrapper.find('tbody').text()).toContain('数据中台项目');
    expect(wrapper.text()).toContain('清除表头筛选（2）');

    const clearButton = wrapper.findAll('button').find((button) => button.text().includes('清除表头筛选'));
    await clearButton.trigger('click');

    expect(totalCount(wrapper)).toBe(4);
    expect(wrapper.findAll('.column-filter-panel')).toHaveLength(0);
    expect(wrapper.text()).not.toContain('清除表头筛选');
  });
});
