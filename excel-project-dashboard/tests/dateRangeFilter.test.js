/**
 * DateRangeFilter 组件测试
 *
 * 重点：「年初至本月 / 自定义」两个按钮来回切时，用户填过的自定义日期不能丢
 * （切到「年初至本月」会把输入框改成年初~本月末，切回「自定义」应还原上次填写值）。
 */
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import DateRangeFilter from '../src/components/filters/DateRangeFilter.vue';

const formatLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** 年初 ~ 本月末（与组件内的「年初至本月」口径一致） */
const currentMonthRange = () => {
  const now = new Date();
  return {
    start: formatLocalDate(new Date(now.getFullYear(), 0, 1)),
    end: formatLocalDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const mountFilter = (dateRange = { start: '', end: '', type: 'month' }) =>
  mount(DateRangeFilter, { props: { dateRange } });

const clickQuick = async (wrapper, label) => {
  const button = wrapper.findAll('.quick-date-btn').find((item) => item.text() === label);
  await button.trigger('click');
};

const setCustomDates = async (wrapper, start, end) => {
  const inputs = wrapper.findAll('.custom-date-range input');
  await inputs[0].setValue(start);
  await inputs[1].setValue(end);
  await inputs[1].trigger('change');
};

/** 最后一次 emit 的区间 */
const emittedRange = (wrapper) => {
  const events = wrapper.emitted('update:dateRange');
  return events[events.length - 1][0];
};

const shownDates = (wrapper) =>
  wrapper.findAll('.custom-date-range input').map((input) => input.element.value);

describe('DateRangeFilter', () => {
  test('「年初至本月」设为年初 ~ 本月末（原有口径不变）', async () => {
    const wrapper = mountFilter({ start: '2026-02-01', end: '2026-05-31', type: 'custom' });
    await clickQuick(wrapper, '年初至本月');

    expect(emittedRange(wrapper)).toEqual({ ...currentMonthRange(), type: 'month' });
  });

  test('首次点「自定义」沿用当前日期（未填过时不置空）', async () => {
    const wrapper = mountFilter({ start: '2026-01-01', end: '2026-09-30', type: 'month' });
    await clickQuick(wrapper, '自定义');

    expect(emittedRange(wrapper)).toEqual({ start: '2026-01-01', end: '2026-09-30', type: 'custom' });
  });

  test('填过自定义日期后切到「年初至本月」再切回，日期不丢', async () => {
    const wrapper = mountFilter();

    await clickQuick(wrapper, '自定义');
    await setCustomDates(wrapper, '2026-02-01', '2026-05-31');
    expect(emittedRange(wrapper)).toEqual({ start: '2026-02-01', end: '2026-05-31', type: 'custom' });

    await clickQuick(wrapper, '年初至本月');
    expect(emittedRange(wrapper).type).toBe('month');

    await clickQuick(wrapper, '自定义');
    expect(emittedRange(wrapper)).toEqual({ start: '2026-02-01', end: '2026-05-31', type: 'custom' });
    expect(shownDates(wrapper)).toEqual(['2026-02-01', '2026-05-31']);
  });

  test('从外部带入自定义区间（URL / store）时，切走再切回也能还原', async () => {
    const wrapper = mountFilter({ start: '2026-03-01', end: '2026-04-30', type: 'custom' });
    expect(shownDates(wrapper)).toEqual(['2026-03-01', '2026-04-30']);

    await clickQuick(wrapper, '年初至本月');
    await clickQuick(wrapper, '自定义');

    expect(emittedRange(wrapper)).toEqual({ start: '2026-03-01', end: '2026-04-30', type: 'custom' });
  });

  test('连续点「年初至本月」不会覆盖已记住的自定义区间', async () => {
    const wrapper = mountFilter();

    await clickQuick(wrapper, '自定义');
    await setCustomDates(wrapper, '2026-02-01', '2026-05-31');

    await clickQuick(wrapper, '年初至本月');
    await clickQuick(wrapper, '年初至本月');
    await clickQuick(wrapper, '自定义');

    expect(emittedRange(wrapper)).toEqual({ start: '2026-02-01', end: '2026-05-31', type: 'custom' });
  });
});
