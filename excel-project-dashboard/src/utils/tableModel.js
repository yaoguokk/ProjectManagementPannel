/**
 * 表格模型工具（列模型 / 单元格模型 / 行模型）— 公共纯函数
 *
 * 表格内核（`components/common/DataTable.vue` + `composables/useDataTable.js`）只认这三种模型，
 * 不认任何业务字段；D/E 区域的差异通过「列定义 + 行映射函数」表达。
 *
 * 列模型：{ key, label, align?, width?, filter?, getFilterValue?, fixed?, ...业务扩展字段 }
 *   - `fixed: true` 表示该列不参与列显隐（如 D 区域固定追加的日期列与倒计时列）
 *   - `filter` / `getFilterValue` 见 utils/columnFilters（表头筛选与排序的取值口径）
 * 单元格模型：{ key, text, type?, title?, cellClass? }（type 用于匹配 `cell-<type>` 插槽）
 * 行模型：{ key, row, cells, rowClass? }（渲染与列模型解耦）
 */

/** 未声明宽度的列兜底宽度（px），避免 table-layout: fixed 下列塌陷 */
export const FALLBACK_COLUMN_WIDTH = 120;

/** 金额类列的关键词：命中即按货币展示/导出为数值（D/E 区域共用同一套判定） */
export const AMOUNT_COLUMN_KEYWORDS = [
  '收入', '成本', '金额', '费用', '预算', '支出', '分包费', '外包费', '分摊', '采购', '租赁',
];

/** 列名是否为金额列（入参是列名/列标签） */
export const isAmountColumn = (label = '') =>
  AMOUNT_COLUMN_KEYWORDS.some((keyword) => String(label ?? '').includes(keyword));

/** 过滤掉缺 key 的列定义，避免渲染出无 key 的列 */
export const normalizeColumns = (columns = []) =>
  (Array.isArray(columns) ? columns : []).filter((col) => col && col.key);

/** 列对齐对应的 Tailwind 类（未声明 align 时与既有表格一致：居中） */
export const alignClass = (col) => (col?.align === 'right' ? 'text-right' : 'text-center');

/** 生成单元格模型（统一字段，避免各处手写对象形状不一致） */
export const createCell = ({ key, text = '', type = 'text', title = '', cellClass = '' } = {}) => ({
  key,
  text,
  title: title || '',
  type,
  cellClass,
});

/** 生成行模型 */
export const createRowModel = (row, cells = [], extras = {}) => ({
  key: extras.key ?? row?.id ?? '',
  row,
  cells,
  rowClass: extras.rowClass ?? '',
});

/** 列默认宽度读取器：优先列定义，其次兜底 */
export const resolveColumnWidth = (col) => col?.width ?? FALLBACK_COLUMN_WIDTH;
