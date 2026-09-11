import {
  buildOverBudgetOption,
  formatAmount,
  formatCount,
} from '../src/utils/costChartOption';

const TYPE_TOTALS = [
  { label: '研究咨询类', total: 2, overProjectCount: 1, overAmount: 500000, overRate: 50 },
  { label: '产品销售类', total: 1, overProjectCount: 1, overAmount: 300000, overRate: 100 },
];

describe('costChartOption > 双轴配置', () => {
  test('两个 y 轴：左轴为超支项目数（整数刻度），右轴为超支金额', () => {
    const option = buildOverBudgetOption(TYPE_TOTALS);

    expect(option.yAxis).toHaveLength(2);
    expect(option.yAxis[0]).toMatchObject({ type: 'value', name: '超支项目数', minInterval: 1 });
    expect(option.yAxis[1]).toMatchObject({ type: 'value', name: '超支金额' });
  });

  test('系列：柱=超支项目数（左轴），折线=超支金额（右轴）', () => {
    const option = buildOverBudgetOption(TYPE_TOTALS);

    expect(option.series.map((item) => [item.name, item.type])).toEqual([
      ['超支项目数', 'bar'],
      ['超支金额', 'line'],
    ]);
    expect(option.series[0].data).toEqual([1, 1]);
    expect(option.series[1].data).toEqual([500000, 300000]);
    // 柱默认走左轴，折线显式走右轴
    expect(option.series[0].yAxisIndex ?? 0).toBe(0);
    expect(option.series[1].yAxisIndex).toBe(1);
  });

  test('横轴取项目类型名并保持计算层给出的顺序', () => {
    const option = buildOverBudgetOption(TYPE_TOTALS);

    expect(option.xAxis.data).toEqual(['研究咨询类', '产品销售类']);
    expect(option.xAxis.axisLabel.interval).toBe(0);
    expect(option.legend.data).toEqual(['超支项目数', '超支金额']);
  });

  test('横轴标签过长时截断，完整名仍保留在横轴数据里', () => {
    const label = '非常非常非常非常长的类型名称';
    const option = buildOverBudgetOption([{ label, overProjectCount: 1, overAmount: 1 }]);

    expect(option.xAxis.axisLabel.formatter(label)).toBe('非常非常非常非常…');
    expect(option.xAxis.data).toEqual([label]);
  });
});

describe('costChartOption > tooltip', () => {
  const option = buildOverBudgetOption(TYPE_TOTALS);
  const params = [
    { axisValue: '研究咨询类', seriesName: '超支项目数', value: 1, marker: '●' },
    { axisValue: '研究咨询类', seriesName: '超支金额', value: 500000, marker: '●' },
  ];

  test('超支项目数带「个」，超支金额带 ¥ 千分位（不能统一按金额格式化）', () => {
    const html = option.tooltip.formatter(params);

    expect(html).toContain('研究咨询类');
    expect(html).toContain('超支项目数：1 个');
    expect(html).toContain('超支金额：¥500,000');
  });

  test('单点参数（非数组）也应正常格式化', () => {
    expect(option.tooltip.formatter(params[1])).toContain('超支金额：¥500,000');
  });

  test('无参数时返回空串且不报错', () => {
    expect(option.tooltip.formatter([])).toBe('');
  });
});

describe('costChartOption > 边界与格式化', () => {
  test('未传数据时返回安全的空配置', () => {
    const option = buildOverBudgetOption();

    expect(option.xAxis.data).toEqual([]);
    expect(option.series[0].data).toEqual([]);
    expect(option.series[1].data).toEqual([]);
  });

  test('字段缺失的行按 0 处理（空类型「-」不超支）', () => {
    const option = buildOverBudgetOption([{ label: '-' }]);

    expect(option.xAxis.data).toEqual(['-']);
    expect(option.series[0].data).toEqual([0]);
    expect(option.series[1].data).toEqual([0]);
  });

  test('格式化：金额千分位、数量带单位', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(1234567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0 个');
    expect(formatCount(3)).toBe('3 个');
  });
});
