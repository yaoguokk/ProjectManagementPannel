/**
 * A 区域批量上传路由与校验的单测
 * 对应交互：任一入口一次可选 1-3 个文件，按文件名关键词自动分发；
 * 同类型重复或包含无关文件时整批拒绝（组件层以 ok 为准，不解析任何文件）。
 */
import {
  routeUploadFiles,
  matchAcceptType,
  ACCEPT_CONFIG,
  MAX_UPLOAD_FILES,
  KEYWORD_HINT_TEXT,
} from '../src/utils/uploadRouting';

const BUSINESS = '2026年经营项目台账明细列表.xlsx';
const SELF_FUNDED = '自筹项目台账列表(1).xlsx';
const CONTRACT = '支出合同事项导出.xls';

describe('matchAcceptType', () => {
  test('按关键词识别三类文件', () => {
    expect(matchAcceptType(BUSINESS)).toBe('business');
    expect(matchAcceptType(SELF_FUNDED)).toBe('self-funded');
    expect(matchAcceptType(CONTRACT)).toBe('contract');
  });

  test('关键词出现在文件名任意位置均可识别', () => {
    expect(matchAcceptType('导出-支出合同事项-20260910.xlsx')).toBe('contract');
  });

  test('无关文件返回 null', () => {
    expect(matchAcceptType('工作总结.docx')).toBeNull();
    expect(matchAcceptType('')).toBeNull();
  });
});

describe('routeUploadFiles', () => {
  test('单个文件正常路由', () => {
    const { routes, errors, ok } = routeUploadFiles([BUSINESS]);

    expect(ok).toBe(true);
    expect(errors).toEqual([]);
    expect(routes).toEqual([{ fileName: BUSINESS, acceptType: 'business' }]);
  });

  test('一次选齐经营 + 自筹 + 支出合同 3 个文件', () => {
    const { routes, ok } = routeUploadFiles([SELF_FUNDED, CONTRACT, BUSINESS]);

    expect(ok).toBe(true);
    expect(routes.map((route) => route.acceptType)).toEqual(['self-funded', 'contract', 'business']);
  });

  test('两份自筹台账应整批拒绝并给出重复原因', () => {
    const a = '自筹项目台账列表A.xlsx';
    const b = '自筹项目台账列表B.xlsx';
    const { routes, errors, ok } = routeUploadFiles([a, b]);

    expect(ok).toBe(false);
    // 路由结果仍会给出，但组件层以 ok 为准，不会解析任何文件
    expect(routes).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('自筹项目');
    expect(errors[0]).toContain('2 份');
    expect(errors[0]).toContain(a);
    expect(errors[0]).toContain(b);
  });

  test('两份经营项目台账同样整批拒绝', () => {
    const { ok, errors } = routeUploadFiles([BUSINESS, '经营项目台账明细列表-副本.xlsx']);

    expect(ok).toBe(false);
    expect(errors[0]).toContain('经营项目');
  });

  test('包含无关文件应整批拒绝并提示关键词', () => {
    const { routes, errors, ok } = routeUploadFiles([BUSINESS, '会议纪要.xlsx']);

    expect(ok).toBe(false);
    expect(routes).toHaveLength(1);
    expect(errors[0]).toContain('无法识别文件「会议纪要.xlsx」');
    expect(errors[0]).toContain('经营项目台账明细列表');
  });

  test('重复类型与无关文件同时存在时错误逐条列出', () => {
    const { errors, ok } = routeUploadFiles([
      '自筹项目台账列表A.xlsx',
      '自筹项目台账列表B.xlsx',
      '随手记.xlsx',
    ]);

    expect(ok).toBe(false);
    expect(errors).toHaveLength(2);
  });

  test('超过数量上限应拒绝', () => {
    const files = Array.from(
      { length: MAX_UPLOAD_FILES + 1 },
      (_, i) => `经营项目台账明细列表${i}.xlsx`
    );
    const { errors, ok } = routeUploadFiles(files);

    expect(ok).toBe(false);
    expect(errors[0]).toContain(`一次最多选择 ${MAX_UPLOAD_FILES} 个文件`);
  });

  test('空选择应拒绝', () => {
    const { errors, ok } = routeUploadFiles([]);

    expect(ok).toBe(false);
    expect(errors[0]).toContain('未选择任何文件');
  });
});

describe('常量与提示文案', () => {
  test('关键词提示包含全部三类', () => {
    Object.values(ACCEPT_CONFIG).forEach((item) => {
      expect(KEYWORD_HINT_TEXT).toContain(item.keyword);
    });
  });
});
