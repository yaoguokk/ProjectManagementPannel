/**
 * 项目数据工具 — KPI 计算、模拟数据、导出
 */
import * as XLSX from 'xlsx';

/**
 * 本地日期格式化，避免 toISOString 的 UTC 时区偏移
 */
const formatDateLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * 生成模拟项目数据（用于无 Excel 时的默认展示）
 */
export const generateMockProjects = () => {
  const projects = [];

  for (let i = 1; i <= 50; i++) {
    const projectType = Math.random() > 0.5 ? '经营项目' : '自筹项目';
    const planInitialDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const actualInitialDate = Math.random() > 0.3
      ? new Date(planInitialDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null;
    const planFinalDate = new Date(planInitialDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const actualFinalDate = Math.random() > 0.5
      ? new Date(planFinalDate.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000) : null;

    const budget = Math.floor(Math.random() * 1000000) + 100000;

    projects.push({
      id: `project_${i}`,
      projectCode: `JY-YZ-01-QT-23-${String(i).padStart(3, '0')}`,
      projectName: `项目${i} - ${projectType === '经营项目' ? '智慧城市' : '内部研发'}项目`,
      manager: `项目经理${i}`,
      department: `部门${Math.floor(Math.random() * 5) + 1}`,
      projectType,
      budget,
      planInitialDate: formatDateLocal(planInitialDate),
      actualInitialDate: actualInitialDate ? formatDateLocal(actualInitialDate) : '',
      planFinalDate: formatDateLocal(planFinalDate),
      actualFinalDate: actualFinalDate ? formatDateLocal(actualFinalDate) : '',
      startDate: formatDateLocal(planInitialDate),
      status: calculateMockStatus(planInitialDate, actualInitialDate),
    });
  }

  return projects;
};

const calculateMockStatus = (planDate, actualDate) => {
  if (actualDate) {
    return actualDate <= planDate ? '已结算' : '待结算';
  }
  return new Date() > planDate ? '待结算' : '待初验';
};

/**
 * 计算 KPI 数据 — 初验 + 终验分别计算
 * @param {Array} projects - 项目数据
 * @param {Object} filters - 过滤器 { dateRange: { start, end }, projectType }
 * @returns {Object} { initial: {...}, final: {...} }
 */
export const calculateKpiData = (projects, filters = {}) => {
  const dateRange = filters.dateRange || { start: '', end: '' };
  const projectType = filters.projectType || '全部';

  // 先按项目类型过滤
  let filteredProjects = projects;
  if (projectType !== '全部') {
    filteredProjects = projects.filter((p) => p.projectType === projectType);
  }

  return {
    initial: calculatePhaseData(filteredProjects, 'initial', dateRange),
    final: calculatePhaseData(filteredProjects, 'final', dateRange),
  };
};

/**
 * 计算单个阶段的 KPI
 * @param {Array} projects - 项目数据
 * @param {string} phase - 'initial' | 'final'
 * @param {Object} dateRange - { start, end }
 */
const calculatePhaseData = (projects, phase, dateRange) => {
  if (!projects || projects.length === 0) {
    return emptyPhaseData();
  }

  const planDateField = phase === 'initial' ? 'planInitialDate' : 'planFinalDate';
  const actualDateField = phase === 'initial' ? 'actualInitialDate' : 'actualFinalDate';

  // 按时间范围过滤：计划日期在选定范围内
  let filtered = projects;
  if (dateRange && dateRange.start && dateRange.end) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    filtered = projects.filter((p) => {
      const planDate = p[planDateField];
      if (!planDate) return false;
      const d = new Date(planDate);
      return d >= start && d <= end;
    });
  }

  // 计划金额 = 统计范围内所有项目的立项收入之和
  const targetAmount = filtered.reduce((sum, p) => sum + (p.budget || 0), 0);

  // 完成金额 = 统计范围内 实际日期非空 的项目的立项收入之和
  const completedProjects = filtered.filter((p) => p[actualDateField]);
  const completedAmount = completedProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

  const totalProjects = filtered.length;
  const completedProjectCount = completedProjects.length;
  const completionRate = targetAmount > 0 ? Math.round((completedAmount / targetAmount) * 100) : 0;

  // 细分：经营项目
  const businessProjects = filtered.filter((p) => p.projectType === '经营项目');
  const businessTargetAmount = businessProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const businessCompletedAmount = businessProjects
    .filter((p) => p[actualDateField])
    .reduce((sum, p) => sum + (p.budget || 0), 0);
  const businessCompletionRate = businessTargetAmount > 0
    ? Math.round((businessCompletedAmount / businessTargetAmount) * 100) : 0;

  // 细分：自筹项目
  const selfProjects = filtered.filter((p) => p.projectType === '自筹项目');
  const selfTargetAmount = selfProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const selfCompletedAmount = selfProjects
    .filter((p) => p[actualDateField])
    .reduce((sum, p) => sum + (p.budget || 0), 0);
  const selfCompletionRate = selfTargetAmount > 0
    ? Math.round((selfCompletedAmount / selfTargetAmount) * 100) : 0;

  return {
    completionRate,
    targetAmount,
    completedAmount,
    totalProjects,
    completedProjectCount,
    businessTargetAmount,
    businessCompletedAmount,
    businessCompletionRate,
    businessProjects: businessProjects.length,
    businessCompletedProjectCount: businessProjects.filter((p) => p[actualDateField]).length,
    selfTargetAmount,
    selfCompletedAmount,
    selfCompletionRate,
    selfProjects: selfProjects.length,
    selfCompletedProjectCount: selfProjects.filter((p) => p[actualDateField]).length,
  };
};

const emptyPhaseData = () => ({
  completionRate: 0,
  targetAmount: 0,
  completedAmount: 0,
  totalProjects: 0,
  completedProjectCount: 0,
  businessTargetAmount: 0,
  businessCompletedAmount: 0,
  businessCompletionRate: 0,
  businessProjects: 0,
  businessCompletedProjectCount: 0,
  selfTargetAmount: 0,
  selfCompletedAmount: 0,
  selfCompletionRate: 0,
  selfProjects: 0,
  selfCompletedProjectCount: 0,
});

/**
 * 导出数据为 Excel
 */
export const exportToExcel = (projects) => {
  const headers = [
    '项目编号', '项目名称', '项目经理', '所属部门', '项目类型',
    '立项收入', '计划初验时间', '实际初验时间', '计划终验时间', '实际终验时间', '状态',
  ];

  const data = projects.map((p) => [
    p.projectCode, p.projectName, p.manager, p.department, p.projectType,
    p.budget, p.planInitialDate, p.actualInitialDate || '-',
    p.planFinalDate, p.actualFinalDate || '-', p.status,
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '项目数据');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
};
