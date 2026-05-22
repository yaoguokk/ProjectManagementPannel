import {
  formatDate,
  cleanNumber,
  cleanString,
  cleanExcelData,
  calculateMetrics
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

  describe('cleanExcelData', () => {
    const mockExcelData = [
      { '项目编号': 'PRJ-001', '项目名称': '智慧城市', '预算': '¥500000' },
      { '项目编号': 'PRJ-002', '项目名称': '', '预算': '¥300000' },
      { '项目编号': 'PRJ-003', '项目名称': '数据平台', '预算': '¥200000' },
      { '项目编号': '合计', '项目名称': '总计', '预算': '¥1000000' }
    ];

    test('should filter total rows', () => {
      const result = cleanExcelData(mockExcelData);
      expect(result).toHaveLength(3);
      expect(result[0].projectName).toBe('智慧城市');
      expect(result[1].projectName).toBe('项目2');
      expect(result[2].projectName).toBe('数据平台');
    });

    test('should clean and format data correctly', () => {
      const result = cleanExcelData(mockExcelData);
      expect(result[0].projectCode).toBe('PRJ-001');
      expect(result[0].budget).toBe(500000);
      expect(result[0].id).toBeDefined();
    });
  });

  describe('calculateMetrics', () => {
    const mockProjects = [
      { id: 1, projectName: '项目1', budget: 100000, startDate: '2023-01-01' },
      { id: 2, projectName: '项目2', budget: 200000, startDate: '2023-02-01' },
      { id: 3, projectName: '项目3', budget: 150000, startDate: '2023-01-15' }
    ];

    test('should calculate total projects correctly', () => {
      const metrics = calculateMetrics(mockProjects);
      expect(metrics.totalProjects).toBe(3);
      expect(metrics.totalBudget).toBe(450000);
    });

    test('should handle empty projects array', () => {
      const metrics = calculateMetrics([]);
      expect(metrics.totalProjects).toBe(0);
      expect(metrics.totalBudget).toBe(0);
    });
  });
});
