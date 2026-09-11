<template>
  <!--
    E 区域口径工具栏：口径同时影响成本对比图、成本明细表与超支下钻弹窗，故放在区域级而非表格工具栏内
    与 CostTable 工具栏同宽同风格（max-w-[1400px] 居中 + 白底圆角卡片）
  -->
  <div class="mx-auto flex max-w-[1400px] flex-wrap items-start justify-between gap-3 rounded-lg bg-white p-4 shadow-sm">
    <div class="flex flex-1 flex-col gap-3">
      <div
        v-for="category in categories"
        :key="category.key"
        class="flex flex-wrap items-center gap-2"
      >
        <span class="text-sm text-gray-500">{{ category.label }}口径</span>

        <!-- 模式切换：默认「不含关键词才算该分类」 -->
        <div class="inline-flex h-8 items-center gap-0.5 rounded border border-gray-300 p-0.5">
          <button
            v-for="option in modeOptions"
            :key="option.value"
            type="button"
            class="h-7 rounded px-3 text-xs font-medium transition-colors"
            :class="ruleOf(category.key).mode === option.value
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'"
            @click="setMode(category.key, option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <!-- 关键词标签：点击 × 删除 -->
        <span
          v-for="keyword in ruleOf(category.key).keywords"
          :key="keyword"
          class="inline-flex h-8 items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 text-xs text-blue-700"
        >
          {{ keyword }}
          <button
            type="button"
            class="text-blue-400 transition-colors hover:text-blue-600"
            :title="`删除关键词「${keyword}」`"
            @click="removeKeyword(category.key, keyword)"
          >
            ×
          </button>
        </span>

        <!-- 输入草稿：回车 / 逗号 / 失焦才转成标签，避免逐字符触发全量重算 -->
        <input
          v-model="drafts[category.key]"
          type="text"
          class="h-8 w-44 rounded border border-gray-300 px-2 text-xs text-gray-700 outline-none focus:border-blue-400"
          placeholder="输入关键词，回车或逗号添加"
          @input="handleDraftInput(category.key)"
          @keydown.enter.prevent="commitDraft(category.key)"
          @keydown.backspace="handleBackspace(category.key)"
          @blur="commitDraft(category.key)"
        />

        <button
          type="button"
          class="h-8 rounded border border-gray-300 px-3 text-xs text-gray-600 transition-colors hover:bg-gray-50"
          @click="resetCategory(category.key)"
        >
          恢复默认
        </button>
      </div>
    </div>

    <!-- 即时反馈：规则变化后 E 区域金额与超支标记立即重算 -->
    <div class="shrink-0 text-right text-xs leading-5 text-gray-500">
      <p v-for="line in feedbackLines" :key="line">{{ line }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import {
  CATEGORIES_WITH_KEYWORD_RULE,
  ContractRuleMode,
  createDefaultContractRules,
  normalizeKeywords,
} from '../../constants/costCategory';

const props = defineProps({
  /** 分类关键词规则：{ [分类key]: { mode, keywords, matchFields } } */
  rules: { type: Object, default: () => ({}) },
  /** calculateCostAnalysis 返回的 ruleStats，用于展示剔除（或保留）行数与金额 */
  stats: { type: Object, default: () => ({}) },
  /** 声明了关键词规则的分类，默认取成本分类配置（当前仅项目分包费） */
  categories: { type: Array, default: () => CATEGORIES_WITH_KEYWORD_RULE },
});

const emit = defineEmits(['update:rules']);

const modeOptions = [
  { value: ContractRuleMode.EXCLUDE, label: '不含关键词才算' },
  { value: ContractRuleMode.INCLUDE, label: '含关键词才算' },
];

// 每个分类一份输入草稿
const drafts = reactive({});

const ruleOf = (key) =>
  props.rules?.[key] || { mode: ContractRuleMode.EXCLUDE, keywords: [], matchFields: [] };

const sameKeywords = (left, right) =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const updateRule = (key, patch) => {
  emit('update:rules', { ...props.rules, [key]: { ...ruleOf(key), ...patch } });
};

/** 新增关键词：归一化后与现状一致则不发事件，避免无意义重算 */
const addKeywords = (key, rawList) => {
  const current = normalizeKeywords(ruleOf(key).keywords);
  const next = normalizeKeywords([...current, ...rawList]);
  if (sameKeywords(current, next)) return;

  updateRule(key, { keywords: next });
};

const removeKeyword = (key, keyword) => {
  const next = normalizeKeywords(ruleOf(key).keywords).filter((item) => item !== keyword);
  updateRule(key, { keywords: next });
};

const setMode = (key, mode) => {
  if (ruleOf(key).mode === mode) return;
  updateRule(key, { mode });
};

const commitDraft = (key) => {
  const draft = String(drafts[key] ?? '');
  drafts[key] = '';
  if (!draft.trim()) return;

  addKeywords(key, draft.split(/[,，;；\s]+/));
};

/** 输入逗号 / 分号即视为一个关键词完成，其余字符继续留在草稿里 */
const handleDraftInput = (key) => {
  if (/[,，;；]/.test(String(drafts[key] ?? ''))) commitDraft(key);
};

/** 草稿为空时退格删除最后一个关键词，符合标签输入的惯用操作 */
const handleBackspace = (key) => {
  if (String(drafts[key] ?? '') !== '') return;

  const keywords = normalizeKeywords(ruleOf(key).keywords);
  if (keywords.length === 0) return;
  removeKeyword(key, keywords[keywords.length - 1]);
};

const resetCategory = (key) => {
  drafts[key] = '';
  const defaults = createDefaultContractRules();
  if (defaults[key]) updateRule(key, defaults[key]);
};

/** 金额展示为万元，保留 1 位小数 */
const formatAmount = (value) => {
  const wan = (Number(value) || 0) / 10000;
  return `${wan.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} 万元`;
};

const feedbackLines = computed(() =>
  props.categories.map((category) => {
    const rule = ruleOf(category.key);
    const keywords = normalizeKeywords(rule.keywords);
    if (keywords.length === 0) {
      return `${category.label}：未设置关键词，按「支出合同类型」全量统计`;
    }

    const stat = props.stats?.[category.key];
    if (!stat || !stat.total) {
      return `${category.label}：关键词「${keywords.join('、')}」暂无匹配的支出合同`;
    }

    return rule.mode === ContractRuleMode.INCLUDE
      ? `${category.label}：已按关键词保留 ${stat.kept} 行 / ${formatAmount(stat.keptAmount)}`
      : `${category.label}：已按关键词剔除 ${stat.excluded} 行 / ${formatAmount(stat.excludedAmount)}`;
  })
);
</script>
