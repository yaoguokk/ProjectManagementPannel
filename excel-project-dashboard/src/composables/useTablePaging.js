import { computed, ref, unref } from 'vue';

/**
 * 表格分页状态（D 区域 ProjectTable 与 E 区域 CostTable 共用）
 *
 * 只负责「已筛选结果 → 当前页切片」这段通用逻辑：
 *   - 两份表格原先各自实现 pageSize/currentPage/totalPages/切片/翻页，口径易漂移；
 *   - 抽到这里后，新增表格只需传入「筛选结果 getter」即可获得一致的分页行为。
 *
 * @param {Function|import('vue').Ref} rowsSource 返回（或指向）已筛选但未分页的行数组
 * @param {{ pageSize?: number }} options 初始每页条数，默认 10
 * @returns 分页状态与操作，`paginatedRows` 为当前页数据
 */
export const useTablePaging = (rowsSource, options = {}) => {
  const resolveRows = () => (typeof rowsSource === 'function' ? rowsSource() : unref(rowsSource));

  const pageSize = ref(options.pageSize ?? 10);
  const currentPage = ref(1);

  const total = computed(() => resolveRows().length);
  // 至少 1 页：无数据时页脚仍显示「第 1 页 / 共 1 页」，避免出现 0 页
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

  const paginatedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return resolveRows().slice(start, start + pageSize.value);
  });

  /** 跳转页码，越界自动收敛到有效区间 */
  const goToPage = (page) => {
    const target = Number(page) || 1;
    currentPage.value = Math.min(Math.max(1, target), totalPages.value);
  };

  const resetPage = () => {
    currentPage.value = 1;
  };

  const prevPage = () => goToPage(currentPage.value - 1);
  const nextPage = () => goToPage(currentPage.value + 1);

  /** 每页条数变化后回到第一页（v-model 改变 pageSize 时由模板调用） */
  const handlePageSizeChange = () => resetPage();

  return {
    pageSize,
    currentPage,
    total,
    totalPages,
    paginatedRows,
    goToPage,
    resetPage,
    prevPage,
    nextPage,
    handlePageSizeChange,
  };
};
