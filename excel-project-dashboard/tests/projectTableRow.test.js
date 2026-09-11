import { describe, expect, test } from 'vitest';
import {
  buildProjectRow,
  formatCurrency,
  getCountdownColor,
  getCountdownExport,
  getCountdownText,
  getStatusClass,
  getTrafficLight,
} from '../src/utils/projectTableRow';
import { buildProjectColumns } from '../src/utils/projectTableColumns';

/** 以「今天」为基准生成日期，避免用例随时间漂移 */
const daysFromNow = (days) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const makeProject = (overrides = {}) => ({
  id: 'p1',
  '项目编号': 'PRJ-001',
  '项目名称': '智慧城市项目',
  '项目经理': '张三',
  '业务部所': '信息技术部',
  '项目类型': '研究咨询类',
  '立项收入(元)': '1234567',
  '项目状态': '待终验',
  planInitialDate: '2026-04-30',
  planFinalDate: daysFromNow(90),
  actualInitialDate: '2026-04-20',
  actualFinalDate: '',
  ...overrides,
});

describe('projectTableRow > 展示口径', () => {
  test('formatCurrency 千分位，0 直接展示', () => {
    expect(formatCurrency(0)).toBe('0');
    expect(formatCurrency(1234567)).toBe('1,234,567');
    expect(formatCurrency(undefined)).toBe('0');
  });

  test('状态标签样式映射', () => {
    expect(getStatusClass('已结算')).toBe('status-completed');
    expect(getStatusClass('待初验')).toBe('status-pending');
    expect(getStatusClass('待终验')).toBe('status-pending');
    expect(getStatusClass('待结算')).toBe('status-pending');
    expect(getStatusClass('未知状态')).toBe('');
  });

  test('倒计时文案与颜色分层', () => {
    expect(getCountdownText(null)).toBe('—');
    expect(getCountdownText(-5)).toBe('超期5天');
    expect(getCountdownText(0)).toBe('今天');
    expect(getCountdownText(10)).toBe('10天');

    expect(getCountdownColor(5)).toBe('red');
    expect(getCountdownColor(20)).toBe('yellow');
    expect(getCountdownColor(60)).toBe('green');
    expect(getCountdownColor(null)).toBe('');
  });

  test('导出用倒计时：已验收优先，其次按计划日计算', () => {
    expect(getCountdownExport('2026-01-01', '2026-01-02')).toBe('已验收');
    expect(getCountdownExport('', '')).toBe('—');
    expect(getCountdownExport(daysFromNow(0), '')).toBe('今天');
  });

  test('验收红绿灯：已完成 / 已滞后 / 预警 / 低风险', () => {
    expect(getTrafficLight(makeProject({ actualInitialDate: '2026-04-20' }), 'initial'))
      .toEqual({ label: '已完成', cssClass: 'traffic-completed' });

    expect(getTrafficLight(makeProject({ planInitialDate: daysFromNow(-1), actualInitialDate: '' }), 'initial'))
      .toEqual({ label: '已滞后', cssClass: 'traffic-delayed' });

    expect(getTrafficLight(makeProject({ planInitialDate: daysFromNow(30), actualInitialDate: '' }), 'initial'))
      .toEqual({ label: '预警', cssClass: 'traffic-pending' });

    expect(getTrafficLight(makeProject({ planInitialDate: daysFromNow(200), actualInitialDate: '' }), 'initial'))
      .toEqual({ label: '低风险', cssClass: 'traffic-completed' });

    expect(getTrafficLight(makeProject({ planInitialDate: '', actualInitialDate: '' }), 'initial')).toBeNull();
  });
});

describe('projectTableRow > 行模型', () => {
  const columns = buildProjectColumns({
    columnNames: ['项目编号', '项目名称', '项目经理', '立项收入(元)', '项目状态'],
    tab: 'initial',
  });

  test('按列生成单元格，并给出正确的 type（供插槽匹配）', () => {
    const model = buildProjectRow(makeProject(), { columns, tab: 'initial' });
    const byKey = Object.fromEntries(model.cells.map((cell) => [cell.key, cell]));

    expect(model.key).toBe('p1');
    expect(byKey['项目名称'].type).toBe('link');
    expect(byKey['项目名称'].projectId).toBe('p1');
    expect(byKey['项目状态'].type).toBe('status');
    expect(byKey['立项收入(元)'].type).toBe('amount');
    expect(byKey['立项收入(元)'].text).toBe('1,234,567');
    expect(byKey['验收倒计时'].type).toBe('countdown');
    expect(byKey['项目编号'].cellClass).toBe('col-project-code');
    expect(byKey['项目名称'].cellClass).toBe('col-project-name');
  });

  test('日期列取对应 Tab 的计划/实际时间，实际为空显示占位符', () => {
    const model = buildProjectRow(makeProject(), { columns, tab: 'initial' });
    const byKey = Object.fromEntries(model.cells.map((cell) => [cell.key, cell]));

    expect(byKey['计划初验时间'].text).toBe('2026-04-30');
    expect(byKey['实际初验时间'].text).toBe('2026-04-20');

    const finalModel = buildProjectRow(
      makeProject({ planFinalDate: '2026-12-31', actualFinalDate: '' }),
      { columns: buildProjectColumns({ columnNames: ['项目编号'], tab: 'final' }), tab: 'final' },
    );
    const finalById = Object.fromEntries(finalModel.cells.map((cell) => [cell.key, cell]));
    expect(finalById['计划终验时间'].text).toBe('2026-12-31');
    expect(finalById['实际终验时间'].text).toBe('-');
  });

  test('倒计时单元格拆成初验/终验两段状态', () => {
    const model = buildProjectRow(
      makeProject({ actualInitialDate: '2026-04-20', actualFinalDate: '', planFinalDate: daysFromNow(0) }),
      { columns, tab: 'initial' },
    );
    const countdown = model.cells.find((cell) => cell.key === '验收倒计时').countdown;

    expect(countdown.initial).toEqual({ state: 'done' });
    expect(countdown.final).toMatchObject({ state: 'pending', text: '今天', color: 'red' });

    const naModel = buildProjectRow(
      makeProject({ planInitialDate: '', actualInitialDate: '', planFinalDate: '', actualFinalDate: '' }),
      { columns, tab: 'initial' },
    );
    expect(naModel.cells.find((cell) => cell.key === '验收倒计时').countdown.initial).toEqual({ state: 'na' });
  });
});
