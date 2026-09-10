/**
 * 业务部所展示方式
 *
 * 台账原始值随项目类型而异：
 * - 经营项目「业务部所」：`市场营销部`（本身就是部门名）
 * - 自筹项目「承接部门」：`南方电网数字电网研究院股份有限公司/南方电网传感科技（广东）有限公司/产品研发部`
 *
 * 因此提供「全部展示」与「仅部门」两种口径，后者按层级分隔符取最后一段，
 * 让自筹项目只看部门、不看公司前缀。
 */

/** 业务部所展示方式 */
export const DepartmentDisplay = {
  /** 原样展示台账值 */
  FULL: 'full',
  /** 仅展示最后一段部门名，忽略公司前缀 */
  LAST_SEGMENT: 'lastSegment',
};

/** 下拉选项，数组顺序即展示顺序 */
export const DEPARTMENT_DISPLAY_OPTIONS = [
  { label: '全部展示', value: DepartmentDisplay.FULL },
  { label: '仅部门', value: DepartmentDisplay.LAST_SEGMENT },
];

/** 部门层级分隔符：兼容半角与全角斜杠 */
const DEPARTMENT_SEPARATOR = /[/／]/;

/**
 * 按展示方式格式化业务部所
 * @param {string} value 台账原始值
 * @param {string} mode  DepartmentDisplay 之一
 * @returns {string} 展示文本；空值原样返回，避免吞掉调用方的占位逻辑
 */
export const formatDepartment = (value, mode = DepartmentDisplay.FULL) => {
  const text = String(value ?? '').trim();
  if (mode !== DepartmentDisplay.LAST_SEGMENT || !text) return value;

  const segments = text.split(DEPARTMENT_SEPARATOR).map((item) => item.trim()).filter(Boolean);
  // 形如 `A/B/` 的脏数据同样回退到最后一个有效片段
  return segments.length > 0 ? segments[segments.length - 1] : value;
};
