/**
 * 表格列宽拖拽调整（D 区域项目表格 / E 区域成本表格共用）
 *
 * 只负责「列宽状态 + 拖拽交互」：默认宽度由调用方通过 resolveDefaultWidth 提供，
 * 因此两个区域各自的列模型不必耦合到本模块。
 */
import { ref, watch, onBeforeUnmount } from 'vue';

/** 拖拽时允许的最小列宽，避免列被拖到不可见 */
export const MIN_COLUMN_WIDTH = 60;

/**
 * @param {import('vue').Ref|Function} columns 当前列标识列表（列名或列 key）
 * @param {(column: string) => number} resolveDefaultWidth 取某列的默认宽度（px）
 */
export const useColumnResize = (columns, resolveDefaultWidth) => {
  const columnWidths = ref({});
  const resizing = ref(null);

  const startResize = (event, column) => {
    // 以表头实际渲染宽度为起点，避免与默认宽度不一致导致跳变
    const th = event.target.closest('th');
    const startWidth = th ? th.offsetWidth : resolveDefaultWidth(column);
    resizing.value = { column, startX: event.clientX, startWidth };
  };

  const onResizeMove = (event) => {
    if (!resizing.value) return;
    const delta = event.clientX - resizing.value.startX;
    const width = Math.max(MIN_COLUMN_WIDTH, resizing.value.startWidth + delta);
    columnWidths.value = { ...columnWidths.value, [resizing.value.column]: width };
  };

  const stopResize = () => {
    resizing.value = null;
  };

  // 拖拽期间把监听挂到 document 上，鼠标移出表头也能继续调整
  watch(resizing, (value) => {
    if (value) {
      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', stopResize);
    } else {
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', stopResize);
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', stopResize);
  });

  // 列变化时给新列补默认宽度，避免 table-layout: fixed 下新列宽度塌陷
  watch(columns, (newColumns) => {
    const widths = { ...columnWidths.value };
    let changed = false;
    newColumns.forEach((column) => {
      if (!(column in widths)) {
        widths[column] = resolveDefaultWidth(column);
        changed = true;
      }
    });
    if (changed) columnWidths.value = widths;
  }, { immediate: true });

  return { columnWidths, resizing, startResize };
};
