/**
 * 全局筛选条件 ↔ URL query 的纯函数转换
 *
 * 为什么独立成文件：URL 同步（App.vue 里的 watch）不好在 jsdom 下断言，
 * 拆成纯函数后可以直接单测「编码 / 解码 / 非法值回退」，组件只做编排。
 *
 * 约定：
 * - 只写「非默认值」，默认状态 URL 保持干净（#/cost 而不是一堆参数）。
 * - 解码时非法值一律回退默认值，脏参数不会进入 store。
 */
import { DateRangeType, ProjectType } from '../constants/projectStatus';

/** query 参数名（集中一处，避免组件里散落魔法字符串） */
export const FILTER_QUERY_KEYS = {
  projectType: 'type',
  start: 'start',
  end: 'end',
  rangeType: 'range',
};

const VALID_PROJECT_TYPES = [ProjectType.ALL, ProjectType.BUSINESS, ProjectType.SELF_FINANCED];
const VALID_RANGE_TYPES = [
  DateRangeType.MONTH,
  DateRangeType.QUARTER,
  DateRangeType.YEAR,
  DateRangeType.CUSTOM,
];

/** YYYY-MM-DD */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** query 值可能是数组（?type=a&type=b），统一取第一个 */
const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

/**
 * 筛选条件 → URL query（只包含与默认值不同的项）
 * @param {object} filters 当前筛选条件
 * @param {object} defaults 默认筛选条件（createDefaultFilters() 的结果）
 * @returns {object} route.query 形态的对象
 */
export const encodeFilterQuery = (filters = {}, defaults = {}) => {
  const query = {};
  const range = filters.dateRange || {};
  const defaultRange = defaults.dateRange || {};

  if (filters.projectType && filters.projectType !== defaults.projectType) {
    query[FILTER_QUERY_KEYS.projectType] = filters.projectType;
  }
  if (range.start && range.start !== defaultRange.start) {
    query[FILTER_QUERY_KEYS.start] = range.start;
  }
  if (range.end && range.end !== defaultRange.end) {
    query[FILTER_QUERY_KEYS.end] = range.end;
  }
  if (range.type && range.type !== defaultRange.type) {
    query[FILTER_QUERY_KEYS.rangeType] = range.type;
  }
  return query;
};

/**
 * URL query → 筛选条件（缺省 / 非法项一律回退默认值）
 * @param {object} query route.query
 * @param {object} defaults 默认筛选条件
 */
export const decodeFilterQuery = (query = {}, defaults = {}) => {
  const defaultRange = defaults.dateRange || {};
  const range = { ...defaultRange };

  const start = firstValue(query[FILTER_QUERY_KEYS.start]);
  const end = firstValue(query[FILTER_QUERY_KEYS.end]);
  const rangeType = firstValue(query[FILTER_QUERY_KEYS.rangeType]);

  if (DATE_PATTERN.test(start || '')) range.start = start;
  if (DATE_PATTERN.test(end || '')) range.end = end;

  if (VALID_RANGE_TYPES.includes(rangeType)) {
    range.type = rangeType;
  } else if (
    rangeType === undefined &&
    (range.start !== defaultRange.start || range.end !== defaultRange.end)
  ) {
    // 只带了自定义日期、没带 range 时按「自定义」处理，否则日期会被当成默认口径
    range.type = DateRangeType.CUSTOM;
  }

  const projectType = firstValue(query[FILTER_QUERY_KEYS.projectType]);

  return {
    projectType: VALID_PROJECT_TYPES.includes(projectType)
      ? projectType
      : defaults.projectType || ProjectType.ALL,
    dateRange: range,
  };
};

/**
 * 构造「保留筛选条件」的站内跳转目标
 *
 * 为什么单独立一个函数：筛选条件以 URL query 为唯一来源（见 useFilterQuerySync），
 * 站内跳转若不带 query，就等于把筛选条件重置成默认值——典型症状是「自定义时间范围后
 * 切个页面就回到年初至本月」。所有站内跳转统一走这里，避免以后再漏。
 *
 * @param {{ name: string }} target 目标路由（name 形式）
 * @param {object}          query  当前 route.query
 */
export const navLocation = (target, query) => ({ ...target, query: query || {} });

/** 两组筛选条件是否等价（用于打断「URL ↔ store」的互相触发） */
export const filtersEqual = (a = {}, b = {}) => {
  const rangeA = a.dateRange || {};
  const rangeB = b.dateRange || {};
  return (
    a.projectType === b.projectType &&
    rangeA.start === rangeB.start &&
    rangeA.end === rangeB.end &&
    rangeA.type === rangeB.type
  );
};

/** 两个 query 对象是否等价（浅比较，值统一按字符串比较） */
export const queryEquals = (a = {}, b = {}) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = firstValue(a[key]);
    const right = firstValue(b[key]);
    if (String(left === undefined || left === null ? '' : left) !== String(right === undefined || right === null ? '' : right)) {
      return false;
    }
  }
  return true;
};
