/**
 * 成本管控计算逻辑 — 全部为纯函数，便于单元测试
 *
 * 口径：以台账项目为主、支出合同为辅。
 * 统计对象 = 台账项目 WHERE 项目计划终验时间含变更 ∈ 日期范围
 */
import * as XLSX from 'xlsx';
import {
  ACTIVE_COST_CATEGORIES,
  COST_CATEGORIES,
  OverBudgetFilter,
} from '../constants/costCategory';
import { buildCostColumns } from '../utils/costTableColumns';
import { formatDepartment } from '../utils/departmentDisplay';

/**
 * 将 YYYY-MM-DD 解析为本地时间戳
 * 避免 new Date('YYYY-MM-DD') 按 UTC 解析导致的时区偏移
 */
const toLocalTimestamp = (dateStr) => {
  if (!dateStr) return NaN;
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return new Date(dateStr).getTime();
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
};

/** 判断日期字符串是否落在 [start, end] 区间内（含边界） */
const isDateInRange = (dateStr, dateRange) => {
  if (!dateStr || !dateRange?.start || !dateRange?.end) return false;
  const target = toLocalTimestamp(dateStr);
  if (Number.isNaN(target)) return false;
  return target >= toLocalTimestamp(dateRange.start) && target <= toLocalTimestamp(dateRange.end);
};

/** 构建「支出合同类型 → 成本分类 key」的索引表 */
const buildContractTypeIndex = () => {
  return new Map(
    COST_CATEGORIES
      .filter((category) => category.contractType)
      .map((category) => [category.contractType, category.key])
  );
};

/** 取成本行中某个分类的数据，缺省返回 0 值对象 */
const pickCategory = (row, key) => {
  return row.categories.find((item) => item.key === key) || { budget: 0, actual: 0, diff: 0 };
};

/**
 * 按项目编号构建支出合同索引（一次遍历，同时产出金额与明细）
 * 未纳入成本分类的支出合同类型（如「项目管理」「其他」）会被忽略
 * @param {Array} contracts - cleanContractData 的产物
 * @returns {{ amountMap: Map, detailMap: Map }}
 *   amountMap: Map<项目编号, { [分类key]: 金额 }>
 *   detailMap: Map<项目编号, { [分类key]: 合同明细数组 }>
 */
export const buildContractIndex = (contracts = []) => {
  const typeIndex = buildContractTypeIndex();
  const amountMap = new Map();
  const detailMap = new Map();

  contracts.forEach((contract) => {
    const categoryKey = typeIndex.get(contract.contractType);
    if (!categoryKey || !contract.projectCode) return;

    const bucket = amountMap.get(contract.projectCode) || {};
    bucket[categoryKey] = (bucket[categoryKey] || 0) + (contract.amount || 0);
    amountMap.set(contract.projectCode, bucket);

    const detailBucket = detailMap.get(contract.projectCode) || {};
    if (!detailBucket[categoryKey]) detailBucket[categoryKey] = [];
    detailBucket[categoryKey].push(contract);
    detailMap.set(contract.projectCode, detailBucket);
  });

  return { amountMap, detailMap };
};

/**
 * 按项目编号聚合支出合同金额
 * 等价于 buildContractIndex 的金额视图，保留原有签名以兼容既有调用与测试
 * @param {Array} contracts - cleanContractData 的产物
 * @returns {Map<string, Object>} Map<项目编号, { [分类key]: 金额 }>
 */
export const buildContractCostMap = (contracts = []) => buildContractIndex(contracts).amountMap;

/** 合同明细按事项金额倒序，便于第一眼看到主要支出 */
const sortContractsByAmount = (contracts = []) =>
  [...contracts].sort((a, b) => (b.amount || 0) - (a.amount || 0));

/** 计算单个项目的成本对比行 */
const buildCostRow = (project, contractMap, contractDetailMap = new Map()) => {
  const actualBucket = contractMap.get(project.projectCode) || {};
  const detailBucket = contractDetailMap.get(project.projectCode) || {};

  const categories = ACTIVE_COST_CATEGORIES.map((category) => {
    const budget = Number(project[category.projectField]) || 0;
    const actual = actualBucket[category.key] || 0;
    const diff = actual - budget;
    return {
      key: category.key,
      label: category.label,
      budget,
      actual,
      diff,
      over: diff > 0,
      // 该科目下的支出合同明细，供详情弹窗下钻
      contracts: sortContractsByAmount(detailBucket[category.key] || []),
    };
  });

  const budgetTotal = categories.reduce((sum, item) => sum + item.budget, 0);
  const actualTotal = categories.reduce((sum, item) => sum + item.actual, 0);
  const diffTotal = actualTotal - budgetTotal;
  const overCategories = categories.filter((item) => item.over).map((item) => item.label);

  return {
    id: project.id,
    projectCode: project.projectCode,
    projectName: project.projectName,
    manager: project.manager,
    department: project.department,
    // 内部口径（经营项目 / 自筹项目）：仅供 B 区域筛选与成本过滤使用，不参与展示
    projectType: project.projectType,
    // 台账原始「项目类型」列（研究咨询类 / 产品销售类 等）：E 区域展示、表头筛选与导出统一取此值
    projectTypeLabel: project['项目类型'] || '',
    planFinalDate: project.planFinalDate,
    actualFinalDate: project.actualFinalDate,
    categories,
    budgetTotal,
    actualTotal,
    diffTotal,
    overCategories,
    // 分类超支：任一成本类型实际 > 立项
    categoryOver: overCategories.length > 0,
    // 整体超支：各分类合计 实际 > 立项
    overallOver: diffTotal > 0,
    hasOverBudget: overCategories.length > 0 || diffTotal > 0,
  };
};

/** 汇总所有成本行 */
const summarize = (rows) => {
  const categoryTotals = ACTIVE_COST_CATEGORIES.map((category) => {
    const budget = rows.reduce((sum, row) => sum + pickCategory(row, category.key).budget, 0);
    const actual = rows.reduce((sum, row) => sum + pickCategory(row, category.key).actual, 0);
    return {
      key: category.key,
      label: category.label,
      budget,
      actual,
      diff: actual - budget,
      over: actual > budget,
    };
  });

  const totalBudget = rows.reduce((sum, row) => sum + row.budgetTotal, 0);
  const totalActual = rows.reduce((sum, row) => sum + row.actualTotal, 0);
  const overRows = rows.filter((row) => row.hasOverBudget);

  return {
    projectCount: rows.length,
    totalBudget,
    totalActual,
    totalDiff: totalActual - totalBudget,
    overProjectCount: overRows.length,
    overAmount: rows.reduce((sum, row) => sum + Math.max(0, row.diffTotal), 0),
    overRate: rows.length > 0 ? Math.round((overRows.length / rows.length) * 100) : 0,
    categoryTotals,
  };
};

/**
 * 成本对比分析
 * @param {Array}  projects  - 台账项目（含立项成本列）
 * @param {Array}  contracts - 支出合同事项
 * @param {Object} filters   - { dateRange: { start, end }, projectType }
 * @returns {{ rows: Array, summary: Object }}
 */
export const calculateCostAnalysis = (projects = [], contracts = [], filters = {}) => {
  const { dateRange = {}, projectType = '全部' } = filters;
  const { amountMap, detailMap } = buildContractIndex(contracts);

  const rows = projects
    .filter((project) => projectType === '全部' || project.projectType === projectType)
    .filter((project) => isDateInRange(project.planFinalDate, dateRange))
    .map((project) => buildCostRow(project, amountMap, detailMap));

  return { rows, summary: summarize(rows) };
};

/** 按超支状态筛选明细行 */
export const filterCostRows = (rows = [], mode = OverBudgetFilter.ALL) => {
  if (mode === OverBudgetFilter.OVER) return rows.filter((row) => row.hasOverBudget);
  if (mode === OverBudgetFilter.NORMAL) return rows.filter((row) => !row.hasOverBudget);
  return rows;
};

/**
 * 表格列名 → 导出表头 + 取值函数
 * 未登记的列（如「操作」）不参与导出；金额列导出为数值，便于在 Excel 中继续计算
 * 取值函数第二参数为导出选项（如 departmentMode），便于导出与表格展示保持一致
 */
const FIXED_EXPORT_COLUMNS = {
  '项目编号': { header: '项目编号', get: (row) => row.projectCode },
  '项目名称': { header: '项目名称', get: (row) => row.projectName },
  '项目经理': { header: '项目经理', get: (row) => row.manager },
  '业务部所': { header: '业务部所', get: (row, options) => formatDepartment(row.department, options.departmentMode) },
  // 与表格展示同口径：导出台账原始「项目类型」，缺失时与单元格一致显示 '-'
  '项目类型': { header: '项目类型', get: (row) => row.projectTypeLabel || '-' },
  '计划终验时间': { header: '计划终验时间', get: (row) => row.planFinalDate },
  '立项合计': { header: '立项成本合计', get: (row) => row.budgetTotal },
  '实际合计': { header: '实际支出合计', get: (row) => row.actualTotal },
  '差额合计': { header: '差额合计', get: (row) => row.diffTotal },
  '超支成本类型': { header: '超支成本类型', get: (row) => row.overCategories.join('、') || '-' },
  '状态': { header: '是否超支', get: (row) => (row.hasOverBudget ? '超支' : '正常') },
};

/** 分类列后缀 → 行数据字段名 / 导出表头后缀 */
const CATEGORY_FIELD_BY_SUFFIX = { '立项': 'budget', '实际': 'actual', '差额': 'diff' };
const CATEGORY_HEADER_BY_FIELD = { budget: '立项成本', actual: '实际支出', diff: '差额' };

/**
 * 分类列名形如「项目分包费-立项」，解析为导出表头与取值函数
 * @param {string} label      表格列名
 * @param {Array}  categories 首行的分类数据，用于确定分类 key
 */
const resolveCategoryExportColumn = (label, categories = []) => {
  const matched = /^(.+)-(立项|实际|差额)$/.exec(label);
  if (!matched) return null;

  const [, categoryLabel, suffix] = matched;
  const field = CATEGORY_FIELD_BY_SUFFIX[suffix];
  const category = categories.find((item) => item.label === categoryLabel);
  if (!category) return null;

  return {
    header: `${categoryLabel}-${CATEGORY_HEADER_BY_FIELD[field]}`,
    get: (row) => {
      const item = row.categories.find((entry) => entry.key === category.key);
      return item ? item[field] : 0;
    },
  };
};

/**
 * 构建导出用的表头与数据（纯函数，便于单测）
 * 导出列与表格可见列保持一致，实现「所见即所得」
 * @param {Array}  rows         成本明细行
 * @param {Array}  columnLabels 需要导出的列名；缺省时导出全部列
 * @param {Object} options      导出选项，如 { departmentMode } 控制业务部所口径
 */
export const buildCostExportTable = (rows = [], columnLabels, options = {}) => {
  const categories = rows[0]?.categories || [];
  const labels = columnLabels?.length
    ? columnLabels
    : buildCostColumns(rows).map((col) => col.label);

  const columns = labels
    .map((label) => FIXED_EXPORT_COLUMNS[label] || resolveCategoryExportColumn(label, categories))
    .filter(Boolean);

  return {
    headers: columns.map((column) => column.header),
    data: rows.map((row) => columns.map((column) => column.get(row, options))),
  };
};

/** 导出成本对比明细为 Excel 文件（导出列跟随表格当前可见列，业务部所跟随当前展示方式） */
export const downloadCostAnalysis = (rows, fileName, columnLabels, options) => {
  const { headers, data } = buildCostExportTable(rows, columnLabels, options);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '成本对比');
  XLSX.writeFile(
    workbook,
    fileName || `成本对比明细_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};
