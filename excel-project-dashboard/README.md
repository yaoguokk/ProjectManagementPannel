# Excel 项目台账数据清洗与展示 SPA

基于 Vue 3 的单页应用，用于经营项目/自筹项目台账数据的导入、清洗、KPI 计算和明细展示。

## 项目特性

- **双通道上传** - 经营项目和自筹项目分别上传，文件名自动校验
- **数据清洗** - 自动过滤无效行、格式化日期/金额、万元→元转换
- **KPI 概览** - 初验/终验完成率环形图，按项目类型细分统计
- **动态表格** - 77/50 列全字段可选展示，列选择器支持搜索和默认重置
- **Excel 导出** - 一键导出当前筛选的全部项目为 .xlsx
- **筛选联动** - 时间范围 + 项目类型筛选，KPI 和表格同步响应
- **Tailwind CSS** - 现代响应式 UI

## 技术栈

- **框架**: Vue 3 + Vite + Composition API
- **样式**: Tailwind CSS v4
- **Excel**: xlsx (SheetJS)
- **测试**: Vitest + Vue Test Utils

## 快速开始

```bash
npm install
npm run dev        # 开发 → http://localhost:5173/
npm run build      # 构建
npm test           # 测试
```

## 页面布局

```
┌─ A 数据导入 ──────────────────────────┐
│  经营项目上传  │  自筹项目上传          │
├─ B 数据筛选 ──────────────────────────┤
│  时间范围选择  │  项目类型  │  [查询]   │
├─ C KPI 概览 ──────────────────────────┤
│  初验完成率    │  终验完成率            │
├─ D 项目明细 ──────────────────────────┤
│  初验/终验Tab  │  状态筛选  │  表格    │
│  列选择器  │  搜索  │  导出Excel       │
└───────────────────────────────────────┘
```

## 项目结构

```
src/
├── components/
│   ├── Dashboard/         # 主页面，4 区域布局枢纽
│   ├── KpiCards/          # KPI 指标卡片（环形进度图 + 细分表）
│   ├── ProjectTable/      # 项目表格 + 列选择器 + 导出
│   ├── UploadArea/        # 文件上传（拖拽/点击）
│   ├── filters/           # DateRangeFilter / ProjectTypeFilter
│   └── common/            # Breadcrumbs / EmptyState / Toast
├── composables/
│   ├── useProjectData.js  # 筛选状态 + KPI 计算 + 数据过滤
│   └── useToast.js        # Toast 提示
├── constants/
│   └── projectStatus.js   # 项目状态/类型常量（中文值）
├── utils/
│   ├── excelParser.js     # SheetJS 解析（支持 skipRows）
│   ├── dataCleaner.js     # 精确列名映射 + 过滤 + 格式化
│   └── __tests__/         # 单元测试
├── data/
│   └── projectData.js     # KPI 计算公式 + 模拟数据
└── App.vue
```

## 核心逻辑

### 数据清洗规则

**经营项目** (`cleanExcelData`):
1. 排除"立项方式"为"基于商机立项"的行
2. 只保留项目状态为 待结算/已结算/待终验/待初验
3. 去除字符串前后空格、统一日期为 YYYY-MM-DD、清洗金额符号
4. 根据文件名自动标记 `projectType = '经营项目'`

**自筹项目** (`cleanSelfFundedData`):
1. 只保留项目进度为 待结算/已结算/待终验/待初验
2. 去除字符串前后空格、统一日期为 YYYY-MM-DD、清洗金额符号
3. 投资总金额(万元) × 10000 → 统一为元

### KPI 计算公式

```
初验完成率:
  统计范围 = planInitialDate ∈ [时间范围]
  计划金额 = sum(统计范围内 立项收入)
  完成金额 = sum(统计范围内 actualInitialDate≠空 的 立项收入)
  完成率 = 完成金额 / 计划金额 × 100%

终验完成率: 同上，使用 planFinalDate / actualFinalDate
```

### Excel 列名映射（经营项目 77列 → 12个程序字段）

| 程序字段 | Excel 列名 |
|---------|-----------|
| projectCode | 项目编号 |
| projectName | 项目名称 |
| manager | 项目经理 |
| department | 业务部所 |
| projectType | 项目类型（或文件名判定） |
| budget | 立项收入(元) |
| planInitialDate | 项目计划初验时间含变更 |
| planFinalDate | 项目计划终验时间含变更 |
| actualInitialDate | 项目实际初验时间 |
| actualFinalDate | 项目实际终验时间 |
| startDate | 立项审批完成时间 |
| status | 项目状态 |

### 关键常量（中文值）

```javascript
// 项目类型
ProjectType.BUSINESS      = '经营项目'
ProjectType.SELF_FINANCED = '自筹项目'

// 项目状态
ProjectStatus.PENDING_INITIAL      = '待初验'
ProjectStatus.PENDING_FINAL        = '待终验'
ProjectStatus.PENDING_SETTLEMENT   = '待结算'
ProjectStatus.SETTLED              = '已结算'
```

## 测试数据

```
经营项目: /Users/yao/Desktop/项目全景展示/excel upload file /经营项目台账明细列表_20260522150106604.xlsx
自筹项目: /Users/yao/Desktop/项目全景展示/excel upload file /自筹项目台账列表_20260518160212361.xlsx
```

## 开发规范

1. **组件拆分** - 单文件 ≤ 200 行
2. **逻辑分离** - 业务逻辑在 utils/composables，组件只负责渲染
3. **消除魔法数字** - 状态/类型使用常量引用
4. **错误处理** - 所有数据操作包裹 try-catch
5. **中文优先** - 数据值、常量、比较字符串均使用中文，禁止英文关键词

## 许可证

MIT
