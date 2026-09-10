/**
 * 表头筛选与排序纯逻辑测试
 *
 * 覆盖取值口径、计数/占比、空值归组、同列 OR / 跨列 AND、
 * 数值条件（含只填一端的区间）、错误输入不把表格筛空、排序（数值序 / 空值恒排最后）。
 * 列定义直接取真实列模型，避免测试与线上取值口径脱节。
 */
import { buildCostColumns } from '../src/utils/costTableColumns';
import {
  ColumnFilterKind,
  NumberOperator,
  SortOrder,
  buildValueOptions,
  countActiveColumnFilters,
  filterRowsByColumnFilters,
  formatRatio,
  isColumnFilterActive,
  sortRowsByColumn,
} from '../src/utils/columnFilters';

const makeRow = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '甲公司/产品研发部',
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
    diffTotal: -100,
    hasOverBudget: false,
    overCategories: [],
  }),
  makeRow({
    id: 'p3',
    projectCode: 'PRJ-003',
    projectName: '物联感知项目',
    manager: '李四',
    diffTotal: 200,
    overCategories: ['软硬件采购'],
  }),
  makeRow({
    id: 'p4',
    projectCode: 'PRJ-004',
    projectName: '智能巡检项目',
    manager: '王五',
    diffTotal: -50,
    planFinalDate: '',
    hasOverBudget: false,
    overCategories: [],
  }),
];

const COLUMNS = buildCostColumns(ROWS);
const col = (key) => COLUMNS.find((column) => column.key === key);
const ids = (rows) => rows.map((row) => row.id);

describe('columnFilters 取值与统计', () => {
  test('筛选类型与取值函数由列模型提供', () => {
    expect(col('manager').filter).toBe(ColumnFilterKind.VALUE);
    expect(col('diffTotal').filter).toBe(ColumnFilterKind.NUMBER);
    expect(col('action').filter).toBe(ColumnFilterKind.NONE);
  });

  test('状态列取值与单元格展示一致（超支 / 正常）', () => {
    expect(col('status').getFilterValue(ROWS[0])).toBe('超支');
    expect(col('status').getFilterValue(ROWS[1])).toBe('正常');
  });

  test('取值统计带数量与占比，计数多的排前面', () => {
    const options = buildValueOptions(ROWS, col('manager'));
    expect(options.map((option) => [option.value, option.count]))
      .toEqual([['张三', 2], ['李四', 1], ['王五', 1]]);
    expect(options[0].ratio).toBeCloseTo(0.5);
  });

  test('空值单独归入 (空白)，无需调用方兜底文案', () => {
    const blank = buildValueOptions(ROWS, col('overCategories')).find((option) => option.value === '');
    expect(blank).toMatchObject({ label: '(空白)', count: 2 });
    expect(blank.ratio).toBeCloseTo(0.5);
  });

  test('分类列缺失分类按 0 处理，与单元格展示口径一致', () => {
    const emptyCategories = makeRow({ id: 'p9', categories: [] });
    expect(col('subcontract-budget').getFilterValue(emptyCategories)).toBe(0);
  });

  test('占比文案：0 / 常规 / 极小 / 100 都有确定输出', () => {
    expect(formatRatio(0)).toBe('0%');
    expect(formatRatio(1 / 3)).toBe('33.3%');
    expect(formatRatio(0.0001)).toBe('<0.1%');
    expect(formatRatio(1)).toBe('100%');
  });
});

describe('columnFilters 筛选语义', () => {
  test('同一列多选取值 = OR', () => {
    const rows = filterRowsByColumnFilters(ROWS, { manager: { values: ['张三', '李四'] } }, COLUMNS);
    expect(ids(rows)).toEqual(['p1', 'p2', 'p3']);
  });

  test('不同列之间 = AND', () => {
    const rows = filterRowsByColumnFilters(ROWS, {
      manager: { values: ['张三'] },
      status: { values: ['正常'] },
    }, COLUMNS);
    expect(ids(rows)).toEqual(['p2']);
  });

  test('values=null 是未筛选，values=[] 是显式空选', () => {
    expect(isColumnFilterActive({ values: null })).toBe(false);
    expect(isColumnFilterActive({ values: [] })).toBe(true);
    expect(filterRowsByColumnFilters(ROWS, { manager: { values: null } }, COLUMNS)).toHaveLength(4);
    expect(filterRowsByColumnFilters(ROWS, { manager: { values: [] } }, COLUMNS)).toHaveLength(0);
  });

  test('统计基数可排除自身列，否则勾掉一个取值后就再也勾不回来', () => {
    const filters = { manager: { values: ['张三'] } };
    expect(filterRowsByColumnFilters(ROWS, filters, COLUMNS)).toHaveLength(2);
    expect(filterRowsByColumnFilters(ROWS, filters, COLUMNS, 'manager')).toHaveLength(4);

    const withoutSelf = filterRowsByColumnFilters(ROWS, filters, COLUMNS, 'manager');
    expect(buildValueOptions(withoutSelf, col('manager')).map((option) => option.value))
      .toEqual(['张三', '李四', '王五']);
  });

  test('占位列（操作）不参与筛选', () => {
    expect(filterRowsByColumnFilters(ROWS, { action: { values: [] } }, COLUMNS)).toHaveLength(4);
  });

  test('生效列数只统计真正生效的筛选', () => {
    expect(countActiveColumnFilters({})).toBe(0);
    expect(countActiveColumnFilters({
      manager: { values: ['张三'] },
      status: { values: null },
      diffTotal: { operator: '', number: '' },
    })).toBe(1);
  });
});

describe('columnFilters 数值条件', () => {
  test('大于 / 等于按数值比较', () => {
    expect(ids(filterRowsByColumnFilters(ROWS, {
      diffTotal: { operator: NumberOperator.GT, number: '0' },
    }, COLUMNS))).toEqual(['p1', 'p3']);

    expect(ids(filterRowsByColumnFilters(ROWS, {
      diffTotal: { operator: NumberOperator.EQ, number: '300' },
    }, COLUMNS))).toEqual(['p1']);
  });

  test('介于允许只填一端（含负数边界）', () => {
    expect(ids(filterRowsByColumnFilters(ROWS, {
      diffTotal: { operator: NumberOperator.BETWEEN, number: '0', number2: '' },
    }, COLUMNS))).toEqual(['p1', 'p3']);

    expect(ids(filterRowsByColumnFilters(ROWS, {
      diffTotal: { operator: NumberOperator.BETWEEN, number: '', number2: '-50' },
    }, COLUMNS))).toEqual(['p2', 'p4']);
  });

  test('非数字输入视为未启用，不会把表格筛空', () => {
    const invalid = { operator: NumberOperator.GT, number: 'abc' };
    expect(isColumnFilterActive(invalid)).toBe(false);
    expect(filterRowsByColumnFilters(ROWS, { diffTotal: invalid }, COLUMNS)).toHaveLength(4);
  });

  test('分类列的立项 / 实际 / 差额都可按数值筛选', () => {
    expect(ids(filterRowsByColumnFilters(ROWS, {
      'subcontract-diff': { operator: NumberOperator.GT, number: '0' },
    }, COLUMNS))).toEqual(['p1', 'p2', 'p3', 'p4']);
  });
});

describe('columnFilters 排序', () => {
  test('文本列可升可降', () => {
    expect(ids(sortRowsByColumn(ROWS, col('code'), SortOrder.ASC)))
      .toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(ids(sortRowsByColumn(ROWS, col('code'), SortOrder.DESC)))
      .toEqual(['p4', 'p3', 'p2', 'p1']);
  });

  test('数值列按数值大小排序，而不是字符串比较', () => {
    const rows = [
      makeRow({ id: 'a', budgetTotal: 900 }),
      makeRow({ id: 'b', budgetTotal: 1000 }),
    ];
    expect(ids(sortRowsByColumn(rows, col('budgetTotal'), SortOrder.ASC))).toEqual(['a', 'b']);
  });

  test('空值恒排最后，升降序都不把空值顶到前面', () => {
    const asc = sortRowsByColumn(ROWS, col('planFinalDate'), SortOrder.ASC);
    const desc = sortRowsByColumn(ROWS, col('planFinalDate'), SortOrder.DESC);
    expect(asc[asc.length - 1].id).toBe('p4');
    expect(desc[desc.length - 1].id).toBe('p4');
  });

  test('列不存在或方向非法时原样返回', () => {
    expect(sortRowsByColumn(ROWS, undefined, SortOrder.ASC)).toBe(ROWS);
    expect(sortRowsByColumn(ROWS, col('manager'), '')).toBe(ROWS);
  });
});
