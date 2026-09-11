/**
 * 成本管控模块常量定义
 *
 * 设计要点：成本分类全部走配置，新增成本类型只需在此追加一项，组件零改动。
 */

/**
 * 合同关键词规则的判定模式
 * 说明：关键词规则作用在「支出合同类型」命中分类之后，用于二次修正口径，
 *      例如「项目分包」类型里混入的专利代理、造价评审、鉴定、测试等非分包业务。
 */
export const ContractRuleMode = {
  /** 剔除命中关键词的合同（默认口径）：不含关键词的才算该分类 */
  EXCLUDE: 'exclude',
  /** 仅保留命中关键词的合同：含关键词的才算该分类 */
  INCLUDE: 'include',
};

/** 项目分包费默认剔除的关键词（命中任意一个即视为非分包业务） */
export const DEFAULT_SUBCONTRACT_KEYWORDS = ['专利', '造价', '鉴定', '测试'];

/**
 * 关键词可匹配的合同字段
 * 多列之间为「或」关系：任一列命中关键词即视为命中规则
 */
export const CONTRACT_RULE_MATCH_FIELDS = [
  { field: 'contractName', label: '合同名称' },
  { field: 'itemName', label: '事项名称' },
  { field: 'contractSummary', label: '合同内容简述' },
];

/** 默认参与匹配的字段（三列全开，列之间取「或」） */
export const DEFAULT_CONTRACT_MATCH_FIELDS = CONTRACT_RULE_MATCH_FIELDS.map((item) => item.field);

/**
 * 关键词归一化：去首尾空格、丢弃空值、按大小写不敏感去重
 * 归一化后为空数组时表示「不参与过滤」，行为回到仅按支出合同类型统计
 * @param {Array<string>} keywords 原始关键词列表
 * @returns {Array<string>} 归一化后的关键词列表
 */
export const normalizeKeywords = (keywords = []) => {
  const seen = new Set();
  return keywords.reduce((result, item) => {
    const value = String(item ?? '').trim();
    if (!value) return result;

    const lower = value.toLowerCase();
    if (seen.has(lower)) return result;

    seen.add(lower);
    result.push(value);
    return result;
  }, []);
};

/**
 * 成本分类定义
 * @property {string}      key          - 程序内部键（用作成本行数据对象的字段名）
 * @property {string}      label        - 界面展示名称
 * @property {string}      projectField - 台账中的立项成本列名（经营/自筹台账通用）
 * @property {string|null} contractType - 支出合同事项中「支出合同类型」的取值；null 表示实际支出数据源尚未接入
 * @property {boolean}     active       - 是否参与计算与展示（预留位为 false）
 * @property {Object}      [keywordRule]- 可选：命中该分类后按关键词二次判定 { mode, keywords, matchFields }
 */
export const COST_CATEGORIES = [
  // —— 当前已核对的两类 ——
  {
    key: 'subcontract',
    label: '项目分包费',
    projectField: '项目分包费(元)',
    contractType: '项目分包',
    active: true,
    // 「项目分包」类型里混有专利代理、造价评审、鉴定、测试等非分包业务，需按关键词二次判定
    keywordRule: {
      mode: ContractRuleMode.EXCLUDE,
      keywords: DEFAULT_SUBCONTRACT_KEYWORDS,
      matchFields: DEFAULT_CONTRACT_MATCH_FIELDS,
    },
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
 * 生成分类关键词规则的默认值（深拷贝，避免界面编辑污染常量配置）
 * @returns {Object} { [分类 key]: { mode, keywords, matchFields } }
 */
export const createDefaultContractRules = () => {
  return COST_CATEGORIES.reduce((rules, category) => {
    if (category.keywordRule) {
      rules[category.key] = {
        mode: category.keywordRule.mode,
        keywords: [...category.keywordRule.keywords],
        matchFields: [...category.keywordRule.matchFields],
      };
    }
    return rules;
  }, {});
};

/** 声明了关键词规则的分类（界面按此渲染口径控件） */
export const CATEGORIES_WITH_KEYWORD_RULE = COST_CATEGORIES.filter(
  (category) => category.keywordRule
);

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
