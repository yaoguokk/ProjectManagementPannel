import * as XLSX from 'xlsx';

/**
 * 解析Excel文件
 * @param {File} file - Excel文件
 * @returns {Promise<Object>} 返回解析后的数据
 */
export const parseExcelFile = (file, options = {}) => {
  const { skipRows = 0 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 跳过指定行数（从 sheet 的 !ref 范围中移除前 skipRows 行）
        if (skipRows > 0) {
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          range.s.r += skipRows;
          worksheet['!ref'] = XLSX.utils.encode_range(range);
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // 获取表头
        const headers = Object.keys(jsonData[0] || {});

        resolve({
          headers,
          rows: jsonData,
          rawData: jsonData
        });
      } catch (error) {
        reject(new Error('文件解析失败：' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * 生成示例Excel数据
 * @returns {Object} 示例数据
 */
export const generateSampleData = () => {
  const headers = ['项目编号', '项目名称', '所属部门', '项目负责人', '立项日期', '项目预算', '当前状态'];

  const sampleRows = [
    ['PRJ-001', '智慧城市建设项目', '信息技术部', '张三', '2023-01-15', '500000', '已结算'],
    ['PRJ-002', '数据分析平台', '数据科学部', '李四', '2023-02-20', '300000', '待结算'],
    ['PRJ-003', '移动应用开发', '产品部', '王五', '2023-03-10', '200000', '待初验'],
    ['PRJ-004', '云计算基础设施', '运维部', '赵六', '2023-04-05', '800000', '待终验'],
    ['PRJ-005', '网络安全升级', '安全部', '钱七', '2023-05-12', '400000', '已结算'],
    ['PRJ-006', '人工智能研究', '研发部', '孙八', '2023-06-18', '600000', '待结算'],
    ['PRJ-007', '企业门户改版', '市场部', '周九', '2023-07-22', '250000', '待初验'],
    ['PRJ-008', '客户关系管理系统', '销售部', '吴十', '2023-08-30', '350000', '已结算'],
    ['PRJ-009', '供应链优化', '运营部', '郑十一', '2023-09-05', '450000', '待终验'],
    ['PRJ-010', '人力资源系统', 'HR部', '王十二', '2023-10-10', '280000', '待结算']
  ];

  return {
    headers,
    rows: sampleRows,
    rawData: sampleRows
  };
};
