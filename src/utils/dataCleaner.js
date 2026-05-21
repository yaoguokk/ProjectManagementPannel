/**
 * 数据清洗工具函数
 */

/**
 * 格式化日期为YYYY-MM-DD格式
 * @param {string|number|Date} date - 日期值
 * @returns {string} 格式化后的日期
 */
export const formatDate = (date) => {
  if (!date) return '';

  let dateObj;

  if (typeof date === 'number') {
    // 处理Excel日期序列号
    const excelEpoch = new Date(1899, 11, 30);
    dateObj = new Date(excelEpoch.getTime() + date * 24 * 60 * 60 * 1000);
  } else if (typeof date === 'string') {
    // 尝试解析各种日期格式
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    } else {
      // 尝试更宽松的解析
      const parts = date.split(/[-/]/);
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        dateObj = new Date(year, month, day);
      }
    }
  } else if (date instanceof Date) {
    dateObj = date;
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    return dateObj.toISOString().split('T')[0];
  }

  return '';
};

/**
 * 清洗数值字段，去除货币符号和逗号
 * @param {string|number} value - 数值
 * @returns {number} 清洗后的数值
 */
export const cleanNumber = (value) => {
  if (value === null || value === undefined) return 0;

  let cleanedValue = String(value);

  // 去除货币符号
  cleanedValue = cleanedValue.replace(/[¥$]/g, '');

  // 去除逗号
  cleanedValue = cleanedValue.replace(/,/g, '');

  // 去除空格
  cleanedValue = cleanedValue.trim();

  // 转换为数字
  const numberValue = parseFloat(cleanedValue);

  return isNaN(numberValue) ? 0 : numberValue;
};

/**
 * 清洗字符串字段，去除前后空格
 * @param {string} value - 字符串
 * @returns {string} 清洗后的字符串
 */
export const cleanString = (value) => {
  if (!value) return '';
  return String(value).trim();
};

/**
 * 清洗项目数据
 * @param {Array} rawData - 原始数据
 * @returns {Array} 清洗后的数据
 */
export const cleanProjectData = (rawData) => {
  if (!rawData || rawData.length === 0) return [];

  return rawData.map((row, index) => {
    // 过滤空行
    if (!row || Object.keys(row).length === 0) {
      return null;
    }

    // 检查是否是合计或总结行
    const rowValues = Object.values(row);
    if (rowValues.some(val => String(val).includes('合计') || String(val).includes('总结'))) {
      return null;
    }

    return {
      id: row.id || generateId(),
      projectCode: cleanString(row['项目编号'] || row['projectCode'] || `PRJ-${index + 1}`),
      projectName: cleanString(row['项目名称'] || row['projectName'] || '未命名项目'),
      department: cleanString(row['所属部门'] || row['department'] || '未知部门'),
      manager: cleanString(row['项目负责人'] || row['manager'] || '未知'),
      startDate: formatDate(row['立项日期'] || row['startDate']),
      budget: cleanNumber(row['项目预算'] || row['budget']),
      status: cleanString(row['当前状态'] || row['status'] || '进行中')
    };
  }).filter(item => item !== null && item.projectName !== '未命名项目');
};

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

/**
 * 计算项目统计指标
 * @param {Array} projects - 项目数据
 * @returns {Object} 统计指标
 */
export const calculateMetrics = (projects) => {
  if (!projects || projects.length === 0) {
    return {
      totalProjects: 0,
      totalBudget: 0,
      delayedProjects: 0
    };
  }

  const totalProjects = projects.length;
  const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0);

  // 计算滞后的项目数量（假设当前日期大于立项日期30天以上为滞后）
  const currentDate = new Date();
  const delayedProjects = projects.filter(project => {
    if (!project.startDate) return false;
    const startDate = new Date(project.startDate);
    const daysDiff = (currentDate - startDate) / (1000 * 60 * 60 * 24);
    return daysDiff > 30;
  }).length;

  return {
    totalProjects,
    totalBudget,
    delayedProjects
  };
};

/**
 * 转换图表数据
 * @param {Array} projects - 项目数据
 * @returns {Object} 图表数据
 */
export const transformChartData = (projects) => {
  if (!projects || projects.length === 0) {
    return {
      pieData: [],
      barData: [],
      lineData: []
    };
  }

  // 按状态分组
  const statusData = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  // 按月份分组
  const monthlyData = projects.reduce((acc, project) => {
    if (!project.startDate) return acc;
    const month = project.startDate.substring(0, 7); // YYYY-MM
    acc[month] = (acc[month] || 0) + project.budget;
    return acc;
  }, {});

  return {
    pieData: Object.entries(statusData).map(([name, value]) => ({ name, value })),
    barData: Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, value })),
    lineData: projects.map(project => ({
      date: project.startDate,
      value: project.budget
    })).filter(item => item.date)
  };
};
