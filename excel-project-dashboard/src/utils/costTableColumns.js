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
 *
 * 表头筛选与排序同样由列定义驱动：每列声明 `filter`（筛选类型）与 `getFilterValue`（取值函数），
 * 下拉的计数/占比、数值条件、排序都复用同一个取值口径，保证"看到的即筛到的"。
 */
import { formatDepartment } from './departmentDisplay';
import { ColumnFilterKind } from './columnFilters';
import { isAmountColumn } from './tableModel';
import { extractColumnNames, getColumnValue, PROJECT_COLUMN_WIDTHS } from './projectTableColumns';

// 千行级下每个金额单元格都会调用，Intl 实例化开销明显，故复用模块级 formatter
const AMOUNT_FORMATTER = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });

/** 金额格式化：整数千分位 */
export const formatAmount = (value) => AMOUNT_FORMATTER.format(value || 0);

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
  { key: 'code', label: '项目编号', width: 160, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.projectCode },
  { key: 'name', label: '项目名称', width: 300, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.projectName },
  { key: 'manager', label: '项目经理', width: 100, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.manager },
  // 筛选取台账原值（与搜索口径一致）；「业务部所」展示方式只影响单元格文本
  { key: 'department', label: '业务部所', width: 220, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.department },
  // 项目类型：与 D 区域同名列同序，展示、表头筛选与导出都取台账原值（研究咨询类 / 产品销售类 等）；
  // 经营 / 自筹的内部口径只用于 B 区域顶部筛选，不在此展示
  { key: 'projectType', label: '项目类型', width: 100, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.projectTypeLabel },
  { key: 'planFinalDate', label: '计划终验时间', width: 140, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => row.planFinalDate },
];

/** 分类列之后的合计 / 状态列 */
const SUMMARY_COLUMNS = [
  { key: 'budgetTotal', label: '立项合计', align: 'right', width: 120, filter: ColumnFilterKind.NUMBER, getFilterValue: (row) => row.budgetTotal ?? 0 },
  { key: 'actualTotal', label: '实际合计', align: 'right', width: 120, filter: ColumnFilterKind.NUMBER, getFilterValue: (row) => row.actualTotal ?? 0 },
  { key: 'diffTotal', label: '差额合计', align: 'right', width: 120, filter: ColumnFilterKind.NUMBER, getFilterValue: (row) => row.diffTotal ?? 0 },
  {
    key: 'overCategories',
    label: '超支成本类型',
    width: 160,
    filter: ColumnFilterKind.VALUE,
    getFilterValue: (row) => (row.overCategories || []).join('、'),
  },
  // 筛选取值与单元格展示一致（超支 / 正常），避免"看到超支却筛不出来"
  { key: 'status', label: '状态', width: 100, filter: ColumnFilterKind.VALUE, getFilterValue: (row) => (row.hasOverBudget ? '超支' : '正常') },
];

/** 末列：操作（不参与表头筛选与导出，始终固定在最后） */
const ACTION_COLUMN = { key: 'action', label: '操作', width: 90, filter: ColumnFilterKind.NONE };

/** 取某行指定分类的数据，缺失时回退为零值，避免空分类导致渲染报错 */
const getCategoryItem = (row, categoryKey) =>
  (row.categories || []).find((item) => item.key === categoryKey)
  || { budget: 0, actual: 0, diff: 0, over: false };

/** 分类列三段的展示后缀 */
const KIND_LABELS = { budget: '立项', actual: '实际', diff: '差额' };

/** 每个成本分类展开为「立项 / 实际 / 差额」三列 */
const buildCategoryColumns = (categories = []) =>
  categories.flatMap((item) => ['budget', 'actual', 'diff'].map((kind) => ({
    key: `${item.key}-${kind}`,
    label: `${item.label}-${KIND_LABELS[kind]}`,
    kind,
    categoryKey: item.key,
    align: 'right',
    width: CATEGORY_COLUMN_WIDTH,
    filter: ColumnFilterKind.NUMBER,
    // 与单元格口径一致：缺失分类按 0 处理，否则筛「等于 0」会漏掉这些行
    getFilterValue: (row) => getCategoryItem(row, item.key)[kind] ?? 0,
  })));

/**
 * 成本行自身的派生字段：它们不是「项目清单」的列，需从台账列候选里排除。
 * 台账程序字段（id / projectCode / status …）由 utils/projectTableColumns 的 PROGRAM_FIELDS 排除。
 */
export const COST_ROW_FIELDS = [
  'categories', 'budgetTotal', 'actualTotal', 'diffTotal', 'overCategories',
  'categoryOver', 'overallOver', 'hasOverBudget',
  'projectTypeLabel', 'planFinalDate', 'actualFinalDate',
];

/** 项目清单列的 key 前缀：与成本列 key 天然隔离，避免同名冲突 */
const LEDGER_KEY_PREFIX = 'ledger:';

/**
 * 「项目清单」里的其余台账列（默认不勾选，可在列设置里启用）
 * 取值口径与 D 区域一致：优先 Excel 原列名，缺失时回退程序字段；
 * 金额列按 D 区域同款关键词规则判定（isAmountColumn），展示为千分位、筛选走数值条件。
 * @param {Array} rows       成本明细行（已透传台账原始列）
 * @param {Set}   usedLabels 成本列已占用的列名，避免列设置里出现重名项
 */
const buildLedgerColumns = (rows = [], usedLabels = new Set()) =>
  extractColumnNames(rows)
    .filter((name) => !COST_ROW_FIELDS.includes(name) && !usedLabels.has(name))
    .map((name) => {
      const amount = isAmountColumn(name);
      return {
        key: `${LEDGER_KEY_PREFIX}${name}`,
        label: name,
        ledger: true,
        ledgerName: name,
        align: amount ? 'right' : '',
        width: PROJECT_COLUMN_WIDTHS[name] ?? FALLBACK_COLUMN_WIDTH,
        filter: amount ? ColumnFilterKind.NUMBER : ColumnFilterKind.VALUE,
        // 与单元格展示同源：金额按数值筛选，其余按台账原值
        getFilterValue: (row) => {
          const raw = getColumnValue(row, name);
          return amount ? (Number(raw) || 0) : raw;
        },
      };
    });

/**
 * 生成完整列定义
 *
 * = 固定列 + 动态分类列 + 合计/状态列 + 「项目清单」其余台账列 + 操作列
 * 项目清单列只进列设置（默认不勾选），保证首次进入看到的仍是原来的成本列。
 * @param {Array} rows 成本明细行，取首行的 categories 作为列模板
 */
export const buildCostColumns = (rows = []) => {
  const categories = buildCategoryColumns(rows[0]?.categories);
  const usedLabels = new Set(
    [...HEAD_COLUMNS, ...categories, ...SUMMARY_COLUMNS, ACTION_COLUMN].map((col) => col.label)
  );

  return [
    ...HEAD_COLUMNS,
    ...categories,
    ...SUMMARY_COLUMNS,
    ...buildLedgerColumns(rows, usedLabels),
    ACTION_COLUMN,
  ];
};

/**
 * 默认展示的列（列设置里的「默认」与首次进入）= 成本列，不含「项目清单」列
 */
export const defaultCostColumnLabels = (columns = []) =>
  columns.filter((col) => !col.ledger).map((col) => col.label);

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

  // 「项目清单」列：直接取台账原值，金额列按金额口径展示
  if (col.ledger) {
    const raw = getColumnValue(row, col.ledgerName);

    if (isAmountColumn(col.ledgerName)) {
      return { key: col.key, text: formatAmount(Number(raw) || 0), cellClass: 'text-right text-gray-700' };
    }

    const text = raw === '' || raw === null || raw === undefined ? '-' : String(raw);
    return { key: col.key, text, title: text, cellClass: 'text-gray-600' };
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
    case 'projectType':
      // 台账原值口径，与表头筛选、导出保持一致（不走内部 projectType 的 经营 / 自筹）
      return { key: col.key, text: row.projectTypeLabel || '-', cellClass: 'text-gray-600' };
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
