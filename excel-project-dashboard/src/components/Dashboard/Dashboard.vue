<template>
  <!--
    区域编排入口：区域顺序 / 标题 / 颜色全部来自 constants/sections.js，
    新增区域（F/G…）只需登记配置 + 新建容器组件，本文件零改动。
  -->
  <Breadcrumbs />

  <div class="main-container space-y-6">
    <component
      v-for="section in SECTIONS"
      :key="section.id"
      :is="section.component"
      :section="section"
    />

    <!-- 全局空状态 -->
    <EmptyState
      v-if="!isLoading && filteredProjects.length === 0"
      title="暂无数据"
      description="当前筛选条件下没有找到项目数据"
      show-action
      action-text="重置筛选"
      @action="resetFilters"
    />
  </div>
</template>

<script setup>
/**
 * 数据流：上传 → dataStore.datasets → 派生 computed → 各区域组件只读消费（单向）。
 * 本组件不再持有任何业务数据 ref，也不再向 store 回写合并结果。
 */
import { ref, computed } from 'vue';
import { SECTIONS } from '../../constants/sections';
import { useDataStore } from '../../stores/dataStore';
import Breadcrumbs from '../common/Breadcrumbs.vue';
import EmptyState from '../common/EmptyState.vue';

const dataStore = useDataStore();
const isLoading = ref(false);

/** 按项目类型过滤后的项目列表（供全局空态判定，D 区域内部同样派生自 store） */
const filteredProjects = computed(() => dataStore.applyFilters());

const resetFilters = () => {
  dataStore.resetFilters();
};
</script>

<style scoped>
.main-container {
  padding: 0 1.5rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}
</style>
