/**
 * UploadArea 批量上传的组件级测试
 * 验证「任一入口多选文件 → 按文件名分发」与「整批拒绝」在组件里真实生效。
 * 解析器用 mock（校验拒绝发生在解析之前，因此拒绝路径不依赖解析实现）。
 */
import { mount, flushPromises } from '@vue/test-utils';
import { vi, beforeEach } from 'vitest';
import UploadArea from '../src/components/UploadArea/UploadArea.vue';
import { parseExcelFile } from '../src/utils/excelParser';
import { useToast } from '../src/composables/useToast';

vi.mock('../src/utils/excelParser', () => ({
  parseExcelFile: vi.fn(async () => ({ headers: [], rawData: [] })),
}));

const BUSINESS = '2026年经营项目台账明细列表.xlsx';
const SELF_A = '自筹项目台账列表A.xlsx';
const SELF_B = '自筹项目台账列表B.xlsx';
const CONTRACT = '支出合同事项导出.xls';
const UNKNOWN = '会议纪要.xlsx';

const mountArea = () =>
  mount(UploadArea, {
    props: { acceptType: 'business', title: '经营项目台账上传', description: '测试' },
  });

// jsdom 的 input.files 只读，用 defineProperty 注入模拟多选
const chooseFiles = async (wrapper, names) => {
  const input = wrapper.find('input[type="file"]').element;
  Object.defineProperty(input, 'files', {
    value: names.map((name) => new File([''], name)),
    configurable: true,
  });
  await input.dispatchEvent(new Event('change'));
  await flushPromises();
};

describe('UploadArea 批量上传', () => {
  beforeEach(() => {
    // mock 的调用记录跨用例共享，先清空保证「未解析」断言有效
    vi.clearAllMocks();
  });

  test('文件选择框支持多选', () => {
    const wrapper = mountArea();
    expect(wrapper.find('input[type="file"]').attributes('multiple')).toBeDefined();
  });

  test('任一入口一次选三类文件，按文件名分发并以真实类型向上发射', async () => {
    const wrapper = mountArea();
    await chooseFiles(wrapper, [BUSINESS, SELF_A, CONTRACT]);

    const uploaded = wrapper.emitted('file-uploaded');
    expect(uploaded).toHaveLength(3);
    expect(uploaded.map((event) => event[0].acceptType)).toEqual([
      'business',
      'self-funded',
      'contract',
    ]);
    expect(uploaded.map((event) => event[0].fileName)).toEqual([BUSINESS, SELF_A, CONTRACT]);
    expect(wrapper.emitted('file-error')).toBeUndefined();
  });

  test('多文件上传：每个文件都发 file-uploaded，整批结束后只发一次 batch-done', async () => {
    const wrapper = mountArea();
    await chooseFiles(wrapper, [BUSINESS, SELF_A, CONTRACT]);

    // batch-done 必须晚于所有 file-uploaded：调用方靠它决定何时跳转（提前跳转会被卸载而丢事件）
    expect(wrapper.emitted('file-uploaded')).toHaveLength(3);
    const done = wrapper.emitted('batch-done');
    expect(done).toHaveLength(1);
    expect(done[0][0]).toEqual({ total: 3, successCount: 3 });
  });

  test('单文件上传同样以 batch-done 收尾', async () => {
    const wrapper = mountArea();
    await chooseFiles(wrapper, [CONTRACT]);

    expect(wrapper.emitted('file-uploaded')).toHaveLength(1);
    expect(wrapper.emitted('batch-done')[0][0]).toEqual({ total: 1, successCount: 1 });
  });

  test('整批拒绝时不发 batch-done（调用方不应跳转）', async () => {
    const wrapper = mountArea();
    await chooseFiles(wrapper, [BUSINESS, UNKNOWN]);

    expect(wrapper.emitted('file-uploaded')).toBeUndefined();
    expect(wrapper.emitted('batch-done')).toBeUndefined();
  });

  test('两份自筹台账整批拒绝：不解析任何文件', async () => {
    const wrapper = mountArea();
    await chooseFiles(wrapper, [SELF_A, SELF_B]);

    expect(parseExcelFile).not.toHaveBeenCalled();
    expect(wrapper.emitted('file-uploaded')).toBeUndefined();

    const errors = wrapper.emitted('file-error');
    expect(errors).toHaveLength(1);
    expect(errors[0][0].message).toContain('上传文件有误');
    expect(errors[0][0].message).toContain('自筹项目');

    const { toast } = useToast();
    expect(toast.value.show).toBe(true);
    expect(toast.value.message).toContain('上传文件有误');
  });

  test('混入无关文件整批拒绝，合法文件也不解析', async () => {
    const wrapper = mountArea();
    await chooseFiles(wrapper, [BUSINESS, UNKNOWN]);

    expect(parseExcelFile).not.toHaveBeenCalled();
    expect(wrapper.emitted('file-uploaded')).toBeUndefined();

    const [error] = wrapper.emitted('file-error')[0];
    expect(error.message).toContain(`无法识别文件「${UNKNOWN}」`);
  });
});
