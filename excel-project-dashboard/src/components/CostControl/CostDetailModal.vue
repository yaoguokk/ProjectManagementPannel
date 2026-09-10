<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- 遮罩 -->
      <div class="absolute inset-0 bg-black/40" @click="handleClose"></div>

      <!-- 弹窗主体 -->
      <div
        class="relative flex max-h-[88vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <!-- 头部：项目名称 + 状态 -->
        <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="truncate text-lg font-semibold text-gray-800" :title="row?.projectName">
                {{ row?.projectName || '-' }}
              </h3>
              <span
                v-if="row"
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="row.hasOverBudget ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
              >
                {{ row.hasOverBudget ? '超支' : '正常' }}
              </span>
            </div>
            <p class="mt-1 text-xs text-gray-500">
              项目编号 {{ row?.projectCode || '-' }} · 超支科目
              {{ row?.overCategories?.join('、') || '无' }}
            </p>
          </div>
          <button
            class="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="关闭"
            @click="handleClose"
          >
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <!-- 项目信息条 -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-gray-100 bg-gray-50 px-6 py-3 text-xs sm:grid-cols-5">
          <div v-for="info in projectInfos" :key="info.label">
            <span class="text-gray-400">{{ info.label }}</span>
            <p class="mt-0.5 truncate text-gray-700" :title="info.value">{{ info.value }}</p>
          </div>
        </div>

        <!-- 成本科目切换（超支科目默认选中） -->
        <div class="flex flex-wrap gap-3 border-b border-gray-100 px-6 py-4">
          <button
            v-for="category in categories"
            :key="category.key"
            class="min-w-[190px] rounded-lg border px-4 py-3 text-left transition-colors"
            :class="category.key === activeKey
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:bg-gray-50'"
            @click="activeKey = category.key"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-semibold text-gray-700">{{ category.label }}</span>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="category.over ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'"
              >
                {{ category.over ? '超支' : '正常' }}
              </span>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <span>立项 {{ formatAmount(category.budget) }}</span>
              <span>实际 {{ formatAmount(category.actual) }}</span>
            </div>
            <div
              class="mt-1 text-xs font-semibold"
              :class="category.over ? 'text-red-600' : 'text-gray-500'"
            >
              差额 {{ formatDiff(category.diff) }}
            </div>
          </button>
        </div>

        <!-- 当前科目的支出合同明细 -->
        <div class="flex min-h-0 flex-1 flex-col px-6 py-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <h4 class="text-sm font-semibold text-gray-700">
              {{ activeCategory?.label || '-' }} · 支出合同明细
            </h4>
            <span class="shrink-0 text-xs text-gray-500">
              共 {{ activeContracts.length }} 份合同，按事项金额倒序
            </span>
          </div>

          <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-100">
            <table class="min-w-full border-collapse text-xs">
              <thead class="sticky top-0 z-10 bg-gray-50 text-gray-500">
                <tr>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">合同编号</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">合同名称</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">签订时间</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">事项名称</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-right font-semibold">事项金额</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-right font-semibold">合同总额</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">乙方</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">承办人</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">采购类型</th>
                  <th class="whitespace-nowrap px-3 py-2.5 text-left font-semibold">合同状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="contract in activeContracts"
                  :key="contract.id"
                  class="border-b border-gray-50 last:border-b-0 hover:bg-gray-50"
                >
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.contractNo || '-' }}
                  </td>
                  <td
                    class="min-w-[260px] max-w-sm px-3 py-2.5 text-gray-700"
                    :title="contract.contractName"
                  >
                    {{ contract.contractName || '-' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.signDate || '-' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.itemName || '-' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-gray-800">
                    {{ formatAmount(contract.amount) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-right text-gray-600">
                    {{ formatAmount(contract.contractAmount) }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.supplier || '-' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.handler || '-' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.purchaseType || '-' }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2.5 text-gray-600">
                    {{ contract.contractStatus || '-' }}
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-if="activeContracts.length === 0" class="py-10 text-center text-xs text-gray-500">
              该成本科目暂无支出合同记录
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
  // 控制弹窗显隐
  visible: {
    type: Boolean,
    default: false,
  },
  // calculateCostAnalysis 的 rows 中的一行
  row: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close']);

const activeKey = ref('');

const categories = computed(() => props.row?.categories || []);

const activeCategory = computed(
  () => categories.value.find((item) => item.key === activeKey.value) || categories.value[0] || null
);

const activeContracts = computed(() => activeCategory.value?.contracts || []);

/** 默认选中超支金额最大的科目（聚焦超支主因），无超支科目时选第一个 */
const pickDefaultKey = (row) => {
  const list = row?.categories || [];
  if (list.length === 0) return '';
  const overList = list.filter((item) => item.over);
  if (overList.length === 0) return list[0].key;
  return overList.reduce((max, item) => (item.diff > max.diff ? item : max), overList[0]).key;
};

watch(
  () => props.row,
  (row) => {
    activeKey.value = pickDefaultKey(row);
  },
  { immediate: true }
);

const projectInfos = computed(() => {
  const row = props.row || {};
  return [
    { label: '项目经理', value: row.manager || '-' },
    { label: '业务部所', value: row.department || '-' },
    // 与表格列同口径：展示台账原始「项目类型」（经营 / 自筹仅体现在 B 区域顶部筛选）
    { label: '项目类型', value: row.projectTypeLabel || '-' },
    { label: '计划终验时间', value: row.planFinalDate || '-' },
    { label: '实际终验时间', value: row.actualFinalDate || '-' },
  ];
});

const formatAmount = (value) =>
  new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value || 0);

const formatDiff = (value) => {
  const amount = value || 0;
  return `${amount > 0 ? '+' : ''}${formatAmount(amount)}`;
};

const handleClose = () => emit('close');

const handleKeydown = (event) => {
  if (event.key === 'Escape') handleClose();
};

// 打开时锁定页面滚动并监听 Esc，关闭或卸载时恢复
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', handleKeydown);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});
</script>
