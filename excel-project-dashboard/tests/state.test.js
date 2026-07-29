import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createDefaultFilters } from '../src/composables/useProjectData';
import { useToast } from '../src/composables/useToast';

describe('application state', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useToast().hideToast();
  });

  test('shares one toast state between callers', () => {
    const first = useToast();
    const second = useToast();

    first.showSuccess('导入成功');

    expect(second.toast.value).toMatchObject({
      show: true,
      message: '导入成功',
      type: 'success'
    });
  });

  test('replaces the previous toast timer', () => {
    vi.useFakeTimers();
    const { toast, showSuccess } = useToast();

    showSuccess('第一条', 1000);
    vi.advanceTimersByTime(500);
    showSuccess('第二条', 1000);
    vi.advanceTimersByTime(500);
    expect(toast.value.show).toBe(true);
    vi.advanceTimersByTime(500);
    expect(toast.value.show).toBe(false);
  });

  test('uses a usable default date range and all project types', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 29));

    expect(createDefaultFilters()).toEqual({
      dateRange: { start: '2026-01-01', end: '2026-07-31', type: 'month' },
      projectType: '全部'
    });
  });
});
