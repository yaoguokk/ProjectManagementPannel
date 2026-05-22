/**
 * 数据清洗工具函数
 * 精确列名映射 — 匹配真实 Excel 列名（77列）
 */

/**
 * 清洗Excel数据 — 精确列名映射 + 过滤规则
 * @param {Array} rawData - 原始数据数组
 * @param {string} fileName - 上传的文件名（用于判定项目类型）
 * @returns {Array} 清洗后的数据
 */
export const cleanExcelData = (rawData, fileName = '') => {
  if (!rawData || rawData.length === 0) return [];

  // 根据文件名判定项目类型
  let fileProjectType = null;
  if (fileName.includes('经营项目台账明细列表')) {
    fileProjectType = '经营项目';
  } else if (fileName.includes('自筹项目台账列表')) {
    fileProjectType = '自筹项目';
  }

  // 允许的项目状态
  const allowedStatuses = ['待结算', '已结算', '待终验', '待初验'];

  return rawData
    .filter((row) => {
      // 规则1：排除 立项方式 = "基于商机立项"
      if (row['立项方式'] === '基于商机立项') return false;

      // 规则2：只保留 4 种项目状态
      const status = row['项目状态'];
      if (!status || !allowedStatuses.includes(String(status).trim())) return false;

      return true;
    })
    .map((row, index) => ({
      id: generateId(),
      projectCode: cleanString(row['项目编号']) || `PRJ-${index + 1}`,
      projectName: cleanString(row['项目名称']) || `项目${index + 1}`,
      manager: cleanString(row['项目经理']) || '未知',
      department: cleanString(row['业务部所']) || '未知部门',
      projectType: fileProjectType || cleanString(row['项目类型']) || '未知类型',
      budget: cleanNumber(row['立项收入(元)']),
      planInitialDate: formatDate(row['项目计划初验时间含变更']),
      planFinalDate: formatDate(row['项目计划终验时间含变更']),
      actualInitialDate: formatDate(row['项目实际初验时间']),
      actualFinalDate: formatDate(row['项目实际终验时间']),
      startDate: formatDate(row['立项审批完成时间']),
      status: cleanString(row['项目状态']) || '未知状态',
    }));
};

/**
 * 格式化日期为YYYY-MM-DD格式
 * 处理 Excel 日期序列号、字符串日期、Date 对象
 */
export const formatDate = (date) => {
  if (!date && date !== 0) return '';

  let dateObj;

  if (typeof date === 'number') {
    // Excel日期序列号（1900年1月1日为1）
    const excelEpoch = new Date(1899, 11, 30);
    dateObj = new Date(excelEpoch.getTime() + date * 24 * 60 * 60 * 1000);
  } else if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '';

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    } else {
      const parts = trimmed.split(/[-/]/);
      if (parts.length === 3) {
        dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
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
 * 清洗数值字段，去除货币符号、逗号、空格
 */
export const cleanNumber = (value) => {
  if (value === null || value === undefined) return 0;

  let cleanedValue = String(value)
    .replace(/[¥$]/g, '')
    .replace(/,/g, '')
    .trim();

  const numberValue = parseFloat(cleanedValue);
  return isNaN(numberValue) ? 0 : numberValue;
};

/**
 * 清洗字符串字段，去除前后空格
 */
export const cleanString = (value) => {
  if (!value) return '';
  return String(value).trim();
};

/**
 * 生成唯一ID
 */
export const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};
