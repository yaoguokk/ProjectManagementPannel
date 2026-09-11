/**
 * A 区域批量上传的路由与校验（纯函数，便于单测）
 *
 * 交互约定：在任意「选择文件」入口都可以一次选择 1-3 个 Excel，
 * 系统按文件名中的关键词自动分发到对应的数据入口：
 *   - 经营项目台账明细列表 -> business
 *   - 自筹项目台账列表     -> self-funded
 *   - 支出合同事项         -> contract
 *
 * 校验是「整批原子」的：只要出现无法识别的文件、同类型重复（如 2 份自筹台账）
 * 或超出数量上限，就整批拒绝（ok: false + 全部错误原因），不解析任何文件。
 *
 * 数据集注册表职责：新增一类数据源时，只在这里加一条配置（关键词 / 清洗器 /
 * 是否进入项目列表 / 合并顺序 / 计数单位），上传分派、项目列表合并与导入提示
 * 都会自动跟进，无需改 Dashboard 或组件。
 */
import { cleanExcelData, cleanSelfFundedData, cleanContractData } from './dataCleaner';
import { CONTRACT_SKIP_ROWS } from '../constants/costCategory';

/** 各数据入口的识别关键词与解析配置 */
export const ACCEPT_CONFIG = {
  business: {
    keyword: '经营项目台账明细列表',
    skipRows: 0,
    cleaner: cleanExcelData,
    label: '经营项目',
    // 上传卡片标题（A 区域按注册表渲染入口）
    uploadTitle: '经营项目台账上传',
    // 是否参与「项目列表 / KPI / 成本分析」的数据合并
    feedsProjectList: true,
    // 合并顺序：数值小的排在前面（自筹在前、经营在后，与既有展示一致）
    mergeOrder: 1,
    // 导入提示的计数单位
    countUnit: '个',
  },
  'self-funded': {
    keyword: '自筹项目台账列表',
    skipRows: 1,
    cleaner: cleanSelfFundedData,
    label: '自筹项目',
    uploadTitle: '自筹项目台账上传',
    feedsProjectList: true,
    mergeOrder: 0,
    countUnit: '个',
  },
  // 支出合同事项表：首行为标题，需跳过；数据仅用于成本模块匹配实际支出
  contract: {
    keyword: '支出合同事项',
    skipRows: CONTRACT_SKIP_ROWS,
    cleaner: cleanContractData,
    label: '支出合同',
    uploadTitle: '支出合同事项上传',
    feedsProjectList: false,
    mergeOrder: 2,
    countUnit: '条',
  },
};

/** 全部数据集类型（key 与 ACCEPT_CONFIG 一致，也是 datasets 的存储 key） */
export const DATASET_TYPES = Object.keys(ACCEPT_CONFIG);

/** 数据集注册表视图：供界面按注册顺序渲染上传入口等 */
export const datasetOptions = () => DATASET_TYPES.map((type) => ({ type, ...ACCEPT_CONFIG[type] }));

/** 参与项目列表合并的数据集类型：按注册表的 mergeOrder 升序 */
export const projectDatasetTypes = () =>
  DATASET_TYPES
    .filter((type) => ACCEPT_CONFIG[type].feedsProjectList)
    .sort((a, b) => ACCEPT_CONFIG[a].mergeOrder - ACCEPT_CONFIG[b].mergeOrder);

/** 单次批量上传的数量上限（经营 / 自筹 / 支出合同各 1 份） */
export const MAX_UPLOAD_FILES = 3;

/** 所有关键词的提示文案（用于错误信息与界面提示） */
export const KEYWORD_HINT_TEXT = Object.values(ACCEPT_CONFIG)
  .map((item) => `「${item.keyword}」`)
  .join('、');

/** 按文件名关键词识别数据入口；识别不了返回 null */
export const matchAcceptType = (fileName) =>
  Object.keys(ACCEPT_CONFIG).find((type) => fileName.includes(ACCEPT_CONFIG[type].keyword)) || null;

/**
 * 生成导入成功提示文案（与上传分派同一份注册表，新增数据集无需改调用方）
 * @param {string} type     本次导入的数据集类型
 * @param {Array}  rows     本次导入的清洗结果
 * @param {Object} datasets 导入后的全量数据集快照 { [type]: rows }
 * @param {string} fileName 文件名
 */
export const buildImportMessage = (type, rows = [], datasets = {}, fileName = '') => {
  const config = ACCEPT_CONFIG[type];
  const suffix = fileName ? `（${fileName}）` : '';
  if (!config) return `成功导入 ${rows.length} 条${suffix}`;

  // 非项目类数据集（支出合同）单独提示，不参与项目数合并
  if (!config.feedsProjectList) {
    return `成功导入${config.label} ${rows.length} ${config.countUnit}${suffix}`;
  }

  const parts = projectDatasetTypes()
    .filter((key) => (datasets[key] || []).length > 0)
    .map((key) => `${ACCEPT_CONFIG[key].label}${datasets[key].length}${ACCEPT_CONFIG[key].countUnit}`);

  // 同时存在经营与自筹时给出分项数量，单一时只给总数（与既有文案一致）
  if (parts.length > 1) return `成功导入 ${parts.join(' + ')} 项目${suffix}`;
  return `成功导入 ${rows.length} ${config.countUnit} 项目${suffix}`;
};

/**
 * 对一次选择的多个文件做路由与整批校验
 * @param   {string[]} fileNames 本次选择的文件名列表
 * @returns {{ routes: Array<{fileName: string, acceptType: string}>, errors: string[], ok: boolean }}
 */
export const routeUploadFiles = (fileNames = []) => {
  const errors = [];
  const routes = [];

  if (fileNames.length === 0) {
    errors.push('未选择任何文件');
  } else if (fileNames.length > MAX_UPLOAD_FILES) {
    errors.push(`一次最多选择 ${MAX_UPLOAD_FILES} 个文件，当前选择了 ${fileNames.length} 个`);
  }

  const namesByType = {};
  fileNames.forEach((fileName) => {
    const acceptType = matchAcceptType(fileName);
    if (!acceptType) {
      errors.push(`无法识别文件「${fileName}」：文件名需包含 ${KEYWORD_HINT_TEXT}`);
      return;
    }
    (namesByType[acceptType] ||= []).push(fileName);
    routes.push({ fileName, acceptType });
  });

  Object.entries(namesByType).forEach(([acceptType, names]) => {
    if (names.length > 1) {
      errors.push(
        `${ACCEPT_CONFIG[acceptType].label}文件一次只能上传 1 份，当前选择了 ${names.length} 份（${names.join('、')}）`
      );
    }
  });

  return { routes, errors, ok: errors.length === 0 };
};
