/**
 * 表头筛选与排序（Excel 风格）— 公共纯函数
 *
 * 与表格渲染解耦：列定义自带「筛选类型」`filter` 与「取值函数」`getFilterValue`，
 * 这里只负责统计、匹配与排序，便于单测直接覆盖。
 *
 * 语义（对齐 Excel 表头筛选）：
 * - 同一列内多选 = 或（OR）；不同列之间 = 与（AND）
 * - 计数与占比以「其他列筛选之后」的数据为基数，因此每列下拉永远反映当前可见数据
 * - 空值统一归入「(空白)」一项；`values: null` 表示未启用该列筛选，`values: []` 表示显式空选
 * - 数值列走条件筛选（等于/大于/介于…），不列举取值——金额几乎每行都不同，列举没有意义
 * - 空值在排序时恒定排在最后，不受升序/降序影响
 */

/** 列的筛选类型 */
export const ColumnFilterKind = {
  /** 可枚举取值：多选列表 + 计数 + 占比 */
  VALUE: 'value',
  /** 数值：条件筛选 */
  NUMBER: 'number',
  /** 不参与筛选（如「操作」列） */
  NONE: 'none',
};

/** 空值在筛选列表中的展示文案 */
export const BLANK_LABEL = '(空白)';

/** 数值筛选运算符 */
export const NumberOperator = {
  EQ: 'eq',
  NEQ: 'neq',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  BETWEEN: 'between',
};

/** 下拉里的运算符选项，数组顺序即展示顺序 */
export const NUMBER_OPERATOR_OPTIONS = [
  { value: NumberOperator.EQ, label: '等于' },
  { value: NumberOperator.NEQ, label: '不等于' },
  { value: NumberOperator.GT, label: '大于' },
  { value: NumberOperator.GTE, label: '大于等于' },
  { value: NumberOperator.LT, label: '小于' },
  { value: NumberOperator.LTE, label: '小于等于' },
  { value: NumberOperator.BETWEEN, label: '介于（含边界）' },
];

/** 排序方向 */
export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
};

/** 生成一列的空白筛选状态：values=null 表示未启用 */
export const createColumnFilter = () => ({
  values: null,
  operator: '',
  number: '',
  number2: '',
});

/** 取值归一化：去首尾空格，null / undefined → '' */
const normalizeValue = (value) => String(value ?? '').trim();

/** 数值解析：空串或非数字 → null（视为"未填写"） */
const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

/** 取某行在某列的筛选取值（缺取值函数时返回空串） */
export const getColumnFilterValue = (row, col) =>
  typeof col?.getFilterValue === 'function' ? col.getFilterValue(row) : '';

/** 数值筛选是否已填写（介于允许只填一端） */
const hasNumberFilter = (filter) => {
  if (!filter?.operator) return false;
  if (filter.operator === NumberOperator.BETWEEN) {
    return toNumber(filter.number) !== null || toNumber(filter.number2) !== null;
  }
  return toNumber(filter.number) !== null;
};

/** 该列筛选是否生效 */
export const isColumnFilterActive = (filter) => {
  if (!filter) return false;
  if (Array.isArray(filter.values)) return true;
  return hasNumberFilter(filter);
};

/** 生效的筛选列数，供工具栏展示与「清除筛选」按钮显隐 */
export const countActiveColumnFilters = (filters = {}) =>
  Object.values(filters || {}).filter(isColumnFilterActive).length;

/**
 * 统计某列的可选值与数量/占比
 * @param {Array} rows 统计基数（应当是「其他列筛选之后」的数据）
 * @param {Object} col  列定义
 * @returns {Array<{value: string, label: string, count: number, ratio: number}>}
 */
export const buildValueOptions = (rows = [], col) => {
  const counts = new Map();
  rows.forEach((row) => {
    const value = normalizeValue(getColumnFilterValue(row, col));
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  const total = rows.length;
  return [...counts.entries()]
    .map(([value, count]) => ({
      value,
      label: value === '' ? BLANK_LABEL : value,
      count,
      ratio: total > 0 ? count / total : 0,
    }))
    // 计数多的在前；同计数按值升序（数字/日期按自然序），保证列表稳定可预期
    .sort((a, b) =>
      b.count - a.count
      || String(a.value).localeCompare(String(b.value), 'zh-CN', { numeric: true }));
};

/** 占比展示：0 → 0%，不足 0.1% 保留提示，避免出现一排 0.0% */
export const formatRatio = (ratio) => {
  const percent = (Number(ratio) || 0) * 100;
  if (percent <= 0) return '0%';
  if (percent >= 99.95) return '100%';
  if (percent < 0.1) return '<0.1%';
  return `${percent.toFixed(1)}%`;
};

/** 单列匹配：取值多选（同列多选是 OR） */
const matchesValueFilter = (row, col, filter) => {
  if (!Array.isArray(filter.values)) return true;
  return filter.values.includes(normalizeValue(getColumnFilterValue(row, col)));
};

/** 单列匹配：数值条件 */
const matchesNumberFilter = (row, col, filter) => {
  const value = toNumber(getColumnFilterValue(row, col));
  if (value === null) return false;

  const first = toNumber(filter.number);
  const second = toNumber(filter.number2);

  switch (filter.operator) {
    case NumberOperator.EQ: return value === first;
    case NumberOperator.NEQ: return value !== first;
    case NumberOperator.GT: return value > first;
    case NumberOperator.GTE: return value >= first;
    case NumberOperator.LT: return value < first;
    case NumberOperator.LTE: return value <= first;
    // 介于：只填一端时退化为「大于等于」/「小于等于」
    case NumberOperator.BETWEEN:
      return (first === null || value >= first) && (second === null || value <= second);
    default: return true;
  }
};

/** 单列匹配入口（未启用则该行保留） */
export const matchesColumnFilter = (row, col, filter) => {
  if (!isColumnFilterActive(filter)) return true;
  if (col?.filter === ColumnFilterKind.NUMBER) return matchesNumberFilter(row, col, filter);
  return matchesValueFilter(row, col, filter);
};

/**
 * 按多列筛选记录（跨列 AND）
 * @param {Array}  rows       待筛选数据
 * @param {Object} filters    { [col.key]: 筛选状态 }
 * @param {Array}  columns    列定义
 * @param {string} excludeKey 需要忽略的列（下拉统计时排除自身列，才能重新勾选更多值）
 */
export const filterRowsByColumnFilters = (rows = [], filters = {}, columns = [], excludeKey = '') => {
  // 先收敛出真正生效的列，再单次遍历「所有生效列求交」。
  // 原实现逐列 filter：N 个生效列就要生成 N 个中间数组，千行级数据下是纯浪费。
  const activeColumns = columns.filter((col) =>
    col
    && col.key !== excludeKey
    && col.filter !== ColumnFilterKind.NONE
    && isColumnFilterActive(filters?.[col.key]));

  if (activeColumns.length === 0) return rows;
  return rows.filter((row) =>
    activeColumns.every((col) => matchesColumnFilter(row, col, filters[col.key])));
};

/** 排序取值是否为空 */
const isBlankValue = (value) => value === null || value === undefined || String(value).trim() === '';

/** 按单列排序；order 非法或列不存在时原样返回 */
export const sortRowsByColumn = (rows = [], col, order) => {
  if (!col || (order !== SortOrder.ASC && order !== SortOrder.DESC)) return rows;
  const factor = order === SortOrder.ASC ? 1 : -1;

  return [...rows].sort((a, b) => {
    const left = getColumnFilterValue(a, col);
    const right = getColumnFilterValue(b, col);
    const leftBlank = isBlankValue(left);
    const rightBlank = isBlankValue(right);

    // 空值恒排最后，避免切换升降序时空值在两端跳
    if (leftBlank || rightBlank) return leftBlank === rightBlank ? 0 : (leftBlank ? 1 : -1);
    if (col.filter === ColumnFilterKind.NUMBER) {
      return ((toNumber(left) ?? 0) - (toNumber(right) ?? 0)) * factor;
    }
    return String(left).localeCompare(String(right), 'zh-CN', { numeric: true }) * factor;
  });
};
