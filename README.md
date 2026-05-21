# 项目验收完成率概览

## 项目简介

这是一个基于 Vue 3 + Vite 构建的项目验收完成率概览单页应用，用于展示和分析项目的初验、终验完成情况，支持多维度的数据过滤和可视化展示。

## 技术栈

- Vue 3
- Vite
- Tailwind CSS
- ECharts (图表库)
- TypeScript

## 项目结构

```
src/
├── components/          # 组件目录
│   ├── common/         # 通用组件
│   │   ├── Toast.vue        # Toast提示组件
│   │   └── EmptyState.vue   # 空状态组件
│   ├── filters/       # 过滤器组件
│   │   ├── DateRangeFilter.vue  # 日期范围过滤器
│   │   └── ProjectTypeFilter.vue # 项目类型过滤器
│   ├── KpiCards/      # KPI卡片组件
│   │   └── KpiCards.vue     # KPI概览卡片
│   ├── ProjectTable/  # 项目表格组件
│   │   └── ProjectTable.vue # 项目明细表格
│   └── UploadArea/    # 上传区域组件
│       └── UploadArea.vue   # Excel上传组件
├── composables/       # 组合式函数
│   ├── useProjectData.js    # 项目数据处理
│   ├── useExcelParser.js    # Excel解析
│   └── useToast.js          # Toast提示
├── constants/         # 常量定义
│   └── projectStatus.js    # 项目状态常量
├── data/             # 数据文件
│   └── projectData.js       # 项目数据逻辑
├── utils/            # 工具函数
│   ├── excelParser.js      # Excel解析工具
│   └── dataCleaner.js      # 数据清洗工具
├── App.vue           # 主应用组件
└── main.css          # 全局样式
```

## 功能特性

### 1. 过滤器系统
- 日期范围选择（本月/自定义）
- 项目类型筛选（全部/经营项目/自筹项目）
- 实时数据过滤

### 2. KPI概览卡片
- 初验/终验完成率环形图
- 计划金额、完成金额、项目数展示
- 细分情况表格

### 3. 项目明细表格
- Tab切换（初验/终验项目）
- 状态过滤（全部/已按期完成/未完成/延期）
- 搜索功能（项目名称/项目经理）
- 分页控制
- 导出Excel功能

### 4. 错误处理
- Toast提示
- 错误边界
- 空状态展示

## 代码规范

本项目严格遵守以下代码工程规范：

1. **架构与组件拆分**：单个组件不超过200行，逻辑与视图分离
2. **代码整洁性**：语义化命名，杜绝魔法数字，关键逻辑添加注释
3. **组件化与复用**：通用组件抽离，使用Tailwind CSS
4. **健壮性**：try-catch处理，错误提示，空状态处理
5. **测试规范**：核心业务逻辑编写单元测试

## 开发指南

### 安装依赖
```bash
npm install
```

### 运行项目
```bash
npm run dev
```

### 运行测试
```bash
npm run test
```

## 常量定义

项目状态常量：
```javascript
export const ProjectStatus = {
  COMPLETED: '已完成',
  INCOMPLETE: '未完成',
  DELAYED: '已延期',
  IN_PROGRESS: '进行中',
  PAUSED: '已暂停'
};
```

项目类型常量：
```javascript
export const ProjectType = {
  BUSINESS: '经营项目',
  SELF_FINANCED: '自筹项目'
};
```

## 组合式函数

使用 `useProjectData` 管理项目数据：
```javascript
const { filters, kpiData, updateFilters } = useProjectData();
```

使用 `useToast` 处理提示：
```javascript
const { showSuccess, showError } = useToast();
```

## 组件使用

### 日期范围过滤器
```vue
<DateRangeFilter v-model:dateRange="filters.dateRange" />
```

### KPI卡片
```vue
<KpiCards :kpiData="kpiData" />
```

### 项目表格
```vue
<ProjectTable
  :projects="projects"
  :projectType="filters.projectType"
  @export="handleExport"
/>
```

## 注意事项

1. 所有涉及数据转换的地方都有错误处理
2. 组件只负责渲染和交互，业务逻辑抽离到工具函数
3. 使用常量定义所有状态值，避免魔法数字
4. 每个组件都有相应的测试用例
