import { describe, test, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref, nextTick } from 'vue';
import { useColumnResize, MIN_COLUMN_WIDTH } from '../src/composables/useColumnResize';

const DEFAULT_WIDTHS = { a: 100, b: 200 };
const FALLBACK_WIDTH = 120;

const mountedWrappers = [];

/** 组合式函数依赖 onBeforeUnmount，必须在组件上下文中调用 */
const mountColumnResize = (columns) => {
  let api = null;
  const wrapper = mount(defineComponent({
    setup() {
      api = useColumnResize(columns, (column) => DEFAULT_WIDTHS[column] ?? FALLBACK_WIDTH);
      return () => h('div');
    },
  }));
  mountedWrappers.push(wrapper);
  return { wrapper, api };
};

/** 构造表头拖拽起点；closest 返回 null 表示以该列默认宽度为起点 */
const dragStart = (clientX) => ({ clientX, target: { closest: () => null } });

const moveMouse = (clientX) => document.dispatchEvent(new MouseEvent('mousemove', { clientX }));
const releaseMouse = () => document.dispatchEvent(new MouseEvent('mouseup'));

afterEach(() => {
  mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe('useColumnResize', () => {
  test('初始化时按 resolveDefaultWidth 填充各列宽度', () => {
    const { api } = mountColumnResize(ref(['a', 'b', 'c']));
    expect(api.columnWidths.value).toEqual({ a: 100, b: 200, c: FALLBACK_WIDTH });
  });

  test('拖拽后按水平位移量更新列宽', async () => {
    const { api } = mountColumnResize(ref(['a']));
    api.startResize(dragStart(100), 'a');
    await nextTick();

    moveMouse(160);
    expect(api.columnWidths.value.a).toBe(160);
  });

  test('列宽不会被拖到小于最小宽度', async () => {
    const { api } = mountColumnResize(ref(['a']));
    api.startResize(dragStart(100), 'a');
    await nextTick();

    moveMouse(-1000);
    expect(api.columnWidths.value.a).toBe(MIN_COLUMN_WIDTH);
  });

  test('mouseup 结束拖拽后不再响应 mousemove', async () => {
    const { api } = mountColumnResize(ref(['a']));
    api.startResize(dragStart(100), 'a');
    await nextTick();

    moveMouse(150);
    releaseMouse();
    await nextTick();
    moveMouse(400);

    expect(api.columnWidths.value.a).toBe(150);
    expect(api.resizing.value).toBeNull();
  });

  test('新增列自动补默认宽度，已调整过的列不受影响', async () => {
    const columns = ref(['a']);
    const { api } = mountColumnResize(columns);
    api.startResize(dragStart(100), 'a');
    await nextTick();
    moveMouse(140);
    releaseMouse();
    await nextTick();

    columns.value = ['a', 'b'];
    await nextTick();

    expect(api.columnWidths.value.a).toBe(140);
    expect(api.columnWidths.value.b).toBe(200);
  });

  test('组件卸载后不再响应 document 上的 mousemove', async () => {
    const { wrapper, api } = mountColumnResize(ref(['a']));
    api.startResize(dragStart(100), 'a');
    await nextTick();

    wrapper.unmount();
    moveMouse(500);

    expect(api.columnWidths.value.a).toBe(100);
  });
});
