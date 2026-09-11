/**
 * 应用级数据状态（Pinia）
 *
 * 数据流（单向）：
 *   上传 → datasets（原始行，按数据集类型存）
 *        → 派生 computed（项目列表 / KPI / 成本分析）
 *        → 各区域组件只读消费
 *
 * 刻意不再出现「组件内 ref → watch 写回 composable」的双向流动：
 * datasets 是唯一写入点，其余一律是派生结果。
 * 数据集类型与合并顺序全部来自 utils/uploadRouting 的注册表，
 * 因此新增一类数据源（如未来「预算表」）不需要改本文件。
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { calculateKpiData } from '../data/projectData';
import { calculateCostAnalysis } from '../data/costData';
import { createDefaultContractRules } from '../constants/costCategory';
import { ProjectType } from '../constants/projectStatus';
import { createDefaultFilters } from '../utils/projectFilters';
import { DATASET_TYPES, projectDatasetTypes } from '../utils/uploadRouting';

/** 支出合同的数据集 key（仅用于成本模块匹配实际支出，不进入项目列表） */
const CONTRACT_DATASET = 'contract';

/** 参与项目列表合并的数据集类型（按注册表 mergeOrder 升序，静态配置，模块加载时算一次） */
const PROJECT_DATASET_TYPES = projectDatasetTypes();

export const useDataStore = defineStore('data', () => {
  /** 原始数据集：{ [ACCEPT_CONFIG key]: 清洗后的行数组 } */
  const datasets = ref({});
  /** 全局筛选条件（跨区域共享：A/B/C/D/E 都以它为准） */
  const filters = ref(createDefaultFilters());
  /** E 区域口径规则（项目分包费关键词二次判定） */
  const contractRules = ref(createDefaultContractRules());

  /** 项目列表：按注册表顺序合并自筹 + 经营（自筹在前） */
  const projects = computed(() => PROJECT_DATASET_TYPES.flatMap((type) => datasets.value[type] || []));
  /** 支出合同明细 */
  const contracts = computed(() => datasets.value[CONTRACT_DATASET] || []);

  /** KPI 概览（依赖全局筛选的时间范围） */
  const kpiData = computed(() => calculateKpiData(projects.value, filters.value));

  /** 成本分析（依赖日期范围 + 经营/自筹口径 + 关键词规则） */
  const costAnalysis = computed(() => calculateCostAnalysis(projects.value, contracts.value, filters.value, {
    contractRules: contractRules.value,
  }));
  const costRows = computed(() => costAnalysis.value.rows);
  const costSummary = computed(() => costAnalysis.value.summary);
  const costRuleStats = computed(() => costAnalysis.value.ruleStats);

  /** 按项目类型过滤后的项目列表（日期范围只影响 KPI，与既有口径一致） */
  const applyFilters = () => {
    if (filters.value.projectType === ProjectType.ALL) return projects.value;
    return projects.value.filter((project) => project.projectType === filters.value.projectType);
  };

  /** 写入某个数据集的整套行（同一入口重复上传 = 替换） */
  const setDataset = (type, rows) => {
    if (!DATASET_TYPES.includes(type)) return;
    datasets.value = { ...datasets.value, [type]: Array.isArray(rows) ? rows : [] };
  };

  /** 取某个数据集的当前行（缺省空数组，调用方无需判空） */
  const getDataset = (type) => datasets.value[type] || [];

  const updateFilters = (next) => {
    filters.value = { ...filters.value, ...next };
  };

  const resetFilters = () => {
    filters.value = createDefaultFilters();
  };

  /** 重置口径规则（E 区域「恢复默认」） */
  const resetContractRules = () => {
    contractRules.value = createDefaultContractRules();
  };

  /** 全量重置：清空所有数据集与筛选（供「上传新台账」与测试隔离使用） */
  const resetAll = () => {
    datasets.value = {};
    resetFilters();
    resetContractRules();
  };

  return {
    // state
    datasets,
    filters,
    contractRules,
    // getters
    projects,
    contracts,
    kpiData,
    costAnalysis,
    costRows,
    costSummary,
    costRuleStats,
    // actions
    applyFilters,
    setDataset,
    getDataset,
    updateFilters,
    resetFilters,
    resetContractRules,
    resetAll,
  };
});
