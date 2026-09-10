import {
  DepartmentDisplay,
  DEPARTMENT_DISPLAY_OPTIONS,
  formatDepartment,
} from '../src/utils/departmentDisplay';

// 自筹项目「承接部门」的真实格式
const FULL_PATH = '南方电网数字电网研究院股份有限公司/南方电网传感科技（广东）有限公司/产品研发部';

describe('formatDepartment', () => {
  test('全部展示：原样返回台账值', () => {
    expect(formatDepartment(FULL_PATH, DepartmentDisplay.FULL)).toBe(FULL_PATH);
  });

  test('缺省模式等同全部展示', () => {
    expect(formatDepartment(FULL_PATH)).toBe(FULL_PATH);
  });

  test('仅部门：取最后一段，去掉公司前缀', () => {
    expect(formatDepartment(FULL_PATH, DepartmentDisplay.LAST_SEGMENT)).toBe('产品研发部');
  });

  test('无分隔符时原样返回（经营项目本身就是部门名）', () => {
    expect(formatDepartment('市场营销部', DepartmentDisplay.LAST_SEGMENT)).toBe('市场营销部');
  });

  test('兼容全角斜杠', () => {
    expect(formatDepartment('A公司／B公司／财务经营部', DepartmentDisplay.LAST_SEGMENT)).toBe('财务经营部');
  });

  test('结尾分隔符等脏数据回退到最后一个有效片段', () => {
    expect(formatDepartment('A公司/B公司/', DepartmentDisplay.LAST_SEGMENT)).toBe('B公司');
  });

  test('去除片段两侧空白', () => {
    expect(formatDepartment('A公司 / 产品研发部 ', DepartmentDisplay.LAST_SEGMENT)).toBe('产品研发部');
  });

  test('空值原样返回，避免吞掉调用方的占位逻辑', () => {
    expect(formatDepartment('', DepartmentDisplay.LAST_SEGMENT)).toBe('');
    expect(formatDepartment(null, DepartmentDisplay.LAST_SEGMENT)).toBeNull();
    expect(formatDepartment(undefined, DepartmentDisplay.LAST_SEGMENT)).toBeUndefined();
  });
});

describe('DEPARTMENT_DISPLAY_OPTIONS', () => {
  test('第一项为默认的「全部展示」', () => {
    expect(DEPARTMENT_DISPLAY_OPTIONS[0].value).toBe(DepartmentDisplay.FULL);
    expect(DEPARTMENT_DISPLAY_OPTIONS.map((item) => item.value)).toEqual(['full', 'lastSegment']);
  });
});
