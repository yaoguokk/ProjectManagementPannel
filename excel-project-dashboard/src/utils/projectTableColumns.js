/**
 * D 区域（项目明细）表格列模型 — 纯函数
 *
 * 列集合由台账列名驱动（不同台账列可能不同），并固定追加两列日期 + 倒计时列，
 * 后者标记 `fixed: true`：它们在列设置里不可取消，与既有行为一致。
 */
import { FALLBACK_COLUMN_WIDTH } from './tableModel';

/** 默认展示的 Excel 列（页面默认勾选的 7 列） */
export const DEFAULT_PROJECT_COLUMNS = [
  '项目编号', '项目名称', '项目经理', '业务部所', '项目类型', '立项收入(元)', '项目状态',
];

/** 程序内部字段：不出现在列设置中 */
export const PROGRAM_FIELDS = [
  'id', 'projectCode', 'projectName', 'manager', 'department',
  'projectType', 'budget', 'planInitialDate', 'planFinalDate',
  'actualInitialDate', 'actualFinalDate', 'startDate', 'status',
];

/** 列默认宽度（含日期列与倒计时列，两个 Tab 共用） */
export const PROJECT_COLUMN_WIDTHS = {
  '项目编号': 160,
  '项目名称': 300,
  '项目经理': 100,
  '业务部所': 120,
  '项目类型': 100,
  '立项收入(元)': 140,
  '项目状态': 180,
  '计划初验时间': 140,
  '实际初验时间': 140,
  '计划终验时间': 140,
  '实际终验时间': 140,
  '验收倒计时': 140,
};

/** 列名 → 程序字段回退映射（自筹台账无「项目经理」「业务部所」列名，需回退） */
export const COLUMN_TO_FIELD = {
  '项目经理': 'manager',
  '业务部所': 'department',
};

/** Tab key → 中文标签（列名与导出文案共用） */
export const TAB_LABELS = { initial: '初验', final: '终验' };

/**
 * 从台账数据里提取所有可选列名（所有项目键的并集，剔除程序字段）
 * 保持首次出现的顺序，避免列设置里的顺序随数据抖动
 */
export const extractColumnNames = (projects = []) => {
  const keys = new Set();
  projects.forEach((project) => {
    Object.keys(project || {}).forEach((key) => {
      if (!PROGRAM_FIELDS.includes(key)) keys.add(key);
    });
  });
  return [...keys];
};

/** 取单元格原始值：优先 Excel 原列名，缺失时回退到程序字段 */
export const getColumnValue = (project, columnName) => {
  if (project?.[columnName] !== undefined) return project[columnName];
  const field = COLUMN_TO_FIELD[columnName];
  return field ? (project?.[field] || '') : '';
};

/**
 * 生成列模型
 * @param {{ columnNames?: string[], tab?: 'initial'|'final' }} options
 * @returns {Array} 列定义（Excel 列 + 固定日期列 + 固定倒计时列）
 */
export const buildProjectColumns = ({ columnNames = [], tab = 'initial' } = {}) => {
  const tabLabel = TAB_LABELS[tab] ?? TAB_LABELS.initial;

  return [
    ...columnNames.map((name) => ({
      key: name,
      label: name,
      width: PROJECT_COLUMN_WIDTHS[name] ?? FALLBACK_COLUMN_WIDTH,
    })),
    {
      key: `计划${tabLabel}时间`,
      label: `计划${tabLabel}时间`,
      width: PROJECT_COLUMN_WIDTHS[`计划${tabLabel}时间`] ?? FALLBACK_COLUMN_WIDTH,
      fixed: true,
      headerClass: '',
    },
    {
      key: `实际${tabLabel}时间`,
      label: `实际${tabLabel}时间`,
      width: PROJECT_COLUMN_WIDTHS[`实际${tabLabel}时间`] ?? FALLBACK_COLUMN_WIDTH,
      fixed: true,
      headerClass: '',
    },
    {
      key: '验收倒计时',
      label: '验收倒计时',
      width: PROJECT_COLUMN_WIDTHS['验收倒计时'] ?? FALLBACK_COLUMN_WIDTH,
      fixed: true,
      headerClass: '',
    },
  ];
};
