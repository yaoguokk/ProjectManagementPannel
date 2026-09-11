/**
 * Excel 导出公共能力 — 统一两处表格的导出实现
 *
 * 原先 D 区域在组件内直接 `json_to_sheet` + 手写金额格式，E 区域走 costData 的导出映射，
 * 列构建与金额格式各写一遍；这里收敛为「表头 + 二维数据」的通用入口。
 *
 * 约定：金额列导出为数值（便于在 Excel 里继续计算），并按 `#,##0.00` 设置单元格格式。
 */
import * as XLSX from 'xlsx';
import { isAmountColumn } from './tableModel';

/**
 * 构建工作表
 * @param {string[]} headers 表头（顺序即列顺序）
 * @param {Array<Array>} data 二维数据（与表头一一对应）
 * @param {{ amountHeaders?: string[], amountHeaderPredicate?: Function }} options
 *        amountHeaders 显式声明金额列；未声明时回退到 AMOUNT_COLUMN_KEYWORDS 判定
 * @returns {import('xlsx').WorkSheet}
 */
export const buildTableSheet = (headers = [], data = [], options = {}) => {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const { amountHeaders, amountHeaderPredicate } = options;
  const isAmount = amountHeaderPredicate || ((header) =>
    (Array.isArray(amountHeaders) && amountHeaders.includes(header)) || isAmountColumn(header));

  applyAmountFormat(worksheet, headers, data.length, isAmount);
  return worksheet;
};

/**
 * 为金额列设置数字格式 `#,##0.00`（原地修改 worksheet）
 * @param {Object} worksheet
 * @param {string[]} headers
 * @param {number} rowCount 数据行数（不含表头）
 * @param {Function} isAmount 判定表头是否金额列
 */
export const applyAmountFormat = (worksheet, headers = [], rowCount = 0, isAmount = isAmountColumn) => {
  headers.forEach((header, index) => {
    if (!isAmount(header)) return;

    const colLetter = XLSX.utils.encode_col(index);
    for (let row = 1; row <= rowCount; row += 1) {
      const cell = worksheet[`${colLetter}${row + 1}`];
      if (cell) cell.z = '#,##0.00';
    }
  });
};

/**
 * 导出并下载 Excel（浏览器端）
 * @param {{ headers: string[], data: Array<Array>, sheetName?: string, fileName: string, amountHeaders?: string[], amountHeaderPredicate?: Function }} config
 */
export const downloadTable = ({
  headers = [],
  data = [],
  sheetName = 'Sheet1',
  fileName = `导出_${new Date().toISOString().slice(0, 10)}.xlsx`,
  amountHeaders,
  amountHeaderPredicate,
} = {}) => {
  const worksheet = buildTableSheet(headers, data, { amountHeaders, amountHeaderPredicate });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
};

/** 日期后缀文件名（各区域导出命名一致） */
export const dateStamp = (prefix, label = '') =>
  `${prefix}${label ? `_${label}` : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`;
