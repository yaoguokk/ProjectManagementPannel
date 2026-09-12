import {
  buildContractCostMap,
  buildContractIndex,
  calculateCostAnalysis,
  filterCostRows,
  buildCostExportTable,
  matchesContractRule,
} from '../src/data/costData';
import {
  COST_CATEGORIES,
  ACTIVE_COST_CATEGORIES,
  ContractRuleMode,
  OverBudgetFilter,
  createDefaultContractRules,
} from '../src/constants/costCategory';
import { DepartmentDisplay } from '../src/utils/departmentDisplay';

const DATE_RANGE = { start: '2026-01-01', end: '2026-12-31' };

const makeProject = (overrides = {}) => ({
  id: 'p1',
  projectCode: 'PRJ-001',
  projectName: '智慧城市项目',
  manager: '张三',
  department: '信息技术部',
  // 内部口径（经营 / 自筹）与台账原始「项目类型」列并存
  projectType: '经营项目',
  '项目类型': '研究咨询类',
  planFinalDate: '2026-06-30',
  actualFinalDate: '',
  '项目分包费(元)': '1000000',
  '软硬件采购（元）': '2000000',
  ...overrides,
});

const makeContract = (overrides = {}) => ({
  projectCode: 'PRJ-001',
  contractType: '项目分包',
  amount: 100000,
  ...overrides,
});

describe('成本分类配置', () => {
  test('预留分类（劳务外包费/人工分摊费用）不应参与计算', () => {
    const activeKeys = ACTIVE_COST_CATEGORIES.map((item) => item.key);
    expect(activeKeys).toEqual(['subcontract', 'hardware']);

    const reserved = COST_CATEGORIES.filter((item) => !item.active).map((item) => item.key);
    expect(reserved).toContain('laborOutsource');
    expect(reserved).toContain('laborAllocation');
  });
});

describe('buildContractCostMap', () => {
  test('应按项目编号聚合同类支出金额', () => {
    const map = buildContractCostMap([
      makeContract({ amount: 100 }),
      makeContract({ amount: 200 }),
      makeContract({ contractType: '软硬件', amount: 50 }),
    ]);

    expect(map.get('PRJ-001')).toEqual({ subcontract: 300, hardware: 50 });
  });

  test('应忽略未纳入成本分类的支出类型（项目管理 / 其他）', () => {
    const map = buildContractCostMap([
      makeContract({ contractType: '项目管理', amount: 999 }),
      makeContract({ contractType: '其他', amount: 999 }),
      makeContract({ contractType: '', amount: 999 }),
    ]);

    expect(map.size).toBe(0);
  });

  test('应忽略项目编号为空的记录', () => {
    const map = buildContractCostMap([makeContract({ projectCode: '', amount: 100 })]);
    expect(map.size).toBe(0);
  });

  test('空输入应返回空 Map', () => {
    expect(buildContractCostMap().size).toBe(0);
    expect(buildContractCostMap([]).size).toBe(0);
  });
});

describe('buildContractIndex', () => {
  test('应同时产出金额索引与合同明细索引', () => {
    const { amountMap, detailMap } = buildContractIndex([
      makeContract({ id: 'c1', amount: 100 }),
      makeContract({ id: 'c2', amount: 200 }),
    ]);

    expect(amountMap.get('PRJ-001')).toEqual({ subcontract: 300 });
    expect(detailMap.get('PRJ-001').subcontract.map((item) => item.id)).toEqual(['c1', 'c2']);
  });

  test('应忽略未纳入成本分类的类型与空项目编号', () => {
    const { amountMap, detailMap } = buildContractIndex([
      makeContract({ contractType: '项目管理', amount: 999 }),
      makeContract({ projectCode: '', amount: 999 }),
    ]);

    expect(amountMap.size).toBe(0);
    expect(detailMap.size).toBe(0);
  });
});

describe('成本行 > 科目合同明细', () => {
  test('每个科目应挂载该科目的合同明细，并按事项金额倒序', () => {
    const contracts = [
      makeContract({ id: 'c1', contractType: '项目分包', amount: 100000 }),
      makeContract({ id: 'c2', contractType: '项目分包', amount: 900000 }),
      makeContract({ id: 'c3', contractType: '软硬件', amount: 50000 }),
    ];

    const { rows } = calculateCostAnalysis([makeProject()], contracts, { dateRange: DATE_RANGE });
    const [subcontract, hardware] = rows[0].categories;

    expect(subcontract.contracts.map((item) => item.id)).toEqual(['c2', 'c1']);
    expect(hardware.contracts.map((item) => item.id)).toEqual(['c3']);
  });

  test('无支出合同时各科目明细应为空数组', () => {
    const { rows } = calculateCostAnalysis([makeProject()], [], { dateRange: DATE_RANGE });
    const allEmpty = rows[0].categories.every(
      (item) => Array.isArray(item.contracts) && item.contracts.length === 0
    );

    expect(allEmpty).toBe(true);
  });

  test('科目明细不应串到其他项目', () => {
    const projects = [
      makeProject({ id: 'p1', projectCode: 'A' }),
      makeProject({ id: 'p2', projectCode: 'B' }),
    ];
    const contracts = [makeContract({ id: 'c1', projectCode: 'A', amount: 100 })];

    const { rows } = calculateCostAnalysis(projects, contracts, { dateRange: DATE_RANGE });
    const rowA = rows.find((row) => row.projectCode === 'A');
    const rowB = rows.find((row) => row.projectCode === 'B');

    expect(rowA.categories[0].contracts).toHaveLength(1);
    expect(rowB.categories[0].contracts).toHaveLength(0);
  });
});

describe('calculateCostAnalysis > 过滤', () => {
  test('应按 项目计划终验时间含变更 落在日期范围内过滤', () => {
    const projects = [
      makeProject({ id: 'p1', projectCode: 'A', planFinalDate: '2026-06-30' }),
      makeProject({ id: 'p2', projectCode: 'B', planFinalDate: '2027-01-01' }),
    ];

    const { rows } = calculateCostAnalysis(projects, [], { dateRange: DATE_RANGE });
    expect(rows).toHaveLength(1);
    expect(rows[0].projectCode).toBe('A');
  });

  test('计划终验时间为空的项目应被排除', () => {
    const projects = [makeProject({ planFinalDate: '' })];
    const { rows } = calculateCostAnalysis(projects, [], { dateRange: DATE_RANGE });
    expect(rows).toHaveLength(0);
  });

  test('应按项目类型过滤', () => {
    const projects = [
      makeProject({ id: 'p1', projectCode: 'A', projectType: '经营项目' }),
      makeProject({ id: 'p2', projectCode: 'B', projectType: '自筹项目' }),
    ];

    const { rows } = calculateCostAnalysis(projects, [], {
      dateRange: DATE_RANGE,
      projectType: '自筹项目',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].projectType).toBe('自筹项目');
  });

  test('成本行应透传台账原始「项目类型」，同时保留内部经营 / 自筹口径', () => {
    const { rows } = calculateCostAnalysis(
      [makeProject({ projectType: '自筹项目', '项目类型': '技术研究类-基础研究' })],
      [],
      { dateRange: DATE_RANGE }
    );

    expect(rows[0].projectTypeLabel).toBe('技术研究类-基础研究');
    // 内部口径仍供 B 区域筛选与成本过滤使用，未被覆盖
    expect(rows[0].projectType).toBe('自筹项目');
  });

  test('台账缺「项目类型」列时透传字段回退为空串', () => {
    const { rows } = calculateCostAnalysis(
      [makeProject({ '项目类型': '' })],
      [],
      { dateRange: DATE_RANGE }
    );

    expect(rows[0].projectTypeLabel).toBe('');
  });
});

describe('calculateCostAnalysis > 成本计算', () => {
  test('无匹配支出合同时实际支出为 0', () => {
    const { rows } = calculateCostAnalysis([makeProject()], [], { dateRange: DATE_RANGE });
    const [row] = rows;

    expect(row.actualTotal).toBe(0);
    expect(row.categories.every((item) => item.actual === 0)).toBe(true);
    expect(row.overallOver).toBe(false);
    expect(row.categoryOver).toBe(false);
    expect(row.hasOverBudget).toBe(false);
  });

  test('应按分类计算立项 / 实际 / 差额', () => {
    const contracts = [
      makeContract({ contractType: '项目分包', amount: 1200000 }),
      makeContract({ contractType: '软硬件', amount: 500000 }),
    ];

    const { rows } = calculateCostAnalysis([makeProject()], contracts, { dateRange: DATE_RANGE });
    const [row] = rows;
    const [subcontract, hardware] = row.categories;

    expect(subcontract).toMatchObject({
      key: 'subcontract', label: '项目分包费', budget: 1000000, actual: 1200000, diff: 200000, over: true,
    });
    expect(hardware).toMatchObject({
      key: 'hardware', label: '软硬件采购', budget: 2000000, actual: 500000, diff: -1500000, over: false,
    });

    expect(row.budgetTotal).toBe(3000000);
    expect(row.actualTotal).toBe(1700000);
    expect(row.diffTotal).toBe(-1300000);
    expect(row.overCategories).toEqual(['项目分包费']);
    expect(row.categoryOver).toBe(true);
    expect(row.overallOver).toBe(false);
    expect(row.hasOverBudget).toBe(true);
  });

  test('合计实际 > 合计立项时应判定为整体超支', () => {
    const projects = [makeProject({
      '项目分包费(元)': '1000000',
      '软硬件采购（元）': '1000000',
    })];
    const contracts = [
      makeContract({ contractType: '项目分包', amount: 900000 }),
      makeContract({ contractType: '软硬件', amount: 1500000 }),
    ];

    const { rows } = calculateCostAnalysis(projects, contracts, { dateRange: DATE_RANGE });
    const [row] = rows;

    expect(row.overCategories).toEqual(['软硬件采购']);
    expect(row.overallOver).toBe(true);
    expect(row.hasOverBudget).toBe(true);
  });

  test('预留成本分类不应计入立项合计', () => {
    const projects = [makeProject({ '劳务外包费(元)': '500000', '人工分摊费用(元)': '300000' })];
    const { rows } = calculateCostAnalysis(projects, [], { dateRange: DATE_RANGE });
    const [row] = rows;

    expect(row.categories.map((item) => item.key)).toEqual(['subcontract', 'hardware']);
    expect(row.budgetTotal).toBe(3000000);
  });
});

describe('calculateCostAnalysis > 汇总', () => {
  test('应正确汇总项目数、总金额、超支项目数与超支金额', () => {
    const projects = [
      makeProject({ id: 'p1', projectCode: 'A', '项目分包费(元)': '1000000', '软硬件采购（元）': '0' }),
      makeProject({ id: 'p2', projectCode: 'B', '项目分包费(元)': '1000000', '软硬件采购（元）': '0' }),
    ];
    const contracts = [
      makeContract({ projectCode: 'A', contractType: '项目分包', amount: 1500000 }),
      makeContract({ projectCode: 'B', contractType: '项目分包', amount: 500000 }),
    ];

    const { summary } = calculateCostAnalysis(projects, contracts, { dateRange: DATE_RANGE });

    expect(summary.projectCount).toBe(2);
    expect(summary.totalBudget).toBe(2000000);
    expect(summary.totalActual).toBe(2000000);
    expect(summary.totalDiff).toBe(0);
    expect(summary.overProjectCount).toBe(1);
    expect(summary.overAmount).toBe(500000);
    expect(summary.overRate).toBe(50);
    expect(summary.categoryTotals).toEqual([
      { key: 'subcontract', label: '项目分包费', budget: 2000000, actual: 2000000, diff: 0, over: false },
      { key: 'hardware', label: '软硬件采购', budget: 0, actual: 0, diff: 0, over: false },
    ]);
  });

  test('typeTotals 应按台账项目类型聚合超支项目数与超支金额', () => {
    const projects = [
      // 研究咨询类：A 超支 50 万，B 正常
      makeProject({ id: 'p1', projectCode: 'A', '项目类型': '研究咨询类', '项目分包费(元)': '1000000', '软硬件采购（元）': '0' }),
      makeProject({ id: 'p2', projectCode: 'B', '项目类型': '研究咨询类', '项目分包费(元)': '1000000', '软硬件采购（元）': '0' }),
      // 产品销售类：C 超支 30 万
      makeProject({ id: 'p3', projectCode: 'C', '项目类型': '产品销售类', '项目分包费(元)': '1000000', '软硬件采购（元）': '0' }),
      // 项目类型缺失 → 归入 '-'
      makeProject({ id: 'p4', projectCode: 'D', '项目类型': '', '项目分包费(元)': '0', '软硬件采购（元）': '0' }),
    ];
    const contracts = [
      makeContract({ projectCode: 'A', contractType: '项目分包', amount: 1500000 }),
      makeContract({ projectCode: 'B', contractType: '项目分包', amount: 500000 }),
      makeContract({ projectCode: 'C', contractType: '项目分包', amount: 1300000 }),
    ];

    const { summary } = calculateCostAnalysis(projects, contracts, { dateRange: DATE_RANGE });

    expect(summary.typeTotals).toEqual([
      { label: '研究咨询类', total: 2, overProjectCount: 1, overAmount: 500000, overRate: 50 },
      { label: '产品销售类', total: 1, overProjectCount: 1, overAmount: 300000, overRate: 100 },
      { label: '-', total: 1, overProjectCount: 0, overAmount: 0, overRate: 0 },
    ]);
  });

  test('typeTotals 排序应稳定：超支项目数相同再比超支金额', () => {
    const projects = [
      makeProject({ id: 'p1', projectCode: 'A', '项目类型': '乙类', '项目分包费(元)': '0', '软硬件采购（元）': '0' }),
      makeProject({ id: 'p2', projectCode: 'B', '项目类型': '甲类', '项目分包费(元)': '0', '软硬件采购（元）': '0' }),
    ];
    const contracts = [
      makeContract({ projectCode: 'A', contractType: '项目分包', amount: 100 }),
      makeContract({ projectCode: 'B', contractType: '项目分包', amount: 300 }),
    ];

    const { summary } = calculateCostAnalysis(projects, contracts, { dateRange: DATE_RANGE });

    expect(summary.typeTotals.map((item) => item.label)).toEqual(['甲类', '乙类']);
  });

  test('无数据时汇总应全部为 0', () => {
    const { rows, summary } = calculateCostAnalysis([], [], { dateRange: DATE_RANGE });
    expect(rows).toEqual([]);
    expect(summary.projectCount).toBe(0);
    expect(summary.totalBudget).toBe(0);
    expect(summary.overRate).toBe(0);
    expect(summary.typeTotals).toEqual([]);
  });
});

describe('filterCostRows', () => {
  const rows = [
    { id: 'a', hasOverBudget: true },
    { id: 'b', hasOverBudget: false },
    { id: 'c', hasOverBudget: true },
  ];

  test('ALL 应返回全部', () => {
    expect(filterCostRows(rows, OverBudgetFilter.ALL)).toHaveLength(3);
  });

  test('OVER 只返回超支项目', () => {
    expect(filterCostRows(rows, OverBudgetFilter.OVER).map((row) => row.id)).toEqual(['a', 'c']);
  });

  test('NORMAL 只返回未超支项目', () => {
    expect(filterCostRows(rows, OverBudgetFilter.NORMAL).map((row) => row.id)).toEqual(['b']);
  });

  test('空输入应返回空数组', () => {
    expect(filterCostRows()).toEqual([]);
  });
});

describe('buildCostExportTable', () => {
  const overBudgetRows = () => {
    const contracts = [makeContract({ contractType: '项目分包', amount: 1200000 })];
    return calculateCostAnalysis([makeProject()], contracts, { dateRange: DATE_RANGE }).rows;
  };

  test('缺省时导出表格全部列（含各成本分类与合计）', () => {
    const { headers } = buildCostExportTable(overBudgetRows());
    expect(headers).toEqual([
      '项目编号', '项目名称', '项目经理', '业务部所', '项目类型', '计划终验时间',
      '项目分包费-立项成本', '项目分包费-实际支出', '项目分包费-差额',
      '软硬件采购-立项成本', '软硬件采购-实际支出', '软硬件采购-差额',
      '立项成本合计', '实际支出合计', '差额合计', '超支成本类型', '是否超支',
    ]);
  });

  test('传入可见列时只导出这些列，顺序与表格一致', () => {
    const { headers } = buildCostExportTable(overBudgetRows(), [
      '项目编号', '项目分包费-立项', '项目分包费-实际', '项目分包费-差额', '状态',
    ]);
    expect(headers).toEqual([
      '项目编号', '项目分包费-立项成本', '项目分包费-实际支出', '项目分包费-差额', '是否超支',
    ]);
  });

  test('「操作」等非数据列不参与导出', () => {
    const { headers } = buildCostExportTable(overBudgetRows(), ['项目编号', '操作']);
    expect(headers).toEqual(['项目编号']);
  });

  test('数据行长度应与表头一致，金额为数值并正确标记超支', () => {
    const { headers, data } = buildCostExportTable(overBudgetRows());

    expect(data).toHaveLength(1);
    expect(data[0]).toHaveLength(headers.length);
    expect(data[0][0]).toBe('PRJ-001');
    // 导出台账原值，与表格展示同口径（内部经营 / 自筹口径不参与展示与导出）
    expect(data[0][headers.indexOf('项目类型')]).toBe('研究咨询类');
    expect(data[0][headers.indexOf('项目分包费-立项成本')]).toBe(1000000);
    expect(data[0][headers.indexOf('项目分包费-实际支出')]).toBe(1200000);
    expect(data[0][headers.indexOf('项目分包费-差额')]).toBe(200000);
    expect(data[0][headers.indexOf('超支成本类型')]).toBe('项目分包费');
    expect(data[0][headers.indexOf('是否超支')]).toBe('超支');
  });

  test('业务部所导出跟随展示方式（所见即所得）', () => {
    const contracts = [makeContract({ contractType: '项目分包', amount: 1200000 })];
    const rows = calculateCostAnalysis(
      [makeProject({ department: 'A公司/B公司/产品研发部' })],
      contracts,
      { dateRange: DATE_RANGE }
    ).rows;

    const full = buildCostExportTable(rows, ['业务部所']);
    expect(full.data[0][0]).toBe('A公司/B公司/产品研发部');

    const onlyDepartment = buildCostExportTable(rows, ['业务部所'], {
      departmentMode: DepartmentDisplay.LAST_SEGMENT,
    });
    expect(onlyDepartment.data[0][0]).toBe('产品研发部');
  });

  test('未超支项目的超支成本类型应显示为 -', () => {
    const { rows } = calculateCostAnalysis([makeProject()], [], { dateRange: DATE_RANGE });
    const { headers, data } = buildCostExportTable(rows);

    expect(data[0][headers.indexOf('超支成本类型')]).toBe('-');
    expect(data[0][headers.indexOf('是否超支')]).toBe('正常');
  });
});

describe('matchesContractRule > 多列取「或」', () => {
  const rule = {
    mode: ContractRuleMode.EXCLUDE,
    keywords: ['专利', '造价'],
    matchFields: ['contractName', 'itemName', 'contractSummary'],
  };

  test('任一匹配列命中即算命中（合同名称 / 事项名称 / 合同内容简述）', () => {
    expect(matchesContractRule({ contractName: '2026年专利、软著申请代理服务采购项目' }, rule)).toBe(true);
    expect(matchesContractRule({ itemName: '造价评审' }, rule)).toBe(true);
    expect(matchesContractRule({ contractSummary: '包含专利年费' }, rule)).toBe(true);
  });

  test('三列均不含关键词时不算命中', () => {
    expect(matchesContractRule({
      contractName: '工程施工分包合同',
      itemName: '土建施工',
      contractSummary: '现场施工与验收',
    }, rule)).toBe(false);
  });

  test('仅匹配已配置的列，未配置列不参与判断', () => {
    const onlyName = { keywords: ['专利'], matchFields: ['contractName'] };
    expect(matchesContractRule({ contractName: '常规分包', itemName: '专利代理' }, onlyName)).toBe(false);
  });

  test('关键词大小写不敏感、首尾空格被忽略', () => {
    expect(matchesContractRule({ contractName: 'ABC Patent 服务' }, {
      keywords: ['  abc  '],
      matchFields: ['contractName'],
    })).toBe(true);
  });

  test('未设置关键词（或未传规则）时一律不命中，等价于不过滤', () => {
    expect(matchesContractRule({ contractName: '专利代理服务' }, { keywords: [] })).toBe(false);
    expect(matchesContractRule({ contractName: '专利代理服务' }, { keywords: [' ', ''] })).toBe(false);
    expect(matchesContractRule({ contractName: '专利代理服务' }, undefined)).toBe(false);
  });
});

describe('项目分包费 > 关键词规则口径', () => {
  const contracts = [
    makeContract({ id: 'c1', amount: 100000, contractName: '工程施工分包合同', itemName: '土建施工' }),
    makeContract({
      id: 'c2',
      amount: 40000,
      contractName: '2026年专利、软著申请代理服务采购项目专项技术服务订单合同',
      itemName: '知识产权事务费',
    }),
    makeContract({ id: 'c3', amount: 6000, contractName: '项目造价评审服务结算协议', itemName: '造价评审' }),
    makeContract({
      id: 'c4',
      amount: 50000,
      contractType: '软硬件',
      contractName: '测试仪采购合同',
      itemName: '测试仪',
    }),
  ];

  const analyze = (rules) =>
    calculateCostAnalysis([makeProject()], contracts, { dateRange: DATE_RANGE }, { contractRules: rules });

  test('默认（exclude）应剔除命中关键词的合同，金额与明细同步剔除', () => {
    const { rows, ruleStats } = analyze(createDefaultContractRules());
    const [subcontract, hardware] = rows[0].categories;

    expect(subcontract.actual).toBe(100000);
    expect(subcontract.diff).toBe(-900000);
    expect(subcontract.over).toBe(false);
    expect(subcontract.contracts.map((item) => item.id)).toEqual(['c1']);

    // 未配置规则的分类不受影响：软硬件合同名称含「测试」仍照常计入
    expect(hardware.actual).toBe(50000);
    expect(hardware.contracts.map((item) => item.id)).toEqual(['c4']);

    expect(ruleStats.subcontract).toMatchObject({
      total: 3,
      kept: 1,
      excluded: 2,
      excludedAmount: 46000,
      mode: ContractRuleMode.EXCLUDE,
    });
  });

  test('include 模式应只保留命中关键词的合同', () => {
    const rules = createDefaultContractRules();
    rules.subcontract.mode = ContractRuleMode.INCLUDE;

    const { rows, ruleStats } = analyze(rules);
    const [subcontract] = rows[0].categories;

    expect(subcontract.actual).toBe(46000);
    // 明细按事项金额倒序
    expect(subcontract.contracts.map((item) => item.id)).toEqual(['c2', 'c3']);
    expect(ruleStats.subcontract).toMatchObject({
      total: 3,
      kept: 2,
      keptAmount: 46000,
      excluded: 1,
      excludedAmount: 100000,
    });
  });

  test('清空关键词应回退到「仅按支出合同类型」的全量口径', () => {
    const rules = createDefaultContractRules();
    rules.subcontract.keywords = [];

    const { rows, ruleStats } = analyze(rules);

    expect(rows[0].categories[0].actual).toBe(146000);
    expect(ruleStats.subcontract).toMatchObject({ total: 3, kept: 3, excluded: 0, excludedAmount: 0 });
  });

  test('未配置规则的分类不产生口径统计条目', () => {
    const { ruleStats } = analyze(createDefaultContractRules());
    expect(Object.keys(ruleStats)).toEqual(['subcontract']);
  });

  test('不传规则时行为与改造前一致（全量统计）', () => {
    const { rows, ruleStats } = calculateCostAnalysis([makeProject()], contracts, { dateRange: DATE_RANGE });

    expect(rows[0].categories[0].actual).toBe(146000);
    expect(ruleStats).toEqual({});
  });

  test('被剔除的合同不参与超支判定', () => {
    const projects = [makeProject({ '项目分包费(元)': '50000' })];
    const { rows } = calculateCostAnalysis(
      projects,
      [makeContract({ id: 'c1', amount: 80000, contractName: '专利代理服务' })],
      { dateRange: DATE_RANGE },
      { contractRules: createDefaultContractRules() }
    );

    expect(rows[0].categories[0].actual).toBe(0);
    expect(rows[0].categories[0].over).toBe(false);
    expect(rows[0].hasOverBudget).toBe(false);
  });

  test('buildContractIndex 应按规则产出 ruleStats', () => {
    const { amountMap, detailMap, ruleStats } = buildContractIndex(
      contracts,
      createDefaultContractRules()
    );

    expect(amountMap.get('PRJ-001')).toEqual({ subcontract: 100000, hardware: 50000 });
    expect(detailMap.get('PRJ-001').subcontract.map((item) => item.id)).toEqual(['c1']);
    expect(ruleStats.subcontract.excluded).toBe(2);
  });
});

describe('成本行透传台账原始列（供 E 区域「项目清单」列使用）', () => {
  test('台账原始列透传到成本行，派生字段仍覆盖同名台账值', () => {
    const project = makeProject({ '项目状态': '待终验', '立项收入(元)': '500000' });
    const { rows } = calculateCostAnalysis([project], [], { dateRange: DATE_RANGE });

    expect(rows[0]['项目状态']).toBe('待终验');
    expect(rows[0]['立项收入(元)']).toBe('500000');
    // 成本口径不受影响：内部项目类型与合计仍来自派生计算
    expect(rows[0].projectTypeLabel).toBe('研究咨询类');
    expect(rows[0].budgetTotal).toBe(3000000);
  });

  test('显式导出项目清单列时取台账原值（金额导出为数值）', () => {
    const project = makeProject({ '项目状态': '待终验', '立项收入(元)': '500000' });
    const { rows } = calculateCostAnalysis([project], [], { dateRange: DATE_RANGE });

    const { headers, data } = buildCostExportTable(rows, ['项目编号', '项目状态', '立项收入(元)']);

    expect(headers).toEqual(['项目编号', '项目状态', '立项收入(元)']);
    expect(data[0]).toEqual(['PRJ-001', '待终验', 500000]);
  });

  test('缺省导出不含项目清单列（与表格默认展示的列一致）', () => {
    const project = makeProject({ '项目状态': '待终验' });
    const { rows } = calculateCostAnalysis([project], [], { dateRange: DATE_RANGE });

    const { headers } = buildCostExportTable(rows);

    expect(headers).toContain('项目编号');
    expect(headers).not.toContain('项目状态');
    expect(headers).not.toContain('项目分包费(元)');
  });
});
