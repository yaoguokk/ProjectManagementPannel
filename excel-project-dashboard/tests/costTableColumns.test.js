import {
  buildCostColumns,
  buildCostCell,
  defaultCostColumnLabels,
  formatAmount,
  formatDiff,
} from '../src/utils/costTableColumns';
import { ColumnFilterKind } from '../src/utils/columnFilters';
import { DepartmentDisplay } from '../src/utils/departmentDisplay';

const OVER_STYLE = 'text-right font-semibold text-red-600';
const NORMAL_STYLE = 'text-right font-semibold text-gray-500';

const makeRow = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '信息技术部',
  // 内部口径（经营 / 自筹）与台账原值同时存在，展示必须取后者
  projectType: '经营项目',
  projectTypeLabel: '研究咨询类',
  planFinalDate: '2026-06-30',
  categories: [
    { key: 'subcontract', label: '项目分包费', budget: 1000, actual: 1500, diff: 500, over: true },
    { key: 'hardware', label: '软硬件采购', budget: 2000, actual: 1800, diff: -200, over: false },
  ],
  budgetTotal: 3000,
  actualTotal: 3300,
  diffTotal: 300,
  overCategories: ['项目分包费'],
  hasOverBudget: true,
  overallOver: true,
  ...overrides,
});

describe('costTableColumns', () => {
  test('列集合 = 固定列 + 动态分类列', () => {
    const labels = buildCostColumns([makeRow()]).map((col) => col.label);
    expect(labels.slice(0, 6)).toEqual(['项目编号', '项目名称', '项目经理', '业务部所', '项目类型', '计划终验时间']);
    expect(labels).toContain('项目分包费-立项');
    expect(labels).toContain('项目分包费-实际');
    expect(labels).toContain('项目分包费-差额');
    expect(labels.slice(-6)).toEqual(['立项合计', '实际合计', '差额合计', '超支成本类型', '状态', '操作']);
  });

  test('新增成本分类后列自动扩展', () => {
    const row = makeRow();
    row.categories.push({ key: 'travel', label: '差旅费', budget: 0, actual: 0, diff: 0, over: false });
    const labels = buildCostColumns([row]).map((col) => col.label);
    expect(labels).toContain('差旅费-立项');
    expect(labels).toHaveLength(buildCostColumns([makeRow()]).length + 3);
  });

  test('无数据时只返回固定列', () => {
    expect(buildCostColumns([])).toHaveLength(12);
    expect(buildCostColumns()).toHaveLength(12);
  });

  test('差额单元格：超支标红、未超支置灰', () => {
    const row = makeRow();
    expect(buildCostCell(row, { key: 'subcontract-diff', kind: 'diff', categoryKey: 'subcontract' }))
      .toMatchObject({ text: '+500', cellClass: OVER_STYLE });
    expect(buildCostCell(row, { key: 'hardware-diff', kind: 'diff', categoryKey: 'hardware' }))
      .toMatchObject({ text: '-200', cellClass: NORMAL_STYLE });
  });

  test('分类数据缺失时回退为零值', () => {
    const cell = buildCostCell(makeRow(), { key: 'travel-budget', kind: 'budget', categoryKey: 'travel' });
    expect(cell.text).toBe('0');
  });

  test('合计差额按 overallOver 标色', () => {
    expect(buildCostCell(makeRow(), { key: 'diffTotal' }).cellClass).toBe(OVER_STYLE);
    expect(buildCostCell(makeRow({ overallOver: false }), { key: 'diffTotal' }).cellClass).toBe(NORMAL_STYLE);
  });

  test('状态与操作列交给模板渲染', () => {
    expect(buildCostCell(makeRow(), { key: 'status' })).toMatchObject({ type: 'status' });
    expect(buildCostCell(makeRow(), { key: 'action' })).toMatchObject({ type: 'action' });
  });

  test('超支类型为空时显示占位符', () => {
    expect(buildCostCell(makeRow({ overCategories: [] }), { key: 'overCategories' }).text).toBe('-');
  });

  test('项目名过长时带 title 便于悬浮查看', () => {
    expect(buildCostCell(makeRow(), { key: 'name' })).toMatchObject({ title: '智慧城市项目' });
  });

  test('业务部所默认全部展示', () => {
    expect(buildCostCell(makeRow(), { key: 'department' }).text).toBe('信息技术部');
  });

  test('仅部门模式下去掉公司前缀', () => {
    const row = makeRow({ department: 'A公司/B公司/产品研发部' });
    const cell = buildCostCell(
      row,
      { key: 'department' },
      { departmentMode: DepartmentDisplay.LAST_SEGMENT }
    );
    expect(cell.text).toBe('产品研发部');
  });

  test('列定义自带默认宽度，动态分类列宽度一致', () => {
    const columns = buildCostColumns([makeRow()]);
    const widthOf = (key) => columns.find((col) => col.key === key).width;

    expect(widthOf('code')).toBe(160);
    expect(widthOf('department')).toBe(220);
    expect(widthOf('projectType')).toBe(100);
    expect(widthOf('subcontract-budget')).toBe(110);
    expect(widthOf('subcontract-actual')).toBe(110);
    expect(widthOf('subcontract-diff')).toBe(110);
    expect(columns.every((col) => col.width > 0)).toBe(true);
  });

  test('项目类型列：展示台账原值而非内部经营 / 自筹口径，空值显示占位符', () => {
    const cell = buildCostCell(makeRow(), { key: 'projectType' });
    expect(cell.text).toBe('研究咨询类');
    expect(cell.text).not.toBe('经营项目');
    expect(buildCostCell(makeRow({ projectTypeLabel: '' }), { key: 'projectType' }).text).toBe('-');
  });

  test('项目类型列的表头筛选取值与单元格同源（台账原值）', () => {
    const column = buildCostColumns([makeRow()]).find((col) => col.key === 'projectType');
    expect(column.getFilterValue(makeRow())).toBe('研究咨询类');
  });

  test('金额与差额格式化', () => {
    expect(formatAmount(1234567)).toBe('1,234,567');
    expect(formatAmount(null)).toBe('0');
    expect(formatDiff(300)).toBe('+300');
    expect(formatDiff(-300)).toBe('-300');
    expect(formatDiff(0)).toBe('0');
  });
});

describe('costTableColumns > 项目清单列', () => {
  const withLedgerFields = (overrides = {}) => makeRow({
    '项目状态': '待终验',
    '立项收入(元)': '1234567',
    '项目责任部门': '研发中心',
    ...overrides,
  });

  const columnOf = (row, label) => buildCostColumns([row]).find((col) => col.label === label);

  test('台账其余列进入列定义，成本行派生字段不进入', () => {
    const labels = buildCostColumns([withLedgerFields()]).map((col) => col.label);

    expect(labels).toContain('项目状态');
    expect(labels).toContain('立项收入(元)');
    expect(labels).toContain('项目责任部门');

    // 成本行自身的派生字段不是「项目清单」列
    ['categories', 'budgetTotal', 'actualTotal', 'hasOverBudget', 'projectTypeLabel'].forEach((field) => {
      expect(labels).not.toContain(field);
    });
  });

  test('与成本列同名的台账列不重复出现', () => {
    const labels = buildCostColumns([withLedgerFields({ '项目类型': '研究咨询类', '项目编号': 'PRJ-001' })])
      .map((col) => col.label);

    expect(labels.filter((label) => label === '项目类型')).toHaveLength(1);
    expect(labels.filter((label) => label === '项目编号')).toHaveLength(1);
  });

  test('项目清单列排在「操作」之前，默认勾选里不含它们', () => {
    const columns = buildCostColumns([withLedgerFields()]);

    expect(columns[columns.length - 1].label).toBe('操作');
    expect(columns[columns.length - 2].ledger).toBe(true);

    const defaults = defaultCostColumnLabels(columns);
    expect(defaults).toContain('项目编号');
    expect(defaults).toContain('状态');
    expect(defaults).toContain('操作');
    expect(defaults).not.toContain('项目状态');
    expect(defaults).not.toContain('立项收入(元)');
  });

  test('单元格：文本取台账原值、空值占位、金额千分位', () => {
    const row = withLedgerFields({ '项目责任部门': '' });

    expect(buildCostCell(row, columnOf(row, '项目状态')).text).toBe('待终验');
    expect(buildCostCell(row, columnOf(row, '项目责任部门')).text).toBe('-');
    expect(buildCostCell(row, columnOf(row, '立项收入(元)'))).toMatchObject({
      text: '1,234,567',
      cellClass: 'text-right text-gray-700',
    });
  });

  test('表头筛选：文本按台账原值、金额走数值条件', () => {
    const row = withLedgerFields();

    const status = columnOf(row, '项目状态');
    expect(status.filter).toBe(ColumnFilterKind.VALUE);
    expect(status.getFilterValue(row)).toBe('待终验');

    const budget = columnOf(row, '立项收入(元)');
    expect(budget.filter).toBe(ColumnFilterKind.NUMBER);
    expect(budget.getFilterValue(row)).toBe(1234567);
  });

  test('列宽沿用项目明细的列宽表，未知列走兜底宽度', () => {
    const row = withLedgerFields({ '项目名称': '智慧城市项目' });
    expect(columnOf(row, '项目名称').width).toBeGreaterThan(0);
    expect(columnOf(row, '项目状态').width).toBeGreaterThan(0);
    expect(columnOf(row, '项目责任部门').width).toBeGreaterThan(0);
  });
});
