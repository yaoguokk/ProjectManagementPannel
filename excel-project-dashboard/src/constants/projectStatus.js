/**
 * 项目状态常量定义
 * 所有值必须与 Excel 数据中的中文状态值精确匹配
 */
export const ProjectStatus = {
  PENDING_INITIAL: '待初验',
  PENDING_FINAL: '待终验',
  PENDING_SETTLEMENT: '待结算',
  SETTLED: '已结算',
};

/**
 * 项目类型常量定义
 */
export const ProjectType = {
  BUSINESS: '经营项目',
  SELF_FINANCED: '自筹项目',
  ALL: '全部'
};

/**
 * 日期范围类型常量
 */
export const DateRangeType = {
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
  CUSTOM: 'custom'
};

/**
 * Toast 类型常量
 */
export const ToastType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};