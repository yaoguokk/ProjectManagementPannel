/**
 * E 区域（成本管控）成本明细表 — 列模型与单元格构造
 *
 * 列集合由数据驱动：成本分类可能随合同台账变化，新增分类后表格自动扩展，
 * 因此这里用「固定列 + 动态分类列」的方式拼装，而不是写死表头。
 *
 * 单元格内容与样式统一在此生成（返回纯数据），组件只负责渲染，
 * 便于单测覆盖且让表格结构与其可见列解耦。
 *
 * 列宽也随列定义一起给出，供表格的列宽拖拽取默认值。
 */
import { formatDepartment } from './departmentDisplay';

/** 金额格式化：整数千分位 */
export const formatAmount = (value) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value || 0);

/** 差额格式化：正数补 `+` 号，便于一眼识别超支 */
export const formatDiff = (value) => {
  const amount = value || 0;
  return `${amount > 0 ? '+' : ''}${formatAmount(amount)}`;
};

/** 动态分类列的统一默认宽度（px） */
const CATEGORY_COLUMN_WIDTH = 110;

/** 未声明宽度的列兜底宽度（px） */
export const FALLBACK_COLUMN_WIDTH = 120;

/** 分类列之前的固定列 */
const HEAD_COLUMNS = [
  { key: 'code', label: '项目编号', width: 160 },
  { key: 'name', label: '项目名称', width: 300 },
  { key: 'manager', label: '项目经理', width: 100 },
  { key: 'department', label: '业务部所', width: 220 },
  { key: 'planFinalDate', label: '计划终验时间', width: 140 },
];

/** 分类列之后的固定列 */
const TAIL_COLUMNS = [
  { key: 'budgetTotal', label: '立项合计', align: 'right', width: 120 },
  { key: 'actualTotal', label: '实际合计', align: 'right', width: 120 },
  { key: 'diffTotal', label: '差额合计', align: 'right', width: 120 },
  { key: 'overCategories', label: '超支成本类型', width: 160 },
  { key: 'status', label: '状态', width: 100 },
  { key: 'action', label: '操作', width: 90 },
];

/** 每个成本分类展开为「立项 / 实际 / 差额」三列 */
const buildCategoryColumns = (categories = []) =>
  categories.flatMap((item) => [
    { key: `${item.key}-budget`, label: `${item.label}-立项`, kind: 'budget', categoryKey: item.key, align: 'right', width: CATEGORY_COLUMN_WIDTH },
    { key: `${item.key}-actual`, label: `${item.label}-实际`, kind: 'actual', categoryKey: item.key, align: 'right', width: CATEGORY_COLUMN_WIDTH },
    { key: `${item.key}-diff`, label: `${item.label}-差额`, kind: 'diff', categoryKey: item.key, align: 'right', width: CATEGORY_COLUMN_WIDTH },
  ]);

/**
 * 生成完整列定义
 * @param {Array} rows 成本明细行，取首行的 categories 作为列模板
 */
export const buildCostColumns = (rows = []) => [
  ...HEAD_COLUMNS,
  ...buildCategoryColumns(rows[0]?.categories),
  ...TAIL_COLUMNS,
];

/** 取某行指定分类的数据，缺失时回退为零值，避免空分类导致渲染报错 */
const getCategoryItem = (row, categoryKey) =>
  (row.categories || []).find((item) => item.key === categoryKey)
  || { budget: 0, actual: 0, diff: 0, over: false };

/** 固定列中需要「超支标红」的列 */
const OVER_STYLE = 'text-right font-semibold text-red-600';
const NORMAL_STYLE = 'text-right font-semibold text-gray-500';

/**
 * 生成单元格的展示内容与样式
 * @param {Object} row     成本明细行
 * @param {Object} col     列定义
 * @param {Object} options { departmentMode } 业务部所展示方式
 * @returns {{key: string, text?: string, type?: string, title?: string, cellClass: string}}
 */
export const buildCostCell = (row, col, options = {}) => {
  if (col.categoryKey) {
    const item = getCategoryItem(row, col.categoryKey);

    if (col.kind === 'diff') {
      return {
        key: col.key,
        text: formatDiff(item.diff),
        cellClass: item.over ? OVER_STYLE : NORMAL_STYLE,
      };
    }

    return {
      key: col.key,
      text: formatAmount(item[col.kind]),
      cellClass: 'text-right text-gray-700',
    };
  }

  switch (col.key) {
    case 'code':
      return { key: col.key, text: row.projectCode, cellClass: 'text-gray-700' };
    case 'name':
      return {
        key: col.key,
        text: row.projectName,
        title: row.projectName,
        cellClass: 'max-w-xs truncate text-gray-700',
      };
    case 'manager':
      return { key: col.key, text: row.manager, cellClass: 'text-gray-600' };
    case 'department':
      // 展示方式只影响显示，不影响搜索取值口径（搜索始终用台账原值）
      return {
        key: col.key,
        text: formatDepartment(row.department, options.departmentMode),
        cellClass: 'text-gray-600',
      };
    case 'planFinalDate':
      return { key: col.key, text: row.planFinalDate || '-', cellClass: 'text-gray-600' };
    case 'budgetTotal':
      return { key: col.key, text: formatAmount(row.budgetTotal), cellClass: 'text-right text-gray-700' };
    case 'actualTotal':
      return { key: col.key, text: formatAmount(row.actualTotal), cellClass: 'text-right text-gray-700' };
    case 'diffTotal':
      return {
        key: col.key,
        text: formatDiff(row.diffTotal),
        cellClass: row.overallOver ? OVER_STYLE : NORMAL_STYLE,
      };
    case 'overCategories':
      return { key: col.key, text: row.overCategories.join('、') || '-', cellClass: 'text-gray-600' };
    case 'status':
      return { key: col.key, type: 'status', cellClass: 'text-center' };
    case 'action':
      return { key: col.key, type: 'action', cellClass: 'text-center' };
    default:
      return { key: col.key, text: '', cellClass: 'text-gray-700' };
  }
};
