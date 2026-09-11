import { describe, expect, test } from 'vitest';
import {
  AMOUNT_COLUMN_KEYWORDS,
  FALLBACK_COLUMN_WIDTH,
  alignClass,
  createCell,
  createRowModel,
  isAmountColumn,
  normalizeColumns,
  resolveColumnWidth,
} from '../src/utils/tableModel';

describe('tableModel > 金额列判定', () => {
  test('命中金额关键词的列名按金额处理', () => {
    ['立项收入(元)', '项目分包费-实际', '软硬件采购-立项', '预算金额', '人工分摊'].forEach((label) => {
      expect(isAmountColumn(label)).toBe(true);
    });
    expect(AMOUNT_COLUMN_KEYWORDS.length).toBeGreaterThan(0);
  });

  test('普通列名不按金额处理', () => {
    ['项目名称', '项目经理', '项目状态', '业务部所'].forEach((label) => {
      expect(isAmountColumn(label)).toBe(false);
    });
  });

  test('空值安全', () => {
    expect(isAmountColumn()).toBe(false);
    expect(isAmountColumn(null)).toBe(false);
  });
});

describe('tableModel > 列模型', () => {
  test('normalizeColumns 过滤掉缺 key 的列', () => {
    const columns = normalizeColumns([
      { key: 'a', label: 'A' },
      null,
      { label: '缺 key' },
      { key: 'b', label: 'B' },
    ]);

    expect(columns.map((col) => col.key)).toEqual(['a', 'b']);
  });

  test('alignClass 默认居中，显式 right 才右对齐', () => {
    expect(alignClass({ align: 'right' })).toBe('text-right');
    expect(alignClass({})).toBe('text-center');
    expect(alignClass(undefined)).toBe('text-center');
  });

  test('resolveColumnWidth 缺省回退到兜底宽度', () => {
    expect(resolveColumnWidth({ width: 300 })).toBe(300);
    expect(resolveColumnWidth({})).toBe(FALLBACK_COLUMN_WIDTH);
  });
});

describe('tableModel > 单元格与行模型', () => {
  test('createCell 补齐默认字段，title 缺省时为空串', () => {
    expect(createCell({ key: 'code', text: 'P-001' })).toEqual({
      key: 'code',
      text: 'P-001',
      title: '',
      type: 'text',
      cellClass: '',
    });
  });

  test('createCell 保留显式 type 与样式（供插槽匹配）', () => {
    const cell = createCell({ key: 'status', type: 'status', cellClass: 'text-center' });
    expect(cell.type).toBe('status');
    expect(cell.cellClass).toBe('text-center');
  });

  test('createRowModel 默认用行 id 作为渲染 key，无 id 时回退空串', () => {
    expect(createRowModel({ id: 'row-1' }, []).key).toBe('row-1');
    expect(createRowModel({}, []).key).toBe('');
    expect(createRowModel({ id: 'row-1' }, [], { rowClass: 'bg-red-50' }).rowClass).toBe('bg-red-50');
  });
});
