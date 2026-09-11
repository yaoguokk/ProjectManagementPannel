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
  ContractRuleMode,
  DEFAULT_CONTRACT_MATCH_FIELDS,
  OverBudgetFilter,
  normalizeKeywords,
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

/** 关键词规则允许匹配的字段；未配置时回退到默认三列 */
const resolveMatchFields = (rule) => {
  const fields = rule?.matchFields;
  return Array.isArray(fields) && fields.length > 0 ? fields : DEFAULT_CONTRACT_MATCH_FIELDS;
};

/** 关键词归一化后仍有值才算规则生效；未生效时行为回到「仅按支出合同类型统计」 */
const isRuleActive = (rule) => normalizeKeywords(rule?.keywords).length > 0;

/**
 * 判断单条合同是否命中关键词规则（命中 = 任一匹配列包含任一关键词）
 * 多列之间取「或」关系：合同名称 / 事项名称 / 合同内容简述 任一命中即算命中
 * 刻意不使用正则，规避用户输入造成的非法正则
 * @param {Object} contract - cleanContractData 的产物
 * @param {Object} rule     - { keywords, matchFields }
 * @returns {boolean}
 */
export const matchesContractRule = (contract, rule) => {
  if (!isRuleActive(rule)) return false;

  const keywords = normalizeKeywords(rule.keywords).map((keyword) => keyword.toLowerCase());
  return resolveMatchFields(rule).some((field) => {
    const text = String(contract?.[field] ?? '').toLowerCase();
    return text !== '' && keywords.some((keyword) => text.includes(keyword));
  });
};

/**
 * 按规则模式决定合同是否计入该分类
 * exclude：命中关键词的剔除（默认口径）；include：只保留命中关键词的
 */
const shouldKeepContract = (contract, rule) => {
  if (!isRuleActive(rule)) return true;

  const matched = matchesContractRule(contract, rule);
  return rule.mode === ContractRuleMode.INCLUDE ? matched : !matched;
};

/** 分类口径统计（供界面展示「剔除 N 行 / M 元」） */
const createRuleStats = (rule) => ({
  total: 0,
  kept: 0,
  keptAmount: 0,
  excluded: 0,
  excludedAmount: 0,
  mode: rule?.mode === ContractRuleMode.INCLUDE ? ContractRuleMode.INCLUDE : ContractRuleMode.EXCLUDE,
  keywords: normalizeKeywords(rule?.keywords),
});

/** 取成本行中某个分类的数据，缺省返回 0 值对象 */
const pickCategory = (row, key) => {
  return row.categories.find((item) => item.key === key) || { budget: 0, actual: 0, diff: 0 };
};

/**
 * 按项目编号构建支出合同索引（一次遍历，同时产出金额与明细）
 * 未纳入成本分类的支出合同类型（如「项目管理」「其他」）会被忽略
 * @param {Array} contracts - cleanContractData 的产物
 * 命中分类后先按分类的关键词规则二次判定，被剔除的合同不计金额、不进明细，
 * 保证图表、明细表、超支下钻与导出四处口径一致
 * @param {Array}  contracts     - cleanContractData 的产物
 * @param {Object} contractRules - { [分类key]: { mode, keywords, matchFields } }，缺省表示不做关键词过滤
 * @returns {{ amountMap: Map, detailMap: Map, ruleStats: Object }}
 *   amountMap: Map<项目编号, { [分类key]: 金额 }>
 *   detailMap: Map<项目编号, { [分类key]: 合同明细数组 }>
 *   ruleStats: { [分类key]: { total, kept, excluded, excludedAmount, mode, keywords } }
 */
export const buildContractIndex = (contracts = [], contractRules = {}) => {
  const typeIndex = buildContractTypeIndex();
  const amountMap = new Map();
  const detailMap = new Map();
  // 只对配置了规则的分类统计口径，未配置的分类不产生额外开销
  const ruleStats = {};

  contracts.forEach((contract) => {
    const categoryKey = typeIndex.get(contract.contractType);
    if (!categoryKey || !contract.projectCode) return;

    const rule = contractRules?.[categoryKey];
    if (rule) {
      const stats = ruleStats[categoryKey] || (ruleStats[categoryKey] = createRuleStats(rule));
      stats.total += 1;

      if (!shouldKeepContract(contract, rule)) {
        stats.excluded += 1;
        stats.excludedAmount += contract.amount || 0;
        return;
      }
      stats.kept += 1;
      stats.keptAmount += contract.amount || 0;
    }

    const bucket = amountMap.get(contract.projectCode) || {};
    bucket[categoryKey] = (bucket[categoryKey] || 0) + (contract.amount || 0);
    amountMap.set(contract.projectCode, bucket);

    const detailBucket = detailMap.get(contract.projectCode) || {};
    if (!detailBucket[categoryKey]) detailBucket[categoryKey] = [];
    detailBucket[categoryKey].push(contract);
    detailMap.set(contract.projectCode, detailBucket);
  });

  return { amountMap, detailMap, ruleStats };
};

/**
 * 按项目编号聚合支出合同金额
 * 等价于 buildContractIndex 的金额视图，保留原有签名以兼容既有调用与测试
 * @param {Array}  contracts     - cleanContractData 的产物
 * @param {Object} contractRules - 同 buildContractIndex，缺省表示不做关键词过滤
 * @returns {Map<string, Object>} Map<项目编号, { [分类key]: 金额 }>
 */
export const buildContractCostMap = (contracts = [], contractRules = {}) =>
  buildContractIndex(contracts, contractRules).amountMap;

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

/** 项目类型空值统一为 '-'，与明细表「项目类型」列、导出口径一致 */
const BLANK_TYPE_LABEL = '-';

/**
 * 按台账「项目类型」聚合超支情况（纯函数，便于单测）
 * 口径与 summarize 其余字段完全一致：超支行取 hasOverBudget，超支金额只累加正差额
 * 排序刻意稳定：超支项目数降序 → 超支金额降序 → 类型名中文自然序，避免筛选变化时横轴抖动
 * @param {Array} rows 成本明细行
 * @returns {Array<{label: string, total: number, overProjectCount: number, overAmount: number, overRate: number}>}
 */
const summarizeByProjectType = (rows = []) => {
  const buckets = new Map();

  rows.forEach((row) => {
    const label = row.projectTypeLabel || BLANK_TYPE_LABEL;
    const bucket = buckets.get(label) || { label, total: 0, overProjectCount: 0, overAmount: 0 };

    bucket.total += 1;
    if (row.hasOverBudget) {
      bucket.overProjectCount += 1;
      bucket.overAmount += Math.max(0, row.diffTotal);
    }
    buckets.set(label, bucket);
  });

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      overRate: bucket.total > 0 ? Math.round((bucket.overProjectCount / bucket.total) * 100) : 0,
    }))
    .sort((a, b) =>
      b.overProjectCount - a.overProjectCount
      || b.overAmount - a.overAmount
      || a.label.localeCompare(b.label, 'zh-CN', { numeric: true }));
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
    // 按台账「项目类型」聚合的超支情况，供 E 区域超支分布图消费
    typeTotals: summarizeByProjectType(rows),
    categoryTotals,
  };
};

/**
 * 成本对比分析
 * @param {Array}  projects  - 台账项目（含立项成本列）
 * @param {Array}  contracts - 支出合同事项
 * @param {Object} filters   - { dateRange: { start, end }, projectType }
 * @param {Object} options   - { contractRules } 分类关键词规则，缺省表示不做关键词过滤
 * @returns {{ rows: Array, summary: Object, ruleStats: Object }}
 */
export const calculateCostAnalysis = (projects = [], contracts = [], filters = {}, options = {}) => {
  const { dateRange = {}, projectType = '全部' } = filters;
  const { amountMap, detailMap, ruleStats } = buildContractIndex(contracts, options.contractRules || {});

  const rows = projects
    .filter((project) => projectType === '全部' || project.projectType === projectType)
    .filter((project) => isDateInRange(project.planFinalDate, dateRange))
    .map((project) => buildCostRow(project, amountMap, detailMap));

  return { rows, summary: summarize(rows), ruleStats };
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
