import {
  formatDate,
  cleanNumber,
  cleanString,
  cleanExcelData,
  cleanContractData
} from '../src/utils/dataCleaner';

describe('Data Cleaner Utilities', () => {
  describe('formatDate', () => {
    test('should format Excel date serial number correctly', () => {
      expect(formatDate(44197)).toBe('2020-12-31');
    });

    test('should format date string correctly', () => {
      expect(formatDate('2021-01-01')).toBe('2021-01-01');
    });

    test('should handle invalid date', () => {
      expect(formatDate('invalid')).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    test('should handle empty date', () => {
      expect(formatDate('')).toBe('');
    });
  });

  describe('cleanNumber', () => {
    test('should clean currency symbol', () => {
      expect(cleanNumber('¥100000')).toBe(100000);
      expect(cleanNumber('$100000')).toBe(100000);
    });

    test('should remove commas', () => {
      expect(cleanNumber('100,000')).toBe(100000);
      expect(cleanNumber('1,000,000')).toBe(1000000);
    });

    test('should handle empty string', () => {
      expect(cleanNumber('')).toBe(0);
    });

    test('should handle null/undefined', () => {
      expect(cleanNumber(null)).toBe(0);
      expect(cleanNumber(undefined)).toBe(0);
    });

    test('should handle already clean numbers', () => {
      expect(cleanNumber(100000)).toBe(100000);
      expect(cleanNumber('100000')).toBe(100000);
    });
  });

  describe('cleanString', () => {
    test('should trim whitespace', () => {
      expect(cleanString('  项目名称  ')).toBe('项目名称');
    });

    test('should remove extra spaces', () => {
      expect(cleanString('项目   名称')).toBe('项目   名称');
    });

    test('should handle empty string', () => {
      expect(cleanString('')).toBe('');
    });

    test('should handle null/undefined', () => {
      expect(cleanString(null)).toBe('');
      expect(cleanString(undefined)).toBe('');
    });
  });

  // 贴近真实 Excel 77 列的生产数据（共用 mock）
  const makeRow = (overrides = {}) => ({
    '项目编号': 'PRJ-001',
    '项目名称': '智慧城市项目',
    '项目经理': '张三',
    '业务部所': '信息技术部',
    '项目类型': '经营项目',
    '立项收入(元)': '¥500,000',
    '项目状态': '待初验',
    '立项方式': '公开招标',
    '项目计划初验时间含变更': '2025-06-30',
    '项目计划终验时间含变更': '2025-12-31',
    '项目实际初验时间': '',
    '项目实际终验时间': '',
    '立项审批完成时间': '2025-01-15',
    ...overrides,
  });

  describe('cleanExcelData > 过滤规则', () => {
    test('应排除 立项方式="基于商机立项" 的行', () => {
      const rows = [
        makeRow({ '项目编号': 'A', '立项方式': '公开招标' }),
        makeRow({ '项目编号': 'B', '立项方式': '基于商机立项' }),
      ];
      const result = cleanExcelData(rows);
      expect(result).toHaveLength(1);
      expect(result[0].projectCode).toBe('A');
    });

    test('应保留 立项方式≠"基于商机立项" 的行', () => {
      const rows = [
        makeRow({ '项目编号': 'A', '立项方式': '公开招标' }),
        makeRow({ '项目编号': 'B', '立项方式': '竞争性谈判' }),
        makeRow({ '项目编号': 'C', '立项方式': '' }),
      ];
      const result = cleanExcelData(rows);
      expect(result).toHaveLength(3);
    });

    test('应只保留4种允许状态的行', () => {
      const rows = [
        makeRow({ '项目编号': 'A', '项目状态': '待初验' }),
        makeRow({ '项目编号': 'B', '项目状态': '待终验' }),
        makeRow({ '项目编号': 'C', '项目状态': '待结算' }),
        makeRow({ '项目编号': 'D', '项目状态': '已结算' }),
      ];
      const result = cleanExcelData(rows);
      expect(result).toHaveLength(4);
      expect(result.map(r => r.projectCode)).toEqual(['A', 'B', 'C', 'D']);
    });

    test('应排除状态为"已终止"的行', () => {
      const rows = [
        makeRow({ '项目编号': 'A', '项目状态': '待初验' }),
        makeRow({ '项目编号': 'B', '项目状态': '已终止' }),
      ];
      const result = cleanExcelData(rows);
      expect(result).toHaveLength(1);
      expect(result[0].projectCode).toBe('A');
    });

    test('应排除状态为"已取消"的行', () => {
      const rows = [
        makeRow({ '项目编号': 'A', '项目状态': '待初验' }),
        makeRow({ '项目编号': 'B', '项目状态': '已取消' }),
      ];
      const result = cleanExcelData(rows);
      expect(result).toHaveLength(1);
      expect(result[0].projectCode).toBe('A');
    });

    test('应排除缺少项目状态列的行', () => {
      const rowWithoutStatus = {
        '项目编号': 'PRJ-002',
        '项目名称': '无状态项目',
        '立项收入(元)': '¥100,000',
      };
      const rows = [makeRow({ '项目编号': 'A' }), rowWithoutStatus];
      const result = cleanExcelData(rows);
      expect(result).toHaveLength(1);
      expect(result[0].projectCode).toBe('A');
    });

    test('空数组输入应返回 []', () => {
      expect(cleanExcelData([])).toEqual([]);
    });
  });

  describe('cleanExcelData > 数据映射', () => {
    test('正确映射 projectCode 从 项目编号', () => {
      const [row] = cleanExcelData([makeRow({ '项目编号': 'JY-2025-001' })]);
      expect(row.projectCode).toBe('JY-2025-001');
    });

    test('正确映射 budget 从 立项收入(元)', () => {
      const [row] = cleanExcelData([makeRow({ '立项收入(元)': '¥1,200,000' })]);
      expect(row.budget).toBe(1200000);
    });

    test('正确映射 planInitialDate 从 项目计划初验时间含变更', () => {
      const [row] = cleanExcelData([makeRow({ '项目计划初验时间含变更': '2025-06-30' })]);
      expect(row.planInitialDate).toBe('2025-06-30');
    });

    test('正确映射 planFinalDate 从 项目计划终验时间含变更', () => {
      const [row] = cleanExcelData([makeRow({ '项目计划终验时间含变更': '2025-12-31' })]);
      expect(row.planFinalDate).toBe('2025-12-31');
    });

    test('fileName=经营项目台账明细列表 → projectType=经营项目', () => {
      const [row] = cleanExcelData([makeRow()], '经营项目台账明细列表_202605.xlsx');
      expect(row.projectType).toBe('经营项目');
    });

    test('fileName=自筹项目台账列表 → projectType=自筹项目', () => {
      const [row] = cleanExcelData([makeRow()], '自筹项目台账列表_202605.xlsx');
      expect(row.projectType).toBe('自筹项目');
    });

    test('fileName 为空时回退到行内 项目类型 字段', () => {
      const [row] = cleanExcelData([makeRow({ '项目类型': '自筹项目' })], '');
      expect(row.projectType).toBe('自筹项目');
    });

    test('空项目名称应赋予默认值', () => {
      const [row] = cleanExcelData([makeRow({ '项目名称': '' })]);
      expect(row.projectName).toMatch(/^项目\d+$/);
    });

    test('空项目编号应赋予默认值 PRJ-N', () => {
      const [row] = cleanExcelData([makeRow({ '项目编号': '' })]);
      expect(row.projectCode).toMatch(/^PRJ-\d+$/);
    });

    test('应生成唯一 id', () => {
      const [r1, r2] = cleanExcelData([makeRow(), makeRow()]);
      expect(r1.id).toBeDefined();
      expect(r2.id).toBeDefined();
      expect(r1.id).not.toBe(r2.id);
    });
  });

  // 支出合同事项表（首行标题已在解析阶段跳过）
  const makeContractRow = (overrides = {}) => ({
    '合同ID': 'C001',
    '事项ID': 'I001',
    '项目编号': 'PRJ-001',
    '支出合同类型': '项目分包',
    '事项金额(元)': '¥100,000',
    '数研院合同编号': 'HT-2026-001',
    '合同名称': '测试合同',
    '合同签订时间': '2026-03-14',
    '事项名称': '技术服务',
    '合同总金额元': '200,000',
    '乙方合同签约单位': '某供应商',
    '承办人': '张三',
    '采购类型': '公开招标',
    '合同状态': '已签订',
    ...overrides,
  });

  describe('cleanContractData', () => {
    test('应映射成本聚合字段与详情展示字段', () => {
      const [item] = cleanContractData([makeContractRow()]);

      expect(item).toMatchObject({
        id: 'C001-I001',
        projectCode: 'PRJ-001',
        contractType: '项目分包',
        amount: 100000,
        contractNo: 'HT-2026-001',
        contractName: '测试合同',
        signDate: '2026-03-14',
        itemName: '技术服务',
        contractAmount: 200000,
        supplier: '某供应商',
        handler: '张三',
        purchaseType: '公开招标',
        contractStatus: '已签订',
      });
    });

    test('应丢弃项目编号为空的行', () => {
      expect(cleanContractData([makeContractRow({ '项目编号': '' })])).toEqual([]);
    });

    test('缺少合同ID/事项ID时应使用行号兜底生成唯一键', () => {
      const result = cleanContractData([
        makeContractRow({ '合同ID': '', '事项ID': '' }),
        makeContractRow({ '合同ID': '', '事项ID': '', '项目编号': 'PRJ-002' }),
      ]);

      expect(result.map((item) => item.id)).toEqual(['CONTRACT-1', 'CONTRACT-2']);
    });

    test('承办人为空时应回退到事项承办人', () => {
      const [item] = cleanContractData([
        makeContractRow({ '承办人': '', '事项承办人': '李四' }),
      ]);

      expect(item.handler).toBe('李四');
    });

    test('空输入应返回空数组', () => {
      expect(cleanContractData([])).toEqual([]);
      expect(cleanContractData()).toEqual([]);
    });
  });
});
