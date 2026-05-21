/**
 * 项目验收完成率计算工具函数
 */

/**
 * 生成模拟项目数据
 * @returns {Array} 项目数据
 */
export const generateMockProjects = () => {
  const projects = [];

  // 生成模拟数据
  for (let i = 1; i <= 50; i++) {
    const projectType = Math.random() > 0.5 ? '经营项目' : '自筹项目';
    const planInitialDate = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const actualInitialDate = Math.random() > 0.3 ?
      new Date(planInitialDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000) : null;
    const planFinalDate = new Date(planInitialDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const actualFinalDate = Math.random() > 0.5 ?
      new Date(planFinalDate.getTime() + Math.random() * 60 * 24 * 60 * 60 * 1000) : null;

    const budget = Math.floor(Math.random() * 1000000) + 100000;

    projects.push({
      id: `project_${i}`,
      projectCode: `JY-YZ-01-QT-23-${String(i).padStart(3, '0')}`,
      projectName: `项目${i} - ${projectType === '经营项目' ? '智慧城市' : '内部研发'}项目`,
      manager: `项目经理${i}`,
      department: `部门${Math.floor(Math.random() * 5) + 1}`,
      projectType,
      budget,
      planInitialDate: planInitialDate.toISOString().split('T')[0],
      actualInitialDate: actualInitialDate ? actualInitialDate.toISOString().split('T')[0] : null,
      planFinalDate: planFinalDate.toISOString().split('T')[0],
      actualFinalDate: actualFinalDate ? actualFinalDate.toISOString().split('T')[0] : null,
      status: calculateProjectStatus(planInitialDate, actualInitialDate, planFinalDate, actualFinalDate)
    });
  }

  return projects;
};

/**
 * 计算项目状态
 * @param {Date} planInitialDate - 计划初验日期
 * @param {Date|null} actualInitialDate - 实际初验日期
 * @param {Date} planFinalDate - 计划终验日期
 * @param {Date|null} actualFinalDate - 实际终验日期
 * @returns {string} 项目状态
 */
const calculateProjectStatus = (planInitialDate, actualInitialDate, planFinalDate, actualFinalDate) => {
  const now = new Date();

  // 检查初验状态
  if (actualInitialDate) {
    if (actualInitialDate <= planInitialDate) {
      return '已完成';
    } else {
      return '已延期';
    }
  }

  // 检查终验状态
  if (actualFinalDate) {
    if (actualFinalDate <= planFinalDate) {
      return '已完成';
    } else {
      return '已延期';
    }
  }

  // 未完成
  if (now > planInitialDate) {
    return '已延期';
  }

  return '未完成';
};

/**
 * 计算KPI数据
 * @param {Array} projects - 项目数据
 * @param {Object} filters - 过滤器（时间范围、项目类型）
 * @returns {Object} KPI数据
 */
export const calculateKpiData = (projects, filters) => {
  if (!projects || projects.length === 0) {
    return {
      completionRate: 0,
      targetAmount: 0,
      completedAmount: 0,
      totalProjects: 0,
      businessTargetAmount: 0,
      businessCompletedAmount: 0,
      businessCompletionRate: 0,
      businessProjects: 0,
      selfTargetAmount: 0,
      selfCompletedAmount: 0,
      selfCompletionRate: 0,
      selfProjects: 0
    };
  }

  // 应用过滤器
  let filteredProjects = projects;

  // 按项目类型过滤
  if (filters.projectType !== 'all') {
    filteredProjects = filteredProjects.filter(project =>
      project.projectType === (filters.projectType === 'business' ? '经营项目' : '自筹项目')
    );
  }

  // 按时间范围过滤
  if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);

    filteredProjects = filteredProjects.filter(project => {
      const planInitialDate = new Date(project.planInitialDate);
      const planFinalDate = new Date(project.planFinalDate);

      return (planInitialDate >= startDate && planInitialDate <= endDate) ||
             (planFinalDate >= startDate && planFinalDate <= endDate);
    });
  }

  // 计算初验数据
  const initialData = calculatePhaseData(filteredProjects, 'initial');

  // 计算终验数据
  const finalData = calculatePhaseData(filteredProjects, 'final');

  return {
    ...initialData,
    ...finalData
  };
};

/**
 * 计算阶段数据（初验或终验）
 * @param {Array} projects - 项目数据
 * @param {string} phase - 阶段（'initial' 或 'final'）
 * @returns {Object} 阶段数据
 */
const calculatePhaseData = (projects, phase) => {
  let targetAmount = 0;
  let completedAmount = 0;
  let totalProjects = 0;
  let businessTargetAmount = 0;
  let businessCompletedAmount = 0;
  let businessProjects = 0;
  let selfTargetAmount = 0;
  let selfCompletedAmount = 0;
  let selfProjects = 0;

  projects.forEach(project => {
    const planDate = phase === 'initial' ? project.planInitialDate : project.planFinalDate;
    const actualDate = phase === 'initial' ? project.actualInitialDate : project.actualFinalDate;
    const amount = project.budget;

    // 计算总数据
    targetAmount += amount;
    totalProjects++;

    if (actualDate) {
      completedAmount += amount;
    }

    // 计算经营项目数据
    if (project.projectType === '经营项目') {
      businessTargetAmount += amount;
      businessProjects++;

      if (actualDate) {
        businessCompletedAmount += amount;
      }
    }

    // 计算自筹项目数据
    if (project.projectType === '自筹项目') {
      selfTargetAmount += amount;
      selfProjects++;

      if (actualDate) {
        selfCompletedAmount += amount;
      }
    }
  });

  const completionRate = targetAmount > 0 ? Math.round((completedAmount / targetAmount) * 100) : 0;
  const businessCompletionRate = businessTargetAmount > 0 ? Math.round((businessCompletedAmount / businessTargetAmount) * 100) : 0;
  const selfCompletionRate = selfTargetAmount > 0 ? Math.round((selfCompletedAmount / selfTargetAmount) * 100) : 0;

  return {
    completionRate,
    targetAmount,
    completedAmount,
    totalProjects,
    businessTargetAmount,
    businessCompletedAmount,
    businessCompletionRate,
    businessProjects,
    selfTargetAmount,
    selfCompletedAmount,
    selfCompletionRate,
    selfProjects
  };
};

/**
 * 导出数据为Excel
 * @param {Array} projects - 项目数据
 * @returns {Blob} Excel文件
 */
export const exportToExcel = (projects) => {
  // 这里可以实现导出逻辑
  // 简化版本：返回模拟的Excel数据
  const headers = ['项目编号', '项目名称', '项目经理', '所属部门', '项目类型', '立项收入', '计划初验时间', '实际初验时间', '计划终验时间', '实际终验时间', '状态'];

  const data = projects.map(project => [
    project.projectCode,
    project.projectName,
    project.manager,
    project.department,
    project.projectType,
    project.budget,
    project.planInitialDate,
    project.actualInitialDate || '-',
    project.planFinalDate,
    project.actualFinalDate || '-',
    project.status
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '项目数据');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
};