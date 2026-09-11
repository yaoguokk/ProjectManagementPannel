# Excel 项目台账数据清洗与展示 SPA

基于 Vue 3 的单页应用，用于经营项目/自筹项目台账数据的导入、清洗、KPI 计算和明细展示。

## 项目特性

- **多页面路由** - `#/overview` 项目验收完成率概览（含数据导入）/ `#/projects` 项目明细 / `#/cost` 成本管控；hash 模式（单文件产物可 `file://` 直接打开），筛选条件同步到 URL query 可分享可刷新
- **双通道上传** - 经营项目和自筹项目分别上传；任一入口可一次选择 1-3 个 Excel，按文件名关键词自动分发到对应入口
- **数据清洗** - 自动过滤无效行、格式化日期/金额、万元→元转换
- **KPI 概览** - 初验/终验完成率环形图，按项目类型细分统计
- **动态表格** - 77/50 列全字段可选展示，列选择器支持搜索和默认重置
- **成本管控** - 支出合同匹配项目成本，按分类统计超支/差额并支持下钻详情
- **列设置与搜索复用** - D/E 区域共用 `ColumnSelector` 与 `TableSearchBox`，E 区域同样可配置展示列、可按关键词搜索
- **表格列宽可调** - D/E 区域表头可拖动调整列宽，两处共用 `useColumnResize`
- **业务部所展示口径** - E 区域可在「全部展示 / 仅部门」间切换，自筹项目的 `公司/公司/部门` 可只显示部门名
- **明细表格通铺** - D/E 区域表格突破 1400px 内容宽度撑满视口、随窗口宽度变化，工具栏与分页仍与 A/B/C 区域对齐
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

## 页面路由（方案 B：vue-router + hash 模式）

产物是单文件 HTML，用户常双击 `file://` 打开，因此采用 hash 模式（`#/cost`），
history 模式在 `file://` 下刷新/直达会 404。

| 路由 | 视图 | 组合内容 |
|------|------|---------|
| `#/overview`（默认） | `views/OverviewView.vue` | A 数据导入 + B 筛选 + C KPI |
| `#/projects` | `views/ProjectsView.vue` | B 筛选 + D 项目明细表 |
| `#/cost` | `views/CostView.vue` | B 筛选 + E 成本管控（口径条 + 超支分布图 + 明细表） |

- 数据导入（A 区域）归属概览页，不单独占导航项；超支分布图只属于 E 区域，仅在 `#/cost` 展示。
- 视图只拼装既有 `components/sections/*` 容器，不复制业务逻辑（区域元数据走 `getSection(id)`）。
- `router/index.js` 的 `NAV_ITEMS` 是「顶部导航 / 路由注册 / 面包屑标题」的唯一来源，新增页面只加一条。
- 筛选条件（项目类型 / 时间范围）与 URL query 双向同步（`utils/filterQuery.js` + `composables/useFilterQuerySync.js`）：
  只写非默认值、非法参数回退默认值、用 `replace` 写入不污染历史。
- 整批上传成功后自动跳转到概览页（跳转发生在 `UploadArea` 的 `batch-done` 之后；逐个文件成功就跳会卸载页面、丢掉同批后续文件的事件）。

## 页面布局

```
┌─ A 数据导入 ──────────────────────────┐
│  经营项目上传 │ 自筹项目上传 │ 支出合同 │
├─ B 数据筛选 ──────────────────────────┤
│  时间范围选择  │  项目类型  │  [查询]   │
├─ C KPI 概览 ──────────────────────────┤
│  初验完成率    │  终验完成率            │
├─ D 项目明细 ──────────────────────────┤
│  初验/终验Tab  │  状态筛选  │  表格    │
│  列选择器  │  搜索  │  导出Excel       │
├─ E 成本管控 ──────────────────────────┤
│  成本构成图  │  超支筛选  │  表格      │
│  列选择器 │ 搜索 │ 业务部所 │ 导出/图片 │
└───────────────────────────────────────┘
```

## 项目结构

```
src/
├── views/                 # 页面视图：Overview（含数据导入）/ Projects / Cost（只拼装区域容器）
├── router/                # 路由表 + NAV_ITEMS（导航 / 路由 / 标题同源）
├── components/
│   ├── Dashboard/         # 整页 A~E 五区域入口（历史布局，当前路由未使用）
│   ├── KpiCards/          # KPI 指标卡片（环形进度图 + 细分表）
│   ├── ProjectTable/      # D 区域：项目表格 + 导出
│   ├── CostControl/       # E 区域：成本构成图 / 明细表 / 表格栅格 / 超支详情弹窗
│   ├── UploadArea/        # 文件上传（拖拽/点击）
│   ├── filters/           # DateRangeFilter / ProjectTypeFilter
│   └── common/            # Breadcrumbs / EmptyState / Toast
│                          # ColumnSelector / TableSearchBox / ImageExportModal
│                          # ColumnFilterDropdown（E 区域表头筛选下拉）
├── composables/
│   ├── useProjectData.js  # 筛选状态 + KPI 计算 + 数据过滤
│   ├── useColumnResize.js # D/E 共用：表头拖拽调整列宽
│   ├── useFilterQuerySync.js # 筛选条件 ↔ URL query 双向同步
│   └── useToast.js        # Toast 提示
├── constants/
│   ├── projectStatus.js   # 项目状态/类型常量（中文值）
│   └── costCategory.js    # 成本分类常量 + 超支筛选枚举
├── utils/
│   ├── excelParser.js     # SheetJS 解析（支持 skipRows）
│   ├── dataCleaner.js     # 精确列名映射 + 过滤 + 格式化
│   ├── tableSearch.js     # D/E 共用搜索语义（范围 / 匹配方式 / 取值口径）
│   ├── filterQuery.js     # 筛选条件 ↔ URL query 纯函数（编码 / 解码 / 等价判断）
│   ├── costTableColumns.js# E 区域列模型 + 单元格构造（含默认列宽 + 筛选取值）
│   ├── columnFilters.js   # E 区域表头筛选 / 排序纯逻辑（计数、占比、数值条件）
│   ├── departmentDisplay.js# 业务部所展示口径（全部 / 仅部门）
│   ├── uploadRouting.js   # 批量上传路由与校验（关键词匹配 + 整批拒绝）
│   ├── imageExport.js     # 表格截图导出
│   └── __tests__/         # 单元测试
├── data/
│   ├── projectData.js     # KPI 计算公式 + 模拟数据
│   └── costData.js        # 成本分析（合同匹配 + 超支计算 + 导出）
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

### 批量上传与自动分发

A 区域任意「选择文件」入口都支持一次选择 1-3 个 Excel（`utils/uploadRouting.js`）：

| 文件名含 | 分发到 |
|---------|-------|
| 经营项目台账明细列表 | 经营项目台账 |
| 自筹项目台账列表 | 自筹项目台账 |
| 支出合同事项 | 支出合同事项 |

- 数据入口由**文件名**决定，与点击的是哪个上传卡片无关。
- 校验是整批原子的：出现无法识别的文件、同类型重复（如 2 份自筹台账）或超过 3 个时，**整批拒绝**，不解析任何文件，并提示「上传文件有误：…」。
- 拖拽上传同样支持多文件，任一非 Excel 文件也会整批拒绝。

### 业务部所展示口径

E 区域「业务部所」列支持两种展示方式（`utils/departmentDisplay.js`）：

| 方式 | 说明 | 自筹项目示例 |
|------|------|-------------|
| 全部展示（默认） | 原样输出台账值 | `南方电网数字电网研究院股份有限公司/南方电网传感科技（广东）有限公司/产品研发部` |
| 仅部门 | 按 `/`（兼容全角 `／`）取最后一段 | `产品研发部` |

- 经营项目「业务部所」本身即部门名，两种方式结果一致。
- 搜索取值口径始终使用台账原值，切换展示方式不影响搜索结果。
- Excel 导出的业务部所跟随当前展示方式，保持「所见即所得」。

### 表头筛选与排序（E 区域）

每列表头右侧有漏斗按钮，点开后是与 Excel 一致的下拉：排序（升序 / 降序 / 清除）+ 取值列表（可搜索、全选、反选、清除筛选），每个取值后跟着**数量与占比**。

- 计数与占比的基数是「其他列筛选之后」的数据（排除自身列），勾掉一个取值后还能勾回来。
- 空值单独归入 `(空白)`；同列多选取值是**或**，跨列是**与**。
- 数值列（金额 / 合计）不列举取值，改为条件筛选：等于、不等于、大于、小于、介于；
  介于可只填一端，留空表示该端不限。
- 「筛选」按数据条件生效，与列设置（隐藏列）解耦：隐藏了列，该列筛选依旧生效。
- 重新上传数据会重置表头筛选与排序，避免旧取值把表格筛空。
- 取值口径：分类列用原始值（业务部所切换展示方式不影响筛选），状态列用单元格文案（超支 / 正常）。
- 固定列含「项目类型」，取**台账原始「项目类型」列**（如 工程集成类 / 产品销售类 / 研究咨询类 / 技术研究类），与 D 区域同名列口径一致；列表格展示、下拉筛选计数、关键词搜索、超支详情弹窗与 Excel 导出全部取该值，缺列时显示 `-`。
- 区分：内部 `projectType`（经营项目 / 自筹项目）只用于 B 区域顶部「项目类型」筛选与成本数据过滤，不在 E 区域列、弹窗或导出中出现。
- 实现：`utils/columnFilters.js` 负责统计与匹配，`common/ColumnFilterDropdown.vue` 负责面板，列定义在 `utils/costTableColumns.js` 里声明 `filter` 与 `getFilterValue`。

### 明细表格通铺布局

D/E 两个区域的明细表格都会突破 `.main-container` 的 `max-width: 1400px`，撑满视口宽度并随窗口大小变化，避免列多时被压窄：

```css
/* D 区域 ProjectTable.vue:.table-breakout，E 区域 CostTable.vue 用 Tailwind 等价实现 */
width: 100vw;
margin-left: calc(50% - 50vw);
```

- 工具栏（列设置 / 搜索 / 导出）与分页仍保持 1400px 居中，与 A/B/C 区域左右对齐。
- 该实现依赖祖先元素不裁剪溢出，因此最外层容器为 `overflow: visible`。
- `100vw` 含滚动条宽度，窄窗口下可能出现横向滚动条，为与 D 区域保持一致而保留。

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
