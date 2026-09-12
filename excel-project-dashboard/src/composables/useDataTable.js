import { computed, ref, watch } from 'vue';
import {
  ColumnFilterKind,
  buildValueOptions,
  countActiveColumnFilters,
  createColumnFilter,
  filterRowsByColumnFilters,
  isColumnFilterActive,
  sortRowsByColumn,
} from '../utils/columnFilters';
import { filterBySearchQuery } from '../utils/tableSearch';
import { normalizeColumns } from '../utils/tableModel';
import { useTablePaging } from './useTablePaging';

/**
 * 表格状态编排内核（D 区域项目明细表与 E 区域成本明细表共用）
 *
 * 负责的词法固定为一条链路：
 *   业务筛选后的行（由调用方传入）
 *     → 关键词搜索（可选）
 *     → 表头列筛选（跨列 AND）
 *     → 单列排序
 *     → 分页
 *
 * 同时托管列显隐（含 `fixed` 列不参与显隐）与表头筛选下拉的全部状态。
 * 刻意不 import 任何区域数据源，也不含业务判定（超支/验收状态等留在区域适配层）。
 *
 * @param {Object}   options
 * @param {Ref|Function|Array} options.columns       列定义（列模型见 utils/tableModel）
 * @param {Ref|Function|Array} options.rows          已做业务筛选、但尚未搜索/列筛选/排序/分页的行
 * @param {Object}   [options.searchValues]          { getBasicValues, getGlobalValues }，缺省表示不启用关键词搜索
 * @param {string[]|Function} [options.initialSelectedLabels] 初始可见列；可传函数延迟到「首次拿到列」时求值
 *        （缺省 = 全部非 fixed 列）
 * @param {boolean}  [options.pruneMissingColumns]   数据列变化时是否清理已失效的选中列（D: true；E: false）
 * @param {number}   [options.initialPageSize]
 */
export const useDataTable = ({
  columns,
  rows,
  searchValues = null,
  initialSelectedLabels = null,
  pruneMissingColumns = false,
  initialPageSize = 10,
  initialSearchMode = 'basic',
  initialSearchMatchMode = 'any',
} = {}) => {
  /** 统一把 Ref / getter / 普通数组解析成当前值 */
  const resolveSource = (source) => {
    if (typeof source === 'function') return source();
    if (source && typeof source === 'object' && 'value' in source) return source.value;
    return source;
  };

  const allColumns = computed(() => normalizeColumns(resolveSource(columns) || []));
  const baseRows = computed(() => resolveSource(rows) || []);
  const allColumnLabels = computed(() => allColumns.value.map((col) => col.label));
  /** 可被列设置勾选的列（fixed 列固定展示，不参与显隐） */
  const selectableColumnLabels = computed(() =>
    allColumns.value.filter((col) => !col.fixed).map((col) => col.label));

  // ---------------- 列显隐 ----------------
  const selectedColumnLabels = ref([]);
  const columnsInitialized = ref(false);

  /**
   * 初始勾选的列：支持直接给数组（D 区域）或给一个读取当前列模型的函数（E 区域
   * 需要按列定义标记过滤掉「项目清单」列）。
   */
  const resolveInitialLabels = () =>
    (typeof initialSelectedLabels === 'function' ? initialSelectedLabels() : initialSelectedLabels);

  // 首次拿到列时按「声明的初始列 / 全部可选列」初始化，与既有 D/E 行为一致
  watch(() => allColumns.value.length, (length) => {
    if (columnsInitialized.value || length === 0) return;
    const initial = resolveInitialLabels();
    selectedColumnLabels.value = initial
      ? [...initial]
      : [...selectableColumnLabels.value];
    columnsInitialized.value = true;
  }, { immediate: true });

  // D 区域用：数据里没有的列（换台账后消失）需要从选中集合里清掉
  if (pruneMissingColumns) {
    watch(allColumnLabels, (labels) => {
      if (!columnsInitialized.value) return;
      selectedColumnLabels.value = selectedColumnLabels.value.filter((label) => labels.includes(label));
    });
  }

  /** 实际渲染的列：fixed 列永远在，其余按用户勾选 */
  const visibleColumns = computed(() => {
    if (!columnsInitialized.value) return allColumns.value;
    const selected = new Set(selectedColumnLabels.value);
    return allColumns.value.filter((col) => col.fixed || selected.has(col.label));
  });

  // ---------------- 关键词搜索 ----------------
  const searchQuery = ref('');
  const searchMode = ref(initialSearchMode);
  const searchMatchMode = ref(initialSearchMatchMode);
  const searchEnabled = Boolean(searchValues);

  const searchedRows = computed(() => {
    if (!searchEnabled) return baseRows.value;
    return filterBySearchQuery(baseRows.value, {
      query: searchQuery.value,
      mode: searchMode.value,
      matchMode: searchMatchMode.value,
      getBasicValues: searchValues.getBasicValues,
      getGlobalValues: searchValues.getGlobalValues,
    });
  });

  // ---------------- 表头筛选与排序 ----------------
  const columnFilters = ref({});
  const sortState = ref({ key: '', order: '' });
  const openFilterKey = ref('');

  const activeFilterCount = computed(() => countActiveColumnFilters(columnFilters.value));
  const openFilterColumn = computed(() =>
    allColumns.value.find((col) => col.key === openFilterKey.value) || null);

  // 下拉里的计数/占比以「其他列筛选之后」的数据为基数（Excel 语义），且排除自身列，
  // 否则勾掉一个值后就再也勾不回来。
  const openFilterSourceRows = computed(() =>
    filterRowsByColumnFilters(
      searchedRows.value,
      columnFilters.value,
      allColumns.value,
      openFilterKey.value,
    ));

  const openFilterOptions = computed(() => (openFilterColumn.value
    ? buildValueOptions(openFilterSourceRows.value, openFilterColumn.value)
    : []));

  const filteredRows = computed(() => {
    const filtered = filterRowsByColumnFilters(searchedRows.value, columnFilters.value, allColumns.value);
    const sortColumn = allColumns.value.find((col) => col.key === sortState.value.key);
    return sortRowsByColumn(filtered, sortColumn, sortState.value.order);
  });

  // ---------------- 分页 ----------------
  const {
    pageSize,
    currentPage,
    totalPages,
    paginatedRows,
    prevPage,
    nextPage,
    handlePageSizeChange,
  } = useTablePaging(() => filteredRows.value, { pageSize: initialPageSize });

  const resetPage = () => {
    currentPage.value = 1;
  };

  // 筛选结果或每页条数变化时回到第一页，避免停留在越界页码
  watch([filteredRows, pageSize], resetPage);

  // ---------------- 操作 ----------------
  const handleSearch = () => resetPage();

  const setColumnFilter = (key, filter) => {
    columnFilters.value = { ...columnFilters.value, [key]: filter };
    resetPage();
  };

  const setColumnSort = (key, order) => {
    sortState.value = order ? { key, order } : { key: '', order: '' };
    resetPage();
  };

  const toggleFilterKey = (key) => {
    openFilterKey.value = openFilterKey.value === key ? '' : key;
  };

  const closeFilter = () => {
    openFilterKey.value = '';
  };

  const clearHeaderFilters = () => {
    columnFilters.value = {};
    sortState.value = { key: '', order: '' };
    closeFilter();
    resetPage();
  };

  const clearSearch = () => {
    searchQuery.value = '';
    resetPage();
  };

  return {
    // 列
    allColumns,
    visibleColumns,
    allColumnLabels,
    selectableColumnLabels,
    selectedColumnLabels,
    columnsInitialized,
    // 行链路
    baseRows,
    searchedRows,
    filteredRows,
    // 搜索
    searchQuery,
    searchMode,
    searchMatchMode,
    searchEnabled,
    handleSearch,
    clearSearch,
    // 表头筛选与排序
    columnFilters,
    sortState,
    openFilterKey,
    activeFilterCount,
    openFilterColumn,
    openFilterSourceRows,
    openFilterOptions,
    setColumnFilter,
    setColumnSort,
    toggleFilterKey,
    closeFilter,
    clearHeaderFilters,
    // 分页
    pageSize,
    currentPage,
    totalPages,
    paginatedRows,
    prevPage,
    nextPage,
    handlePageSizeChange,
    resetPage,
    // 常量透出，减少调用方重复 import
    ColumnFilterKind,
    isColumnFilterActive,
    createColumnFilter,
  };
};
