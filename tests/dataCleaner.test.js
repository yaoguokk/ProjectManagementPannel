import { formatDate, cleanNumber, cleanProjectData } from '../src/utils/dataCleaner';
import { ProjectStatus } from '../src/constants/projectStatus';

describe('dataCleaner Utils', () => {
  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const dateStr = '2023-01-15';
      expect(formatDate(dateStr)).toBe('2023-01-15');
    });

    it('should return empty string for null/undefined input', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });

    it('should handle numeric date (Excel format)', () => {
      const excelDate = 44200; // Excel serial number for 2023-01-15
      expect(formatDate(excelDate)).toBe('2023-01-15');
    });

    it('should handle Date object', () => {
      const date = new Date('2023-01-15');
      expect(formatDate(date)).toBe('2023-01-15');
    });
  });

  describe('cleanNumber', () => {
    it('should clean numeric value correctly', () => {
      expect(cleanNumber(1000000)).toBe(1000000);
      expect(cleanNumber('1,000,000')).toBe(1000000);
      expect(cleanNumber('¥1,000,000')).toBe(1000000);
      expect(cleanNumber('$1,000,000')).toBe(1000000);
    });

    it('should return 0 for null/undefined input', () => {
      expect(cleanNumber(null)).toBe(0);
      expect(cleanNumber(undefined)).toBe(0);
    });

    it('should handle invalid numbers', () => {
      expect(cleanNumber('invalid')).toBe(0);
    });
  });

  describe('cleanProjectData', () => {
    const rawData = [
      {
        '项目编号': 'PRJ-001',
        '项目名称': '测试项目',
        '所属部门': '测试部门',
        '项目负责人': '张三',
        '立项日期': '2023-01-15',
        '项目预算': '1,000,000',
        '当前状态': ProjectStatus.COMPLETED
      },
      {
        '项目编号': '',
        '项目名称': '未命名项目',
        '所属部门': '',
        '项目负责人': '',
        '立项日期': '',
        '项目预算': '0',
        '当前状态': ''
      }
    ];

    it('should filter out empty projects', () => {
      const cleanedData = cleanProjectData(rawData);
      expect(cleanedData).toHaveLength(1);
      expect(cleanedData[0].projectName).toBe('测试项目');
    });

    it('should clean and format project data correctly', () => {
      const cleanedData = cleanProjectData(rawData);
      expect(cleanedData[0].budget).toBe(1000000);
      expect(cleanedData[0].startDate).toBe('2023-01-15');
    });
  });
});
