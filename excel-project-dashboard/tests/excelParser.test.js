import { generateSampleData, parseExcelFile } from '../src/utils/excelParser';
import * as XLSX from 'xlsx';

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    aoa_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
    write: vi.fn()
  }
}));

describe('Excel Parser Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSampleData', () => {
    test('should return headers and rows', () => {
      const data = generateSampleData();
      expect(data).toHaveProperty('headers');
      expect(data).toHaveProperty('rows');
      expect(data).toHaveProperty('rawData');
      expect(data.headers).toContain('项目编号');
      expect(data.headers).toContain('项目名称');
      expect(data.rows).toHaveLength(10);
    });

    test('should return consistent headers in rows', () => {
      const data = generateSampleData();
      expect(data.headers).toHaveLength(7);
      expect(data.rows[0]).toHaveLength(7);
    });
  });

  describe('parseExcelFile', () => {
    test('should parse Excel file successfully', async () => {
      const mockFile = new File(['mock content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          'Sheet1': {
            A1: { t: 's', v: '项目编号' },
            B1: { t: 's', v: '项目名称' },
            A2: { t: 's', v: 'JY-YZ-01-QT-23-001' },
            B2: { t: 's', v: '测试项目' }
          }
        }
      };

      const mockSheetData = [
        { '项目编号': 'JY-YZ-01-QT-23-001', '项目名称': '测试项目' }
      ];

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue(mockSheetData);

      const result = await parseExcelFile(mockFile);
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('rows');
      expect(result).toHaveProperty('rawData');
      expect(result.headers).toEqual(['项目编号', '项目名称']);
      expect(result.rows).toEqual(mockSheetData);
    });

    test('should handle file parsing error', async () => {
      const mockFile = new File(['invalid content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      XLSX.read.mockImplementation(() => {
        throw new Error('Invalid file format');
      });

      await expect(parseExcelFile(mockFile)).rejects.toThrow('文件解析失败');
    });

    test('should handle empty sheet', async () => {
      const mockFile = new File(['mock content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: { 'Sheet1': {} }
      };

      XLSX.read.mockReturnValue(mockWorkbook);
      XLSX.utils.sheet_to_json.mockReturnValue([]);

      const result = await parseExcelFile(mockFile);
      expect(result.headers).toEqual([]);
      expect(result.rows).toEqual([]);
    });
  });
});
