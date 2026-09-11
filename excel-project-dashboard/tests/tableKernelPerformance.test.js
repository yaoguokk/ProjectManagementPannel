/**
 * 表格内核的千行级性能基线
 *
 * 目标不是精确基准（jsdom 环境抖动大），而是防止复杂度悄悄退化：
 * 例如筛选链路从「单次遍历求交」写回「逐列 filter」，或行模型里重新引入每次实例化的 Intl。
 * 阈值刻意宽松，只兜住数量级问题。
 */
import { describe, expect, test } from 'vitest';
import { useDataTable } from '../src/composables/useDataTable';
import { buildProjectRow } from '../src/utils/projectTableRow';
import { buildProjectColumns } from '../src/utils/projectTableColumns';
import { ColumnFilterKind, NumberOperator } from '../src/utils/columnFilters';

const ROW_COUNT = 1000;
const TYPE_LABELS = ['研究咨询类', '产品销售类', '信息系统开发类'];

const makeRows = (count) => Array.from({ length: count }, (_, index) => ({
  id: `p${index}`,
  projectCode: `PRJ-${String(index).padStart(4, '0')}`,
  projectName: `项目${index}`,
  manager: `经理${index % 50}`,
  projectTypeLabel: TYPE_LABELS[index % TYPE_LABELS.length],
  amount: (index + 1) * 1000,
  planFinalDate: '2026-06-30',
}));

const COLUMNS = [
  { key: 'code', label: '项目编号', filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.projectCode },
  { key: 'name', label: '项目名称', filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.projectName },
  { key: 'manager', label: '项目经理', filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.manager },
  { key: 'type', label: '项目类型', filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.projectTypeLabel },
  { key: 'amount', label: '立项合计', align: 'right', filter: ColumnFilterKind.NUMBER, getFilterValue: (row) => row.amount },
];

describe('表格内核 > 千行级', () => {
  test('多列筛选 + 排序 + 分页的结果正确且耗时不退化', () => {
    const table = useDataTable({
      columns: COLUMNS,
      rows: makeRows(ROW_COUNT),
      searchValues: {
        getBasicValues: (row) => [row.projectCode, row.projectName],
        getGlobalValues: (row) => [row.projectName],
      },
    });

    const started = performance.now();

    // 三个生效列同时筛选：内核应单次遍历求交
    table.setColumnFilter('manager', { ...table.createColumnFilter(), values: ['经理1'] });
    table.setColumnFilter('type', { ...table.createColumnFilter(), values: ['研究咨询类'] });
    table.setColumnFilter('amount', {
      ...table.createColumnFilter(),
      operator: NumberOperator.GTE,
      number: '10000',
    });
    table.setColumnSort('amount', 'desc');

    const filtered = table.filteredRows.value;
    const page = table.paginatedRows.value;
    const duration = performance.now() - started;

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => row.manager === '经理1'
      && row.projectTypeLabel === '研究咨询类'
      && row.amount >= 10000)).toBe(true);
    // 排序仍生效
    expect(filtered[0].amount).toBeGreaterThanOrEqual(filtered[filtered.length - 1].amount);
    expect(page.length).toBeLessThanOrEqual(10);
    expect(duration).toBeLessThan(300);
  });

  test('千行行模型构建（金额格式化 + 倒计时）耗时不退化', () => {
    const columns = buildProjectColumns({
      columnNames: ['项目编号', '项目名称', '项目经理', '项目类型', '立项收入(元)', '项目状态'],
      tab: 'initial',
    });
    const rows = makeRows(ROW_COUNT).map((row) => ({
      ...row,
      '项目编号': row.projectCode,
      '项目名称': row.projectName,
      '项目经理': row.manager,
      '项目类型': row.projectTypeLabel,
      '立项收入(元)': String(row.amount),
      '项目状态': '待终验',
      planInitialDate: '2026-04-30',
      actualInitialDate: '2026-04-20',
      actualFinalDate: '',
    }));

    const started = performance.now();
    const models = rows.map((row) => buildProjectRow(row, { columns, tab: 'initial' }));
    const duration = performance.now() - started;

    expect(models).toHaveLength(ROW_COUNT);
    expect(models[0].cells.find((cell) => cell.key === '立项收入(元)').text).toBe('1,000');
    expect(duration).toBeLessThan(800);
  });
});
