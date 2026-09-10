/**
 * 成本管控模块常量定义
 *
 * 设计要点：成本分类全部走配置，新增成本类型只需在此追加一项，组件零改动。
 */

/**
 * 成本分类定义
 * @property {string}      key          - 程序内部键（用作成本行数据对象的字段名）
 * @property {string}      label        - 界面展示名称
 * @property {string}      projectField - 台账中的立项成本列名（经营/自筹台账通用）
 * @property {string|null} contractType - 支出合同事项中「支出合同类型」的取值；null 表示实际支出数据源尚未接入
 * @property {boolean}     active       - 是否参与计算与展示（预留位为 false）
 */
export const COST_CATEGORIES = [
  // —— 当前已核对的两类 ——
  {
    key: 'subcontract',
    label: '项目分包费',
    projectField: '项目分包费(元)',
    contractType: '项目分包',
    active: true,
  },
  {
    key: 'hardware',
    label: '软硬件采购',
    projectField: '软硬件采购（元）',
    contractType: '软硬件',
    active: true,
  },
  // —— 预留位：立项成本列已存在，支出合同暂无对应类型，待数据源接入后置 active: true ——
  {
    key: 'laborOutsource',
    label: '劳务外包费',
    projectField: '劳务外包费(元)',
    contractType: null,
    active: false,
  },
  {
    key: 'laborAllocation',
    label: '人工分摊费用',
    projectField: '人工分摊费用(元)',
    contractType: null,
    active: false,
  },
];

/** 参与计算与展示的成本分类 */
export const ACTIVE_COST_CATEGORIES = COST_CATEGORIES.filter((category) => category.active);

/**
 * 支出合同中与成本分类无关、需显式忽略的类型
 * 注意：未出现在 COST_CATEGORIES.contractType 中的取值同样会被忽略，此处仅作语义声明
 */
export const IGNORED_CONTRACT_TYPES = ['项目管理', '其他'];

/** 支出合同事项表首行是标题（非表头），解析时需跳过 */
export const CONTRACT_SKIP_ROWS = 1;

/** 成本明细表的超支筛选模式 */
export const OverBudgetFilter = {
  ALL: 'all',
  OVER: 'over',
  NORMAL: 'normal',
};
