import { describe, expect, test } from 'vitest';
import {
  DEFAULT_PROJECT_COLUMNS,
  PROGRAM_FIELDS,
  PROJECT_COLUMN_WIDTHS,
  buildProjectColumns,
  extractColumnNames,
  getColumnValue,
} from '../src/utils/projectTableColumns';
import { FALLBACK_COLUMN_WIDTH } from '../src/utils/tableModel';

describe('projectTableColumns > 列名提取', () => {
  test('取所有项目键的并集并剔除程序内部字段', () => {
    const names = extractColumnNames([
      { id: 'p1', projectCode: 'PRJ-001', '项目编号': 'PRJ-001', '立项收入(元)': '1', planFinalDate: '2026-01-01' },
      { '项目名称': '甲项目', '新增列': 'x' },
    ]);

    expect(names).toContain('项目编号');
    expect(names).toContain('立项收入(元)');
    expect(names).toContain('项目名称');
    expect(names).toContain('新增列');
    PROGRAM_FIELDS.forEach((field) => {
      expect(names).not.toContain(field);
    });
  });

  test('空数据返回空数组', () => {
    expect(extractColumnNames([])).toEqual([]);
  });
});

describe('projectTableColumns > 取值回退', () => {
  test('优先取 Excel 原列名', () => {
    expect(getColumnValue({ '项目经理': '张三', manager: '李四' }, '项目经理')).toBe('张三');
  });

  test('缺失时回退到程序字段（自筹台账没有这些中文列）', () => {
    expect(getColumnValue({ manager: '李四' }, '项目经理')).toBe('李四');
    expect(getColumnValue({ department: '营销部' }, '业务部所')).toBe('营销部');
  });

  test('都没有时返回空串', () => {
    expect(getColumnValue({}, '项目经理')).toBe('');
    expect(getColumnValue(undefined, '项目经理')).toBe('');
  });
});

describe('projectTableColumns > 列模型', () => {
  test('Excel 列 + 固定日期列 + 固定倒计时列', () => {
    const columns = buildProjectColumns({ columnNames: ['项目编号', '项目名称'], tab: 'initial' });

    expect(columns.map((col) => col.key)).toEqual([
      '项目编号',
      '项目名称',
      '计划初验时间',
      '实际初验时间',
      '验收倒计时',
    ]);
    // 固定列不参与列设置
    expect(columns.filter((col) => col.fixed).map((col) => col.key)).toEqual([
      '计划初验时间',
      '实际初验时间',
      '验收倒计时',
    ]);
  });

  test('Tab 决定日期列名', () => {
    const columns = buildProjectColumns({ columnNames: [], tab: 'final' });
    expect(columns.map((col) => col.label)).toEqual(['计划终验时间', '实际终验时间', '验收倒计时']);
  });

  test('宽度取自宽度表，未登记的列回退兜底宽度', () => {
    const columns = buildProjectColumns({ columnNames: ['项目名称', '某个新列'], tab: 'initial' });
    const byKey = Object.fromEntries(columns.map((col) => [col.key, col]));

    expect(byKey['项目名称'].width).toBe(PROJECT_COLUMN_WIDTHS['项目名称']);
    expect(byKey['某个新列'].width).toBe(FALLBACK_COLUMN_WIDTH);
    expect(byKey['验收倒计时'].width).toBe(PROJECT_COLUMN_WIDTHS['验收倒计时']);
  });

  test('默认列与既有默认展示一致', () => {
    expect(DEFAULT_PROJECT_COLUMNS).toEqual([
      '项目编号', '项目名称', '项目经理', '业务部所', '项目类型', '立项收入(元)', '项目状态',
    ]);
  });
});
