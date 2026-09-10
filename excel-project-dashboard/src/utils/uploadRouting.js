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
  },
  'self-funded': {
    keyword: '自筹项目台账列表',
    skipRows: 1,
    cleaner: cleanSelfFundedData,
    label: '自筹项目',
  },
  // 支出合同事项表：首行为标题，需跳过；数据仅用于成本模块匹配实际支出
  contract: {
    keyword: '支出合同事项',
    skipRows: CONTRACT_SKIP_ROWS,
    cleaner: cleanContractData,
    label: '支出合同',
  },
};

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
