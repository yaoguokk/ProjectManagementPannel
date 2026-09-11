/**
 * 全局筛选条件 ↔ URL query 双向同步
 *
 * 在 App.vue（布局层）调用一次即可，所有视图共享同一份筛选：
 * - 进入页面 / 浏览器前进后退 → URL 为准，写回 store
 * - 用户在 B 区域改筛选        → store 为准，写回 URL（replace，不污染历史）
 *
 * 两个方向都先做等价判断，避免「写 store → 写 URL → 又写 store」的循环。
 * 业务口径（默认值、合法取值）全部来自 utils/filterQuery.js 的纯函数。
 */
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDataStore } from '../stores/dataStore';
import { createDefaultFilters } from '../utils/projectFilters';
import {
  decodeFilterQuery,
  encodeFilterQuery,
  filtersEqual,
  queryEquals,
} from '../utils/filterQuery';

export const useFilterQuerySync = () => {
  const route = useRoute();
  const router = useRouter();
  const dataStore = useDataStore();
  const { filters } = storeToRefs(dataStore);

  /** URL → store（刷新 / 分享链接 / 前进后退时生效） */
  const applyQueryToStore = () => {
    const next = decodeFilterQuery(route.query, createDefaultFilters());
    if (!filtersEqual(next, filters.value)) {
      dataStore.updateFilters(next);
    }
  };

  /** store → URL（replace：筛选变化不该产生一堆历史记录） */
  const applyStoreToQuery = () => {
    const nextQuery = encodeFilterQuery(filters.value, createDefaultFilters());
    if (!queryEquals(nextQuery, route.query)) {
      router.replace({ query: nextQuery });
    }
  };

  onMounted(applyQueryToStore);

  watch(() => route.query, applyQueryToStore, { deep: true });
  watch(filters, applyStoreToQuery, { deep: true });
};
