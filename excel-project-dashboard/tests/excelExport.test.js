import { describe, expect, test, vi } from 'vitest';

// tests/setup.js 为解析类测试全局 mock 了 xlsx（只暴露 read / sheet_to_json 等，
// 缺 encode_col 且 aoa_to_sheet 返回空）。这里要验证真实的表构建与数字格式，故解除该 mock。
vi.unmock('xlsx');

import { applyAmountFormat, buildTableSheet } from '../src/utils/excelExport';

// 列名刻意使用含金额关键词的写法（收入 / 支出），用于验证自动判定
const HEADERS = ['项目编号', '项目名称', '立项收入(元)', '实际支出'];

describe('excelExport > buildTableSheet', () => {
  test('表头在首行，数据按列顺序排列', () => {
    const sheet = buildTableSheet(HEADERS, [['P-001', '甲项目', 1000, -200]]);

    expect(sheet.A1.v).toBe('项目编号');
    expect(sheet.B1.v).toBe('项目名称');
    expect(sheet.A2.v).toBe('P-001');
    expect(sheet.D2.v).toBe(-200);
  });

  test('金额列按 AMOUNT_COLUMN_KEYWORDS 自动设置数字格式', () => {
    const sheet = buildTableSheet(HEADERS, [['P-001', '甲项目', 1000, -200]]);

    expect(sheet.C2.z).toBe('#,##0.00');
    expect(sheet.D2.z).toBe('#,##0.00');
    // 非金额列不设置格式
    expect(sheet.A2.z).toBeUndefined();
    expect(sheet.B2.z).toBeUndefined();
  });

  test('可用 amountHeaders 显式声明额外金额列', () => {
    const sheet = buildTableSheet(['项目编号', '工期'], [['P-001', 30]], {
      amountHeaders: ['工期'],
    });

    expect(sheet.B2.z).toBe('#,##0.00');
  });

  test('amountHeaderPredicate 可完全接管金额判定', () => {
    const sheet = buildTableSheet(['项目编号'], [['P-001']], {
      amountHeaderPredicate: (header) => header === '项目编号',
    });

    expect(sheet.A2.z).toBe('#,##0.00');
  });

  test('空数据只产出表头行', () => {
    const sheet = buildTableSheet(['项目编号'], []);

    expect(sheet.A1.v).toBe('项目编号');
    expect(sheet.A2).toBeUndefined();
  });
});

describe('excelExport > applyAmountFormat', () => {
  test('只对判定为金额的列、且已有单元格的行设置格式', () => {
    const sheet = buildTableSheet(['项目编号', '立项合计'], [['P-001', 100], ['P-002', null]]);
    applyAmountFormat(sheet, ['项目编号', '立项合计'], 2, (header) => header === '立项合计');

    expect(sheet.B2.z).toBe('#,##0.00');
    expect(sheet.B3?.z).toBeUndefined();
  });
});
