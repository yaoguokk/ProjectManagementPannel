import { describe, expect, test } from 'vitest';
import { nextTick, ref } from 'vue';
import { useDataTable } from '../src/composables/useDataTable';
import { ColumnFilterKind, NumberOperator } from '../src/utils/columnFilters';

const COLUMNS = [
  { key: 'code', label: '项目编号', filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.code },
  { key: 'name', label: '项目名称', filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.name },
  {
    key: 'amount',
    label: '立项合计',
    align: 'right',
    filter: ColumnFilterKind.NUMBER,
    getFilterValue: (row) => row.amount,
  },
  { key: 'action', label: '操作', filter: ColumnFilterKind.NONE },
];

const ROWS = [
  { id: 'a', code: 'P-001', name: '甲项目', amount: 100 },
  { id: 'b', code: 'P-002', name: '乙项目', amount: 300 },
  { id: 'c', code: 'P-003', name: '丙项目', amount: 200 },
];

const SEARCH_VALUES = {
  getBasicValues: (row) => [row.code, row.name],
  getGlobalValues: (row) => [row.code, row.name, String(row.amount)],
};

const createTable = (options = {}) => useDataTable({
  columns: COLUMNS,
  rows: ROWS,
  searchValues: SEARCH_VALUES,
  ...options,
});

describe('useDataTable > 列显隐', () => {
  test('默认展示全部非 fixed 列', () => {
    const table = createTable();

    expect(table.selectableColumnLabels.value).toEqual(['项目编号', '项目名称', '立项合计', '操作']);
    expect(table.visibleColumns.value.map((col) => col.label)).toEqual(['项目编号', '项目名称', '立项合计', '操作']);
  });

  test('fixed 列不参与列显隐（D 区域的日期列/倒计时列）', () => {
    const table = createTable({
      columns: [...COLUMNS, { key: 'countdown', label: '验收倒计时', fixed: true }],
      initialSelectedLabels: ['项目编号'],
    });

    expect(table.visibleColumns.value.map((col) => col.label)).toEqual(['项目编号', '验收倒计时']);
  });

  test('initialSelectedLabels 可传函数，按当前列模型延迟求值', () => {
    const table = createTable({
      columns: [...COLUMNS, { key: 'ledger', label: '台账列' }],
      initialSelectedLabels: () => ['项目编号'],
    });

    expect(table.selectedColumnLabels.value).toEqual(['项目编号']);
    expect(table.visibleColumns.value.map((col) => col.label)).toEqual(['项目编号']);
  });

  test('pruneMissingColumns 会清掉数据中已不存在的选中列', async () => {
    const columns = ref([...COLUMNS]);
    const table = useDataTable({
      columns,
      rows: ROWS,
      pruneMissingColumns: true,
    });
    expect(table.visibleColumns.value).toHaveLength(4);

    // 换台账后「项目名称」列消失（真实场景：列由数据键推导）
    columns.value = COLUMNS.filter((col) => col.key !== 'name');
    await nextTick();

    expect(table.visibleColumns.value.map((col) => col.label)).toEqual(['项目编号', '立项合计', '操作']);
  });
});

describe('useDataTable > 搜索 / 列筛选 / 排序 链路', () => {
  test('关键词搜索按基础字段匹配', () => {
    const table = createTable();
    table.searchQuery.value = '乙';

    expect(table.searchedRows.value.map((row) => row.id)).toEqual(['b']);
  });

  test('列筛选多选为「或」，跨列为「与」', () => {
    const table = createTable();
    table.setColumnFilter('name', { ...table.createColumnFilter(), values: ['甲项目', '丙项目'] });

    expect(table.filteredRows.value.map((row) => row.name)).toEqual(['甲项目', '丙项目']);
  });

  test('数值列支持条件筛选', () => {
    const table = createTable();
    table.setColumnFilter('amount', {
      ...table.createColumnFilter(),
      operator: NumberOperator.GTE,
      number: '200',
    });

    expect(table.filteredRows.value.map((row) => row.id)).toEqual(['b', 'c']);
  });

  test('排序按方向生效，清除排序后回到原始顺序', () => {
    const table = createTable();
    table.setColumnSort('amount', 'asc');
    expect(table.filteredRows.value.map((row) => row.amount)).toEqual([100, 200, 300]);

    table.setColumnSort('amount', 'desc');
    expect(table.filteredRows.value.map((row) => row.amount)).toEqual([300, 200, 100]);

    table.setColumnSort('amount', '');
    expect(table.filteredRows.value.map((row) => row.amount)).toEqual([100, 300, 200]);
  });
});

describe('useDataTable > 下拉统计 / 计数 / 清除', () => {
  test('打开下拉时统计「其他列筛选之后」的取值，且排除自身列', () => {
    const table = createTable();
    table.setColumnFilter('name', { ...table.createColumnFilter(), values: ['甲项目'] });
    table.toggleFilterKey('code');

    expect(table.openFilterColumn.value.label).toBe('项目编号');
    // 自身列（项目编号）未生效，所以统计基数只剩「项目名称」筛选后的 1 行
    expect(table.openFilterSourceRows.value).toHaveLength(1);
    expect(table.openFilterOptions.value.map((option) => option.value)).toEqual(['P-001']);
  });

  test('未展开下拉时不统计取值（避免无谓的全表遍历）', () => {
    const table = createTable();

    expect(table.openFilterColumn.value).toBeNull();
    expect(table.openFilterOptions.value).toEqual([]);
  });

  test('activeFilterCount 只统计生效的筛选', () => {
    const table = createTable();
    expect(table.activeFilterCount.value).toBe(0);

    table.setColumnFilter('code', table.createColumnFilter()); // 未启用
    expect(table.activeFilterCount.value).toBe(0);

    table.setColumnFilter('name', { ...table.createColumnFilter(), values: ['甲项目'] });
    expect(table.activeFilterCount.value).toBe(1);

    table.clearHeaderFilters();
    expect(table.activeFilterCount.value).toBe(0);
    expect(table.filteredRows.value).toHaveLength(3);
  });

  test('toggleFilterKey 同时只允许展开一个下拉', () => {
    const table = createTable();
    table.toggleFilterKey('code');
    expect(table.openFilterKey.value).toBe('code');

    table.toggleFilterKey('name');
    expect(table.openFilterKey.value).toBe('name');

    table.toggleFilterKey('name');
    expect(table.openFilterKey.value).toBe('');
  });
});

describe('useDataTable > 分页联动', () => {
  test('筛选或每页条数变化后回到第一页', async () => {
    const table = createTable();
    table.pageSize.value = 1;
    table.nextPage();
    expect(table.currentPage.value).toBe(2);

    table.setColumnFilter('code', { ...table.createColumnFilter(), values: ['P-001', 'P-002'] });
    await nextTick();
    expect(table.currentPage.value).toBe(1);
    expect(table.totalPages.value).toBe(2);
    expect(table.paginatedRows.value).toHaveLength(1);
  });

  test('未提供 searchValues 时不启用关键词搜索', () => {
    const table = useDataTable({ columns: COLUMNS, rows: ROWS });

    expect(table.searchEnabled).toBe(false);
    table.searchQuery.value = '乙';
    expect(table.filteredRows.value).toHaveLength(3);
  });
});
