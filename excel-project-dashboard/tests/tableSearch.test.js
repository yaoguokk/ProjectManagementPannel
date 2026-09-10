import {
  SearchMode,
  SearchMatchMode,
  normalizeSearchText,
  parseSearchTerms,
  matchesSearchQuery,
  filterBySearchQuery,
  pickAllValues,
} from '../src/utils/tableSearch';

const RECORDS = [
  {
    id: 'row-alpha',
    projectCode: 'PRJ-001',
    projectName: '智慧城市项目',
    manager: '张三',
    department: '信息技术部',
    projectType: '经营项目',
  },
  {
    id: 'row-beta',
    projectCode: 'PRJ-002',
    projectName: '数字乡村项目',
    manager: '李四',
    department: '产品部',
    projectType: '自筹项目',
  },
];

const OPTIONS = {
  mode: SearchMode.BASIC,
  matchMode: SearchMatchMode.ANY,
  getBasicValues: (record) => [record.projectCode, record.projectName, record.manager, record.department],
  getGlobalValues: (record) => pickAllValues(record, ['id']),
};

const search = (query, extra = {}) => filterBySearchQuery(RECORDS, { ...OPTIONS, query, ...extra });

describe('tableSearch', () => {
  test('parseSearchTerms 支持逗号/顿号/分号/换行分隔并清理空词', () => {
    expect(parseSearchTerms('A, B、C；D\nE')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(parseSearchTerms('  ,,  ')).toEqual([]);
    expect(parseSearchTerms(null)).toEqual([]);
  });

  test('normalizeSearchText 去首尾空格并忽略大小写', () => {
    expect(normalizeSearchText('  Prj-001 ')).toBe('prj-001');
    expect(normalizeSearchText(undefined)).toBe('');
  });

  test('空关键词不过滤', () => {
    expect(search('')).toHaveLength(2);
    expect(search('   ')).toHaveLength(2);
  });

  test('基础搜索只匹配指定字段', () => {
    expect(search('产品部').map((record) => record.id)).toEqual(['row-beta']);
    // projectType 不属于基础搜索字段
    expect(search('经营项目')).toHaveLength(0);
  });

  test('全局搜索覆盖全部字段，但排除 id', () => {
    expect(search('经营项目', { mode: SearchMode.GLOBAL })).toHaveLength(1);
    expect(search('row-', { mode: SearchMode.GLOBAL })).toHaveLength(0);
  });

  test('默认「任意关键词（或）」命中其一即可', () => {
    expect(search('张三,数字乡村').map((record) => record.id)).toEqual(['row-alpha', 'row-beta']);
  });

  test('「全部关键词（与）」必须同时命中', () => {
    expect(search('张三,数字乡村', { matchMode: SearchMatchMode.ALL })).toHaveLength(0);
    expect(search('张三,智慧城市', { matchMode: SearchMatchMode.ALL }).map((r) => r.id)).toEqual(['row-alpha']);
  });

  test('关键词不绑定具体字段，只要求出现在取值集合中', () => {
    expect(search('张三,信息技术部', { matchMode: SearchMatchMode.ALL }).map((r) => r.id)).toEqual(['row-alpha']);
  });

  test('matchesSearchQuery 支持单条判定', () => {
    expect(matchesSearchQuery(RECORDS[0], { ...OPTIONS, query: '智慧' })).toBe(true);
    expect(matchesSearchQuery(RECORDS[0], { ...OPTIONS, query: '乡村' })).toBe(false);
  });

  test('取值函数缺失或返回空时不报错', () => {
    expect(matchesSearchQuery(RECORDS[0], { query: 'x' })).toBe(false);
    expect(matchesSearchQuery(RECORDS[0], { query: 'x', getBasicValues: () => null })).toBe(false);
  });

  test('pickAllValues 可排除指定字段', () => {
    expect(pickAllValues({ a: 1, b: 2, id: 3 }, ['id'])).toEqual([1, 2]);
    expect(pickAllValues(null)).toEqual([]);
  });
});
