/**
 * 口径工具栏（ContractRuleBar）组件级测试
 * 验证关键词增删、含/不含模式切换、恢复默认与反馈文案是否符合预期，
 * 并确认「改动通过 v-model:rules 回传」——回到 Dashboard 后触发成本重算。
 */
import { mount } from '@vue/test-utils';
import ContractRuleBar from '../src/components/CostControl/ContractRuleBar.vue';
import { ContractRuleMode, createDefaultContractRules } from '../src/constants/costCategory';

const EXCLUDE_STATS = {
  subcontract: {
    total: 269,
    kept: 135,
    keptAmount: 88472994,
    excluded: 134,
    excludedAmount: 9263400,
    mode: ContractRuleMode.EXCLUDE,
    keywords: ['专利', '造价', '鉴定', '测试'],
  },
};

const mountBar = (props = {}) =>
  mount(ContractRuleBar, {
    props: {
      rules: createDefaultContractRules(),
      stats: EXCLUDE_STATS,
      ...props,
    },
  });

const lastRules = (wrapper) => {
  const events = wrapper.emitted('update:rules');
  return events?.[events.length - 1][0];
};

const findButton = (wrapper, label) =>
  wrapper.findAll('button').find((button) => button.text() === label);

describe('ContractRuleBar', () => {
  test('默认渲染四个关键词并展示剔除口径反馈', () => {
    const wrapper = mountBar();
    const text = wrapper.text();

    ['专利', '造价', '鉴定', '测试'].forEach((keyword) => expect(text).toContain(keyword));
    expect(text).toContain('项目分包费口径');
    expect(text).toContain('已按关键词剔除 134 行 / 926.3 万元');
  });

  test('点击标签上的 × 应删除该关键词并回传', async () => {
    const wrapper = mountBar();
    await wrapper.findAll('button[title^="删除关键词"]')[0].trigger('click');

    expect(lastRules(wrapper).subcontract.keywords).toEqual(['造价', '鉴定', '测试']);
  });

  test('输入关键词后回车应新增并回传，草稿被清空', async () => {
    const wrapper = mountBar();
    const input = wrapper.find('input[type="text"]');
    await input.setValue('外协');
    await input.trigger('keydown.enter');

    expect(lastRules(wrapper).subcontract.keywords).toContain('外协');
    expect(input.element.value).toBe('');
  });

  test('输入逗号应立即提交为关键词', async () => {
    const wrapper = mountBar();
    await wrapper.find('input[type="text"]').setValue('鉴定费,');

    expect(lastRules(wrapper).subcontract.keywords).toContain('鉴定费');
  });

  test('重复关键词不应重复添加，也不发无意义事件', async () => {
    const wrapper = mountBar();
    const input = wrapper.find('input[type="text"]');
    await input.setValue('专利');
    await input.trigger('keydown.enter');

    expect(wrapper.emitted('update:rules')).toBeUndefined();
  });

  test('草稿为空时退格应删除最后一个关键词', async () => {
    const wrapper = mountBar();
    await wrapper.find('input[type="text"]').trigger('keydown.backspace');

    expect(lastRules(wrapper).subcontract.keywords).toEqual(['专利', '造价', '鉴定']);
  });

  test('切换到「含关键词才算」应回传 include 模式', async () => {
    const wrapper = mountBar();
    await findButton(wrapper, '含关键词才算').trigger('click');

    expect(lastRules(wrapper).subcontract.mode).toBe(ContractRuleMode.INCLUDE);
  });

  test('include 模式下反馈文案展示保留行数与金额', () => {
    const rules = createDefaultContractRules();
    rules.subcontract.mode = ContractRuleMode.INCLUDE;

    const wrapper = mountBar({
      rules,
      stats: {
        subcontract: {
          ...EXCLUDE_STATS.subcontract,
          mode: ContractRuleMode.INCLUDE,
          kept: 135,
          keptAmount: 88472994,
        },
      },
    });

    expect(wrapper.text()).toContain('已按关键词保留 135 行 / 8,847.3 万元');
  });

  test('关键词清空后应提示按支出合同类型全量统计', () => {
    const rules = createDefaultContractRules();
    rules.subcontract.keywords = [];

    const wrapper = mountBar({ rules });
    expect(wrapper.text()).toContain('未设置关键词，按「支出合同类型」全量统计');
  });

  test('无支出合同时提示暂无匹配', () => {
    const wrapper = mountBar({ stats: {} });
    expect(wrapper.text()).toContain('暂无匹配的支出合同');
  });

  test('恢复默认应回传默认四词与剔除模式', async () => {
    const wrapper = mountBar({
      rules: {
        subcontract: {
          mode: ContractRuleMode.INCLUDE,
          keywords: ['外协'],
          matchFields: ['contractName'],
        },
      },
    });

    await findButton(wrapper, '恢复默认').trigger('click');

    const rules = lastRules(wrapper).subcontract;
    expect(rules.mode).toBe(ContractRuleMode.EXCLUDE);
    expect(rules.keywords).toEqual(['专利', '造价', '鉴定', '测试']);
    expect(rules.matchFields).toEqual(['contractName', 'itemName', 'contractSummary']);
  });
});
