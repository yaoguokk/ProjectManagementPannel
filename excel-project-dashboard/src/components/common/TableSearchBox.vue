<template>
  <div class="search-box" :class="{ 'is-global-search': mode === 'global' }">
    <select
      :value="mode"
      class="search-mode"
      aria-label="搜索范围"
      @change="handleModeChange"
    >
      <option value="basic">基础搜索</option>
      <option value="global">全局搜索</option>
    </select>
    <select
      v-if="mode === 'global'"
      :value="matchMode"
      class="search-match-mode"
      aria-label="关键词匹配方式"
      @change="handleMatchModeChange"
    >
      <option value="any">任意关键词（或）</option>
      <option value="all">全部关键词（与）</option>
    </select>
    <div class="search-input-wrapper">
      <input
        :value="query"
        type="text"
        :placeholder="mode === 'global' ? globalPlaceholder : basicPlaceholder"
        @input="handleInput"
      />
      <svg xmlns="http://www.w3.org/2000/svg" class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <button
      type="button"
      class="search-help"
      aria-label="搜索使用说明"
    >
      <span class="search-help-icon">?</span>
      <span class="search-help-tooltip" role="tooltip">
        <strong>搜索使用说明</strong>
        <span>基础搜索：{{ basicFieldsHint }}</span>
        <span>全局搜索：{{ globalFieldsHint }}</span>
        <span>多个关键词用逗号、顿号、分号或换行分隔。</span>
        <span>“任意关键词（或）”：命中一个即可。</span>
        <span>“全部关键词（与）”：必须同时命中所有关键词。</span>
      </span>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  query: { type: String, default: '' },
  mode: { type: String, default: 'basic' },
  matchMode: { type: String, default: 'any' },
  basicPlaceholder: { type: String, default: '输入关键词...' },
  globalPlaceholder: { type: String, default: '输入全字段关键词...' },
  basicFieldsHint: { type: String, default: '项目名称、编号、项目经理。' },
  globalFieldsHint: { type: String, default: '项目的所有业务字段。' },
});

const emit = defineEmits(['update:query', 'update:mode', 'update:matchMode', 'change']);

const handleInput = (event) => {
  emit('update:query', event.target.value);
  emit('change');
};

const handleModeChange = (event) => {
  emit('update:mode', event.target.value);
  emit('change');
};

const handleMatchModeChange = (event) => {
  emit('update:matchMode', event.target.value);
  emit('change');
};
</script>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 360px;
}

.search-box.is-global-search {
  width: 500px;
}

.search-mode {
  height: 2.25rem;
  width: 6.5rem;
  padding: 0 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #374151;
  font-size: 0.813rem;
  flex-shrink: 0;
}

.search-match-mode {
  height: 2.25rem;
  width: 8.5rem;
  padding: 0 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background-color: white;
  color: #374151;
  font-size: 0.813rem;
  flex-shrink: 0;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-help {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  cursor: help;
  flex-shrink: 0;
}

.search-help-icon {
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1;
}

.search-help-tooltip {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 300px;
  padding: 0.75rem 0.875rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #1f2937;
  color: white;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.18);
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: left;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition: opacity 0.15s ease, visibility 0.15s ease;
}

.search-help:hover .search-help-tooltip,
.search-help:focus-visible .search-help-tooltip,
.search-help:focus-within .search-help-tooltip {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}

.search-box input {
  width: 100%;
  height: 2.25rem;
  padding: 0 1rem 0 2.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  width: 1.25rem;
  height: 1.25rem;
}

@media (max-width: 1300px) {
  .search-box,
  .search-box.is-global-search {
    width: min(100%, 540px);
  }
}

@media (max-width: 768px) {
  .search-box,
  .search-box.is-global-search {
    width: 100%;
  }
}
</style>
