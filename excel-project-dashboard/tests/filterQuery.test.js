/**
 * 全局筛选条件 ↔ URL query 的纯函数测试
 *
 * 覆盖：默认值不入 URL、非默认项编解码、非法值回退、往返一致、
 * 以及用于打断「URL ↔ store」同步循环的等价判断。
 */
import { describe, expect, test } from 'vitest';
import {
  FILTER_QUERY_KEYS,
  decodeFilterQuery,
  encodeFilterQuery,
  filtersEqual,
  queryEquals,
} from '../src/utils/filterQuery';
import { DateRangeType, ProjectType } from '../src/constants/projectStatus';

const DEFAULT_FILTERS = {
  dateRange: { start: '2026-01-01', end: '2026-09-30', type: DateRangeType.MONTH },
  projectType: ProjectType.ALL,
};

describe('筛选条件 ↔ URL query', () => {
  test('默认筛选编码为空对象（默认状态 URL 保持干净）', () => {
    expect(encodeFilterQuery(DEFAULT_FILTERS, DEFAULT_FILTERS)).toEqual({});
  });

  test('只把非默认项写入 query', () => {
    const query = encodeFilterQuery(
      {
        projectType: ProjectType.SELF_FINANCED,
        dateRange: { start: '2026-03-01', end: '2026-06-30', type: DateRangeType.CUSTOM },
      },
      DEFAULT_FILTERS,
    );

    expect(query).toEqual({
      [FILTER_QUERY_KEYS.projectType]: '自筹项目',
      [FILTER_QUERY_KEYS.start]: '2026-03-01',
      [FILTER_QUERY_KEYS.end]: '2026-06-30',
      [FILTER_QUERY_KEYS.rangeType]: 'custom',
    });
  });

  test('解码合法 query 得到对应筛选条件', () => {
    const filters = decodeFilterQuery(
      { type: '经营项目', start: '2026-02-01', end: '2026-05-31', range: 'custom' },
      DEFAULT_FILTERS,
    );

    expect(filters.projectType).toBe(ProjectType.BUSINESS);
    expect(filters.dateRange).toEqual({
      start: '2026-02-01',
      end: '2026-05-31',
      type: DateRangeType.CUSTOM,
    });
  });

  test('空 query 回退默认值', () => {
    expect(decodeFilterQuery({}, DEFAULT_FILTERS)).toEqual(DEFAULT_FILTERS);
  });

  test('非法取值一律回退默认值（脏参数不进 store）', () => {
    const filters = decodeFilterQuery(
      { type: '不存在的类型', start: '2026/02/01', end: 'not-a-date', range: 'weekly' },
      DEFAULT_FILTERS,
    );

    expect(filters.projectType).toBe(ProjectType.ALL);
    expect(filters.dateRange).toEqual(DEFAULT_FILTERS.dateRange);
  });

  test('只带自定义日期、没有 range 参数时按「自定义」处理', () => {
    const filters = decodeFilterQuery({ start: '2026-02-01', end: '2026-02-28' }, DEFAULT_FILTERS);
    expect(filters.dateRange).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
      type: DateRangeType.CUSTOM,
    });
  });

  test('query 值可能是数组（同名参数多次出现），取第一个', () => {
    const filters = decodeFilterQuery(
      { type: ['自筹项目', '经营项目'] },
      DEFAULT_FILTERS,
    );
    expect(filters.projectType).toBe(ProjectType.SELF_FINANCED);
  });

  test('encode → decode 往返一致', () => {
    const source = {
      projectType: ProjectType.SELF_FINANCED,
      dateRange: { start: '2026-04-01', end: '2026-04-30', type: DateRangeType.CUSTOM },
    };

    expect(decodeFilterQuery(encodeFilterQuery(source, DEFAULT_FILTERS), DEFAULT_FILTERS)).toEqual(source);
  });

  test('filtersEqual / queryEquals 能打断同步循环', () => {
    expect(
      filtersEqual(DEFAULT_FILTERS, {
        projectType: ProjectType.ALL,
        dateRange: { ...DEFAULT_FILTERS.dateRange },
      }),
    ).toBe(true);
    expect(
      filtersEqual(DEFAULT_FILTERS, { ...DEFAULT_FILTERS, projectType: ProjectType.BUSINESS }),
    ).toBe(false);

    expect(queryEquals({}, {})).toBe(true);
    expect(queryEquals({ type: '经营项目' }, { type: '经营项目' })).toBe(true);
    expect(queryEquals({ type: '经营项目' }, {})).toBe(false);
  });
});
