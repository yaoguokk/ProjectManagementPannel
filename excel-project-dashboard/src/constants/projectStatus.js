/**
 * 项目状态常量定义
 * 消除魔法数字，统一使用常量引用
 */
export const ProjectStatus = {
  COMPLETED: '已完成',
  INCOMPLETE: '未完成',
  DELAYED: '已延期',
  IN_PROGRESS: '进行中',
  PAUSED: '已暂停'
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