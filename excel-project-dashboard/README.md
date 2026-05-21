# Excel 项目台账数据清洗与展示 SPA 应用

一个基于 Vue 3 的单页应用，用于 Excel 项目台账数据的清洗、展示和可视化分析。

## 项目特性

- 📊 **数据可视化** - 使用 ECharts 展示项目验收完成率
- 🔍 **高级过滤** - 支持时间范围和项目类型筛选
- 📋 **数据表格** - 功能丰富的数据表格，支持搜索、分页、导出
- 🧹 **数据清洗** - 自动清理 Excel 数据格式
- 🎨 **现代 UI** - 基于 Tailwind CSS 的响应式设计
- 🧪 **单元测试** - 完整的测试覆盖

## 技术栈

- **框架**: Vue 3 + Vite
- **UI 库**: Tailwind CSS
- **图表**: ECharts
- **Excel 处理**: xlsx (SheetJS)
- **状态管理**: Vue Composables
- **测试**: Vitest + Vue Test Utils

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

## 项目结构

```
src/
├── components/          # Vue 组件
│   ├── Dashboard/       # 主页面组件
│   ├── KpiCards/        # KPI 指标卡片
│   ├── ProjectTable/   # 项目数据表格
│   ├── UploadArea/      # 文件上传组件
│   ├── filters/        # 过滤器组件
│   └── common/          # 通用组件 (Toast, EmptyState)
├── composables/         # 组合式函数
├── constants/           # 常量定义
├── utils/              # 工具函数
│   ├── excelParser.js  # Excel 解析工具
│   └── dataCleaner.js  # 数据清洗工具
├── data/               # 示例数据
└── App.vue             # 根组件
```

## 核心功能

### 1. Excel 数据导入

```javascript
import { parseExcelFile } from './utils/excelParser';

// 解析 Excel 文件
const file = event.target.files[0];
const { headers, rows } = await parseExcelFile(file);
```

### 2. 数据清洗

```javascript
import { formatDate, cleanNumber, filterEmptyRows } from './utils/dataCleaner';

// 格式化日期
const cleanDate = formatDate(excelDateValue);

// 清洗数字
const cleanBudget = cleanNumber(rawBudgetValue);

// 过滤空行
const validRows = filterEmptyRows(rows, ['projectName', 'budget']);
```

### 3. KPI 计算

```javascript
import { calculateKpiData } from './data/projectData';

const kpiData = calculateKpiData(projects, filters);
```

### 4. Toast 提示

```javascript
import { useToast } from './composables/useToast';

const { showSuccess, showError, showToast } = useToast();

// 显示成功提示
showSuccess('操作成功');

// 显示错误提示
showError('操作失败');

// 自定义提示
showToast('自定义消息', 'warning');
```

## 组件使用

### KpiCards 组件

```vue
<KpiCards :kpiData="kpiData" />
```

### ProjectTable 组件

```vue
<ProjectTable
  :projects="projects"
  :projectType="filters.projectType"
  @export="handleExport"
  @open-detail="handleOpenDetail"
/>
```

### 过滤器组件

```vue
<DateRangeFilter v-model:dateRange="filters.dateRange" />
<ProjectTypeFilter v-model:projectType="filters.projectType" />
```

## 常量定义

项目状态和类型常量定义在 `src/constants/projectStatus.js`：

```javascript
export const ProjectStatus = {
  COMPLETED: '已完成',
  INCOMPLETE: '未完成',
  DELAYED: '已延期'
};

export const ProjectType = {
  BUSINESS: '经营项目',
  SELF_FINANCED: '自筹项目'
};
```

## 测试

运行测试：

```bash
npm test
```

运行测试 UI：

```bash
npm run test:ui
```

## 开发规范

遵循以下开发规范：

1. **组件拆分** - 单个文件不超过 200 行
2. **逻辑分离** - 业务逻辑抽离到 utils/composables
3. **常量定义** - 消除魔法数字
4. **错误处理** - try-catch 包裹所有数据操作
5. **注释规范** - 关键逻辑添加中文注释

## 部署

```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 许可证

MIT