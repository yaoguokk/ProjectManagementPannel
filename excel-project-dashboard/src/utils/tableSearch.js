/**
 * 表格关键词搜索 — 公共纯函数
 *
 * D 区域（项目明细）与 E 区域（成本管控）共用同一套搜索语义：
 * - 基础搜索 / 全局搜索 两种范围
 * - 多个关键词用逗号、顿号、分号或换行分隔
 * - 任意关键词（或）/ 全部关键词（与）两种匹配方式
 */

/** 搜索范围 */
export const SearchMode = {
  BASIC: 'basic',
  GLOBAL: 'global',
};

/** 多关键词匹配方式 */
export const SearchMatchMode = {
  ANY: 'any',
  ALL: 'all',
};

/** 关键词分隔符：逗号、顿号、分号、换行 */
const TERM_SEPARATOR = /[,，、;；\n]+/;

/** 归一化：转字符串、去首尾空格、小写（中文不受影响） */
export const normalizeSearchText = (value) =>
  String(value ?? '').trim().toLocaleLowerCase('zh-CN');

/** 解析关键词串为词条数组，空串返回空数组 */
export const parseSearchTerms = (value) =>
  String(value ?? '')
    .split(TERM_SEPARATOR)
    .map(normalizeSearchText)
    .filter(Boolean);

/**
 * 判断单条记录是否命中搜索条件
 * @param {*}      record
 * @param {Object}   options
 * @param {string}   options.query          原始关键词串
 * @param {string}   options.mode           搜索范围：basic | global
 * @param {string}   options.matchMode      匹配方式：any | all
 * @param {Function} options.getBasicValues 基础搜索取值 (record) => Array
 * @param {Function} options.getGlobalValues 全局搜索取值 (record) => Array
 * @returns {boolean}
 */
export const matchesSearchQuery = (record, options = {}) => {
  const {
    query,
    mode = SearchMode.BASIC,
    matchMode = SearchMatchMode.ANY,
    getBasicValues,
    getGlobalValues,
  } = options;

  const terms = parseSearchTerms(query);
  if (terms.length === 0) return true;

  const pickValues = mode === SearchMode.GLOBAL ? getGlobalValues : getBasicValues;
  const values = (typeof pickValues === 'function' ? pickValues(record) : []) || [];
  const normalizedValues = values.map(normalizeSearchText);

  const matchesTerm = (term) => normalizedValues.some((value) => value.includes(term));

  return matchMode === SearchMatchMode.ALL
    ? terms.every(matchesTerm)
    : terms.some(matchesTerm);
};

/** 按搜索条件过滤记录集合 */
export const filterBySearchQuery = (records = [], options = {}) =>
  records.filter((record) => matchesSearchQuery(record, options));

/** 取对象全部字段值（可排除指定字段），供「全局搜索」使用 */
export const pickAllValues = (record, excludeKeys = []) =>
  Object.entries(record || {})
    .filter(([key]) => !excludeKeys.includes(key))
    .map(([, value]) => value);
