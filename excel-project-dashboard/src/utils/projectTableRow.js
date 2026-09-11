/**
 * D 区域（项目明细）行 → 单元格模型 — 纯函数
 *
 * 表格内核（DataTable）只认 `{ key, text, type, title, cellClass }`，
 * 特殊单元格通过 type 匹配插槽（link / status / countdown），
 * 这里顺带把渲染所需的数据（红绿灯、倒计时、状态样式）算好，避免模板里重复计算。
 */
import { createCell, isAmountColumn } from './tableModel';
import { COLUMN_TO_FIELD, getColumnValue, TAB_LABELS } from './projectTableColumns';

/**
 * 金额格式化：整数千分位
 * 千行级下每行都会调用，Intl 实例化开销明显，因此复用模块级 formatter
 */
const CURRENCY_FORMATTER = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 金额格式化：0 与空值展示 0，避免出现 NaN */
export const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return '0';
  return CURRENCY_FORMATTER.format(amount);
};

/** 项目状态标签样式 */
export const getStatusClass = (status) => {
  switch (status) {
    case '已结算':
      return 'status-completed';
    case '待初验':
    case '待终验':
    case '待结算':
      return 'status-pending';
    default:
      return '';
  }
};

/** 本地时间解析，避免 YYYY-MM-DD 被按 UTC 解析产生时区偏移 */
export const parseLocalDate = (dateStr) => {
  const parts = String(dateStr || '').split('-');
  return new Date(+parts[0], parts[1] - 1, +parts[2]);
};

/** 距计划验收日剩余天数（负数为超期） */
export const getDaysRemaining = (planDate) => {
  if (!planDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((parseLocalDate(planDate) - today) / (1000 * 60 * 60 * 24));
};

/** 倒计时颜色：≤7 天红、≤30 天黄、其余绿 */
export const getCountdownColor = (days) => {
  if (days === null) return '';
  if (days <= 7) return 'red';
  if (days <= 30) return 'yellow';
  return 'green';
};

export const getCountdownText = (days) => {
  if (days === null) return '—';
  if (days < 0) return `超期${Math.abs(days)}天`;
  if (days === 0) return '今天';
  return `${days}天`;
};

/** 导出用倒计时文案（基于导出当天计算） */
export const getCountdownExport = (planDate, actualDate) => {
  if (actualDate) return '已验收';
  if (!planDate) return '—';
  return getCountdownText(getDaysRemaining(planDate));
};

/**
 * 验收红绿灯：已验收 / 已滞后 / 预警 / 低风险
 * @param {Object} project
 * @param {'initial'|'final'} tab
 */
export const getTrafficLight = (project, tab = 'initial') => {
  const planDate = tab === 'initial' ? project.planInitialDate : project.planFinalDate;
  const actualDate = tab === 'initial' ? project.actualInitialDate : project.actualFinalDate;

  if (!planDate) return null;
  if (actualDate) return { label: '已完成', cssClass: 'traffic-completed' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plan = parseLocalDate(planDate);
  const threeMonthsBefore = new Date(plan);
  threeMonthsBefore.setMonth(threeMonthsBefore.getMonth() - 3);

  if (today >= plan) return { label: '已滞后', cssClass: 'traffic-delayed' };
  if (today >= threeMonthsBefore) return { label: '预警', cssClass: 'traffic-pending' };
  return { label: '低风险', cssClass: 'traffic-completed' };
};

/** 单个阶段的倒计时展示数据（供模板直接渲染） */
const buildCountdownPhase = (planDate, actualDate) => {
  if (actualDate) return { state: 'done' };
  if (!planDate) return { state: 'na' };
  const days = getDaysRemaining(planDate);
  return {
    state: 'pending',
    color: getCountdownColor(days),
    text: getCountdownText(days),
  };
};

/** 该行所属的 Tab 标签（计划/实际日期列的列名由此决定） */
export const tabLabelOf = (tab) => TAB_LABELS[tab] ?? TAB_LABELS.initial;

/**
 * 行 → 行模型
 * @param {Object} project 台账项目行
 * @param {{ columns: Array, tab: 'initial'|'final' }} context 当前列模型与 Tab
 */
export const buildProjectRow = (project, { columns = [], tab = 'initial' } = {}) => {
  const statusText = project['项目状态'] || project.status || '';

  const cells = columns.map((col) => {
    switch (col.key) {
      case '验收倒计时':
        return {
          ...createCell({ key: col.key, type: 'countdown', cellClass: 'countdown-cell' }),
          countdown: {
            initial: buildCountdownPhase(project.planInitialDate, project.actualInitialDate),
            final: buildCountdownPhase(project.planFinalDate, project.actualFinalDate),
          },
        };

      case '项目名称':
        return {
          ...createCell({
            key: col.key,
            text: project['项目名称'] || project.projectName || '',
            title: project['项目名称'] || project.projectName || '',
            type: 'link',
            cellClass: 'col-project-name',
          }),
          projectId: project.id,
        };

      case '项目状态':
        return {
          ...createCell({ key: col.key, type: 'status' }),
          traffic: getTrafficLight(project, tab),
          statusText,
          statusClass: getStatusClass(statusText),
        };

      default: {
        const tabLabel = tabLabelOf(tab);
        const isPlanColumn = col.key === `计划${tabLabel}时间`;
        const isActualColumn = col.key === `实际${tabLabel}时间`;

        // 日期列取对应 Tab 的计划 / 实际验收时间，其余列走台账列名（含程序字段回退）
        const rawValue = isPlanColumn
          ? (tab === 'initial' ? project.planInitialDate : project.planFinalDate)
          : isActualColumn
            ? (tab === 'initial' ? project.actualInitialDate : project.actualFinalDate)
            : getColumnValue(project, col.key);

        const isAmount = isAmountColumn(col.label);

        return createCell({
          key: col.key,
          text: isAmount
            ? formatCurrency(rawValue)
            // 实际验收时间为空时展示占位符（与既有展示一致）
            : (isActualColumn ? (rawValue || '-') : rawValue),
          title: rawValue,
          type: isAmount ? 'amount' : 'text',
          cellClass: isAmount
            ? 'amount'
            : (col.key === '项目编号' ? 'col-project-code' : ''),
        });
      }
    }
  });

  return {
    key: project.id,
    row: project,
    cells,
    rowClass: '',
  };
};

/** 供搜索取值口径复用：列名 → 程序字段 */
export { COLUMN_TO_FIELD };
