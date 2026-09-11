import { describe, expect, test } from 'vitest';
import { ref } from 'vue';
import { useTablePaging } from '../src/composables/useTablePaging';

const makeRows = (count) => Array.from({ length: count }, (_, index) => ({ id: index + 1 }));

describe('useTablePaging', () => {
  test('默认每页 10 条，首页取前 10 条', () => {
    const paging = useTablePaging(() => makeRows(25));

    expect(paging.pageSize.value).toBe(10);
    expect(paging.currentPage.value).toBe(1);
    expect(paging.total.value).toBe(25);
    expect(paging.totalPages.value).toBe(3);
    expect(paging.paginatedRows.value).toHaveLength(10);
    expect(paging.paginatedRows.value[0]).toEqual({ id: 1 });
  });

  test('翻页到末页只返回剩余行', () => {
    const paging = useTablePaging(() => makeRows(25));

    paging.nextPage();
    paging.nextPage();

    expect(paging.currentPage.value).toBe(3);
    expect(paging.paginatedRows.value.map((row) => row.id)).toEqual([21, 22, 23, 24, 25]);
  });

  test('页码越界自动收敛（首尾都不会溢出）', () => {
    const paging = useTablePaging(() => makeRows(12));

    paging.goToPage(99);
    expect(paging.currentPage.value).toBe(2);

    paging.goToPage(0);
    expect(paging.currentPage.value).toBe(1);

    paging.prevPage();
    expect(paging.currentPage.value).toBe(1);
  });

  test('无数据时仍为 1 页，避免出现「共 0 页」', () => {
    const paging = useTablePaging(() => []);

    expect(paging.totalPages.value).toBe(1);
    expect(paging.paginatedRows.value).toEqual([]);
  });

  test('每页条数变化后回到第一页', () => {
    const paging = useTablePaging(() => makeRows(50));

    paging.goToPage(3);
    paging.pageSize.value = 20;
    paging.handlePageSizeChange();

    expect(paging.currentPage.value).toBe(1);
    expect(paging.totalPages.value).toBe(3);
  });

  test('支持传入 ref 作为数据源，并随数据变化重新切片', () => {
    const rows = ref(makeRows(5));
    const paging = useTablePaging(rows, { pageSize: 2 });

    expect(paging.totalPages.value).toBe(3);
    expect(paging.paginatedRows.value).toHaveLength(2);

    rows.value = makeRows(4);
    expect(paging.totalPages.value).toBe(2);
    expect(paging.paginatedRows.value.map((row) => row.id)).toEqual([1, 2]);
  });
});
