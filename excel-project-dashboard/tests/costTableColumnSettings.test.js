/**
 * E 区域列设置：可选列 = 成本列 + 「项目清单」（台账）其余列
 *
 * 需求：列设置里能勾到项目清单的其他列（参考 D 区域），但默认展示保持原来的成本列。
 * 这里走真实组件链路：打开列设置 → 勾选台账列 → 表头与单元格跟随变化 → 「默认」回到成本列。
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
  // 台账原始列（成本行已透传）：这些是「项目清单」列的来源
  '项目类型': '研究咨询类',
  '项目状态': '待终验',
  '立项收入(元)': '1234567',
  '项目责任部门': '研发中心',
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

const mountTable = () => mount(CostTable, { props: { rows: [makeRow()] } });

const openColumnPanel = async (wrapper) => {
  await wrapper.find('.column-settings-btn').trigger('click');
  return wrapper.find('.column-panel');
};

const columnItem = (panel, label) =>
  panel.findAll('.column-item').find((item) => item.text().trim() === label);

const columnLabels = (panel) => panel.findAll('.column-name').map((el) => el.text().trim());

const headerLabels = (wrapper) => wrapper.findAll('th').map((th) => th.text().trim());

/** 把某列勾上/取消（列设置里的复选框） */
const toggleColumn = async (panel, label, checked) => {
  await columnItem(panel, label).find('input[type="checkbox"]').setValue(checked);
};

describe('E 区域列设置 > 项目清单列', () => {
  test('可选列包含项目清单的台账列，且默认未勾选', async () => {
    const wrapper = mountTable();
    const panel = await openColumnPanel(wrapper);
    const labels = columnLabels(panel);

    expect(labels).toContain('项目编号');
    expect(labels).toContain('项目状态');
    expect(labels).toContain('立项收入(元)');
    expect(labels).toContain('项目责任部门');

    expect(columnItem(panel, '项目编号').find('input').element.checked).toBe(true);
    expect(columnItem(panel, '项目状态').find('input').element.checked).toBe(false);
    expect(columnItem(panel, '立项收入(元)').find('input').element.checked).toBe(false);
  });

  test('与成本列同名的台账列只出现一次', async () => {
    const wrapper = mountTable();
    const panel = await openColumnPanel(wrapper);
    const labels = columnLabels(panel);

    expect(labels.filter((label) => label === '项目类型')).toHaveLength(1);
    expect(labels.filter((label) => label === '项目编号')).toHaveLength(1);
  });

  test('默认表格不展示项目清单列', () => {
    const wrapper = mountTable();
    const headers = headerLabels(wrapper);

    expect(headers).toContain('项目编号');
    expect(headers).toContain('操作');
    expect(headers).not.toContain('项目状态');
    expect(headers).not.toContain('立项收入(元)');
  });

  test('勾选后表头与单元格按台账原值展示（金额千分位）', async () => {
    const wrapper = mountTable();
    const panel = await openColumnPanel(wrapper);

    await toggleColumn(panel, '项目状态', true);
    await toggleColumn(panel, '立项收入(元)', true);

    const headers = headerLabels(wrapper);
    expect(headers).toContain('项目状态');
    expect(headers).toContain('立项收入(元)');

    const cells = wrapper.findAll('tbody tr').at(0).findAll('td').map((td) => td.text().trim());
    expect(cells).toContain('待终验');
    expect(cells).toContain('1,234,567');
  });

  test('「默认」按钮回到成本列（清掉项目清单列）', async () => {
    const wrapper = mountTable();
    const panel = await openColumnPanel(wrapper);

    await toggleColumn(panel, '项目状态', true);
    expect(headerLabels(wrapper)).toContain('项目状态');

    const defaultButton = panel.findAll('button').find((button) => button.text() === '默认');
    await defaultButton.trigger('click');

    expect(headerLabels(wrapper)).not.toContain('项目状态');
    expect(headerLabels(wrapper)).toContain('项目编号');
  });
});
