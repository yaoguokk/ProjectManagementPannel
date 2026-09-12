# Excel 项目台账数据清洗与展示 SPA 应用

## 技术栈
- Vue 3 + Vite + Composition API
- Tailwind CSS v4
- xlsx (SheetJS) - Excel 文件解析

---

## 当前 UI 布局（5 区域）

```
┌─ A 数据导入 ───────────────────────┐
│  UploadArea.vue                    │  经营台账 / 自筹台账 / 支出合同
└────────────────────────────────────┘
┌─ B 数据筛选 ───────────────────────┐
│  DateRangeFilter + ProjectTypeFilter│  时间范围 + 项目类型
└────────────────────────────────────┘
┌─ C KPI 概览 ──────────────────────┐
│  KpiCards.vue                      │  初验完成率 / 终验完成率 / 细分表
└────────────────────────────────────┘
┌─ D 项目明细 ──────────────────────┐
│  ProjectTable.vue                  │  初验Tab / 终验Tab / 状态筛选 / 表格
└────────────────────────────────────┘
┌─ E 成本管控 ──────────────────────┐
│  CostChart + CostTable             │  超支分布图（按项目类型）/ 超支明细表 / 导出
└────────────────────────────────────┘
```

---

## 路由与视图（方案 B：vue-router + hash 模式）

产物是单文件 HTML（`vite-plugin-singlefile`），用户常双击 `file://` 打开，
因此用 **hash 模式**（`#/cost`）——history 模式在 `file://` 下刷新/直达会 404。

| 路由 | 视图 | 组合内容 |
|---|---|---|
| `#/overview`（默认） | `views/OverviewView.vue` | A 数据导入 + B 筛选 + C KPI |
| `#/projects` | `views/ProjectsView.vue` | B 筛选 + D 项目明细表 |
| `#/cost` | `views/CostView.vue` | B 筛选 + E 成本管控（口径条 + 超支分布图 + 明细表） |

- **数据导入不单独占导航项**：A 区域并入概览页（`#/data` 已下线，旧书签经通配路由回到概览）。
- **超支分布图只属于 E 区域**：只在 `#/cost` 出现，概览页不放该图。
- **零侵入复用**：视图只做拼装，直接挂 `components/sections/*` 容器；
  区域徽章 / 标题 / 配色用 `constants/sections.js` 的 `getSection(id)` 取，不复制文案。
- **导航即路由表**：`router/index.js` 的 `NAV_ITEMS` 是唯一来源（顶部导航、路由注册、面包屑标题三者同源），
  新增一个页面只加一条 `NAV_ITEMS`。
- **筛选条件 ↔ URL query**：`composables/useFilterQuerySync.js`（App.vue 调用一次）做双向同步，
  纯函数在 `utils/filterQuery.js`。只写非默认值（默认状态 URL 干净），非法参数回退默认值，
  用 `replace` 写入不污染浏览器历史；可分享、可刷新保持。
- **⚠️ 站内跳转必须带 query**：统一走 `filterQuery.js` 的 `navLocation(target, route.query)`（顶部导航、上传完成后的跳转）。
  筛选以 URL query 为唯一来源，跳转不带 query 就等于把筛选重置成默认值（切页后自定义时间范围丢失，见改进 #9）。
- **面包屑路由驱动**：`common/Breadcrumbs.vue` 末级标题取 `ROUTE_TITLES[route.name]`。
- **上传后跳转**：`sections/UploadSection.vue` 只在**整批**导入成功后（`UploadArea` 的 `batch-done`）才 `router.push({ name: 'overview' })`；
  上传区现在就在概览页内，该跳转是「确保回到概览看结果」的兜底。
  不能在单个文件的 `file-uploaded` 里跳转，否则会卸载承载它的页面、丢掉同批后续文件的事件（见 Bug #6）。
- `Dashboard/Dashboard.vue` 保留为「整页 5 区域」入口，当前路由未使用它。

---

## 架构分层与扩展点（新增功能先看这里）

```
上传（A 区域）
  │  ACCEPT_CONFIG 注册表路由（utils/uploadRouting）
  ▼
dataStore.datasets            ← 唯一写入点（setDataset）
  │  computed 派生（单向）
  ▼
projects / kpiData / costAnalysis
  │  只读消费
  ▼
区域容器组件（components/sections/*）  ← 由 constants/sections.js 注册表驱动渲染
```

**扩展对照表：想做一件事时应该改哪里**

| 需求 | 改动点（其余文件零改动） |
|---|---|
| 新增一类数据源（如「预算表」） | `utils/uploadRouting.js` 的 `ACCEPT_CONFIG` 加一条（keyword / cleaner / feedsProjectList / mergeOrder / countUnit / uploadTitle）+ `utils/dataCleaner.js` 加清洗器 + 单测。上传入口、项目合并、导入提示自动跟进 |
| 新增一个区域（F/G…） | 新建 `components/sections/XxxSection.vue`（内部自行从 store 取数）+ `constants/sections.js` 登记 `{ id, badge, title, tone, order, component }` |
| 新增区域配色 | `constants/sectionTones.js` |
| 新增计算口径 | `data/*.js` 写纯函数，并在 `stores/dataStore.js` 暴露一个 computed |
| 新增表格 | 复用 `composables/useTablePaging`、`common/ColumnFilterDropdown / ColumnSelector / TableSearchBox / ImageExportModal`、`utils/columnFilters | tableSearch` |

**约束（写代码前确认）**

- 组件不得直接改派生数据；写数据只走 `dataStore.setDataset / updateFilters / resetAll`。
- 全局筛选（时间范围、项目类型）放 store；区域局部状态（分页、列显隐、搜索、排序）留在组件内。
- `Dashboard.vue` 只负责区域编排与全局空态，不持有任何业务数据。
- 业务值一律中文（见下方「这是中文数据项目」章节）。

### 表格内核（D / E 区域共用）

```
区域适配层：ProjectTable.vue（D） / CostTable.vue（E）
   · 列定义：utils/projectTableColumns.js、utils/costTableColumns.js
   · 行 → 单元格模型：utils/projectTableRow.js、buildCostCell
        ↓
useDataTable.js：搜索 → 列筛选 → 排序 → 分页 + 列显隐（状态编排）
        ↓
DataTable.vue：列宽拖拽 / 表头筛选漏斗 / 排序标识 / 空态 / `cell-*` 插槽（纯渲染）
        ↓
utils/tableModel.js（列/行/单元格模型）· utils/excelExport.js（统一导出）
```

- 业务单元格通过具名插槽注入：`#cell-link`（D 项目名称）、`#cell-status`（D 红黄绿 + 状态、E 超支/正常）、`#cell-countdown`（D 两行倒计时）、`#cell-action`（E 详情按钮）。
- 列必须显式声明 `filter`（`ColumnFilterKind`）才会出现筛选漏斗；`fixed: true` 的列不参与列设置（D 的日期列与倒计时列）。
- 新增表格时只提供「列模型 + 行映射 + 插槽」，复用内核，不要再自己写分页 / 列宽 / 筛选 / 导出。

---

## 核心业务逻辑 & 数据流

### 步骤 1: A 区域 — Excel 上传与清洗

```
UploadArea.vue (line 159 handleFile)
  │
  ├─ parseExcelFile(file)           → src/utils/excelParser.js:8
  │   使用 SheetJS 读取, sheet_to_json(ws, { defval: '' })
  │   返回 { headers, rows: rawData, rawData }
  │
  ├─ cleanExcelData(rawData, file.name)  → src/utils/dataCleaner.js:14
  │   过滤1: 排除 立项方式 === "基于商机立项"
  │   过滤2: 只保留 项目状态 ∈ [待结算, 已结算, 待终验, 待初验]
  │   判定: 文件名含"经营项目台账明细列表" → projectType='经营项目'
  │         文件名含"自筹项目台账列表"     → projectType='自筹项目'
  │   映射: 77列Excel → 12个程序字段 (精确列名匹配, 非关键词)
  │
  └─ emit('file-uploaded', { data: 45行, fileName })
      ↓
Dashboard.vue (line 128 handleFileUploaded)
  projects.value = fileData.data   → 写入 composable 的 projects ref
```

### 步骤 2: B 区域 — 筛选条件

```
useProjectData.js (src/composables/useProjectData.js)
  filters = ref({
    dateRange:   { start: '', end: '', type: 'month' },
    projectType: '经营项目'   // ProjectType.BUSINESS
  })

DateRangeFilter.vue (src/components/filters/DateRangeFilter.vue)
  默认: dateRangeType='month' → 计算本月起止日期
  支持: 本月 / 自定义 (两个date input)
  v-model:dateRange → 更新 filters.dateRange
  ⚠️ 已添加 onMounted(() => emitDateRange()) 修复初始不emit的问题 (line 87)

ProjectTypeFilter.vue (src/components/filters/ProjectTypeFilter.vue)
  下拉: 经营项目 / 自筹项目 / 全部
```

### 步骤 3: C 区域 — KPI 计算

```
useProjectData.js (line 20)
  kpiData = computed(() => calculateKpiData(projects.value, filters.value))
      ↓
projectData.js (src/data/projectData.js line 73 calculateKpiData)
  返回 { initial: {...}, final: {...} }

  初验计算 (calculatePhaseData, phase='initial'):
    统计范围 = planInitialDate ∈ [dateRange]
    计划金额 = sum(budget)
    完成金额 = sum(budget) where actualInitialDate ≠ 空
    完成率 = 完成金额 / 计划金额 × 100%

  终验计算 (phase='final'):
    同上，但使用 planFinalDate / actualFinalDate

  细分: 按 projectType ('经营项目'/'自筹项目') 分别统计

KpiCards.vue (src/components/KpiCards/KpiCards.vue)
  读取 kpiData.initial.xxx 和 kpiData.final.xxx
  展示环形进度图 + 细分表格
  项目数显示格式: 已验收数/总数 (如 13/20 个)
```

### 步骤 4: D 区域 — 项目明细表格

```
Dashboard.vue (line 101)
  filteredProjects = computed(() => applyFilters())
    applyFilters(): 仅按 projectType 过滤, 不过滤日期
    ↓
  传给 ProjectTable: :projects="filteredProjects" :dateRange="filters.dateRange"

ProjectTable.vue (src/components/ProjectTable/ProjectTable.vue)
  filteredProjects computed (line 213) — 4层过滤叠加:

  第1层 — 项目类型 (line 217-221):
    if (props.projectType !== '全部')
      → filter(projectType === '经营项目' or '自筹项目')

  第2层 — Tab + 时间范围 (line 224-229):  ← 🔴 当前问题所在
    初验Tab: isDateInRange(project.planInitialDate)
    终验Tab: isDateInRange(project.planFinalDate)

  第3层 — 状态筛选 (line 232-244):
    已验收:       actualDate ≠ 空
    待验收/待结算: actualDate = 空

  第4层 — 搜索 (line 248-253)

  isDateInRange 函数 (line 205-211):
    if (!dateStr) return false           // 计划日期为空 → 排除
    if (!hasRange) return false          // dateRange为空 → 排除全部!
    return dateStr ∈ [start, end]
```

### 步骤 5: E 区域 — 成本管控

**目的**：统计各成本成分的实际支出是否超出立项成本。

```
数据源：
  · 台账（经营 + 自筹）— 提供 项目编号 / 立项成本列 / 项目计划终验时间含变更
  · 支出合同事项      — 提供 项目编号 / 支出合同类型 / 事项金额(元)
    ⚠️ 该表首行是标题（非表头），ACCEPT_CONFIG['contract'].skipRows = 1

成本分类配置 (src/constants/costCategory.js):
  COST_CATEGORIES = [
    { key:'subcontract', label:'项目分包费', projectField:'项目分包费(元)',   contractType:'项目分包', active:true  },
    { key:'hardware',    label:'软硬件采购', projectField:'软硬件采购（元）', contractType:'软硬件',   active:true  },
    { key:'laborOutsource',  label:'劳务外包费',  projectField:'劳务外包费(元)',   contractType:null, active:false },
    { key:'laborAllocation', label:'人工分摊费用', projectField:'人工分摊费用(元)', contractType:null, active:false },
  ]
  ⚠️ 后两项是【预留位】：立项成本列已存在，但支出合同暂无对应类型，active=false 不参与计算/展示。
     数据源接入后只需填 contractType + active:true，清洗→聚合→图表→表格→导出全链路自动生效，组件零改动。

计算 (src/data/costData.js，全部纯函数):
  buildContractIndex(contracts)
    → { amountMap, detailMap }，一次遍历同时产出：
      amountMap: Map<项目编号, { [分类key]: 金额 }>
      detailMap: Map<项目编号, { [分类key]: 合同明细数组 }>   ← 支撑详情下钻
    忽略「项目管理」「其他」等未纳入分类的类型
  buildContractCostMap(contracts)
    → buildContractIndex().amountMap，保留原签名以兼容既有调用
  calculateCostAnalysis(projects, contracts, filters)
    过滤: projectType ∈ {经营项目,自筹项目} AND planFinalDate ∈ dateRange（与 B 区终验口径一致）
    每行: categories[{budget, actual, diff, over, contracts}] / budgetTotal / actualTotal / diffTotal
          categoryOver(任一分类超支) / overallOver(合计超支) / hasOverBudget
          contracts = 该科目支出合同明细，按事项金额倒序
    汇总: projectCount / totalBudget / totalActual / overAmount / overProjectCount / overRate
          typeTotals: 按台账原始「项目类型」聚合（空值归 '-'）
            → { label, total, overProjectCount, overAmount, overRate }
            排序: 超支项目数降序 → 超支金额降序 → 类型名 zh-CN 自然序（横轴稳定不抖动）
  filterCostRows(rows, mode)  → 超支筛选 all / over / normal
  downloadCostAnalysis(rows)  → 导出 Excel

展示:
  CostChart.vue — echarts 柱状图（分类维度：立项 vs 实际）+ 单行文字概览（非 KPI 卡片）
  CostTable.vue — 明细表（动态分类列，超支行 bg-red-50 高亮）+ 超支筛选按钮组 + 分页 + 导出 + 📷生成图片 + 行尾「详情」按钮
  CostDetailModal.vue — 超支详情弹窗（项目 → 科目 → 支出合同 三级下钻）
    项目信息条 + 科目卡片切换（超支科目默认选中，取超支金额最大者）
    + 当前科目合同明细表（合同编号/名称/签订时间/事项名称/事项金额/合同总额/乙方/承办人/采购类型/合同状态）
    Esc / 遮罩 / × 关闭，打开时锁定 body 滚动

明细字段 (cleanContractData，src/utils/dataCleaner.js):
  id / projectCode / contractType / amount（成本聚合）
  + contractNo / contractName / signDate / itemName / contractAmount / supplier / handler / purchaseType / contractStatus（详情展示）
```

**匹配原则**：以台账为主、支出合同为辅。支出合同中匹配不上台账的行（空编号、旧格式编号）一律忽略，不新增统计对象。

---

## 🔴 已修复的 Bug 记录

### Bug #1: DateRangeFilter 初始不 emit
- **现象**: D区域无数据
- **根因**: `DateRangeFilter` 初始不emit导致 `filters.dateRange = { start: '', end: '' }`，`isDateInRange` 全部返回 false
- **修复**: 加了 `onMounted(() => emitDateRange())`，初始默认本月日期范围
- **日期**: 2026-05-22 之前

### Bug #2: ProjectTable 项目类型过滤用英文比较 — D区域永远无数据 （2026-05-22 修复）
- **现象**: 上传数据后 D 区域始终空，"全部/经营项目/自筹项目"切换均无数据
- **根因**: [ProjectTable.vue:217-219](src/components/ProjectTable/ProjectTable.vue#L217-L219) 用英文 `'business'` / `'all'` 比较中文常量 `'经营项目'` / `'全部'`，永远匹配不上。`'经营项目' === 'business'` → false → 走了 else 分支按 `'自筹项目'` 过滤 → 所有经营项目被排除
- **修复**: 改为直接用 `props.projectType` 比较（因为值本身就是中文）
  ```js
  // 修复前
  if (props.projectType !== '全部') {
    project.projectType === (props.projectType === 'business' ? '经营项目' : '自筹项目')
  }
  // 修复后
  if (props.projectType !== '全部') {
    project.projectType === props.projectType
  }
  ```

### Bug #3: ProjectTypeFilter emit 英文值导致按钮点击后数据消失 （2026-05-22 修复）
- **现象**: 点击 B 区域任意项目类型按钮后，C/D 区域数据全部消失
- **根因**: [ProjectTypeFilter.vue:5-25](src/components/filters/ProjectTypeFilter.vue#L5-L25) emit `'all'`/`'business'`/`'self'`（英文），但 `useProjectData.applyFilters()` 用中文 `'全部'`/`'经营项目'` 比较，`'business' !== '全部'` → 进入过滤但匹配不上任何数据
- **修复**: emit 值改为 `'全部'`/`'经营项目'`/`'自筹项目'`（中文）

### Bug #4: ProjectStatus 常量值不匹配真实数据 （2026-05-22 修复）
- **现象**: `projectStatus.js` 定义的状态值为 `'已完成'`、`'进行中'`、`'已暂停'` 等，与 Excel 真实数据 (`待初验`/`待终验`/`待结算`/`已结算`) 完全不同
- **修复**: 改为正确的 4 个中文状态值，键名也从英文思维改为语义化命名
  ```js
  // 修复前
  export const ProjectStatus = {
    COMPLETED: '已完成', INCOMPLETE: '未完成', DELAYED: '已延期',
    IN_PROGRESS: '进行中', PAUSED: '已暂停'
  };
  // 修复后
  export const ProjectStatus = {
    PENDING_INITIAL: '待初验', PENDING_FINAL: '待终验',
    PENDING_SETTLEMENT: '待结算', SETTLED: '已结算',
  };
  ```

### 改进 #1: C 区域项目数显示格式优化 （2026-05-22）
- **projectData.js**: `calculatePhaseData` 返回新增 `completedProjectCount`、`businessCompletedProjectCount`、`selfCompletedProjectCount`
- **KpiCards.vue**: 项目数从 `20 个` 改为 `13/20 个`（已验收数/总数）

### Bug #3: ProjectTypeFilter emit 英文值导致按钮点击后数据消失 （2026-05-22 修复）
- **现象**: 点击 B 区域任意项目类型按钮后，C/D 区域数据全部消失
- **根因**: [ProjectTypeFilter.vue:5-25](src/components/filters/ProjectTypeFilter.vue#L5-L25) emit `'all'`/`'business'`/`'self'`（英文），但 `useProjectData.applyFilters()` 用中文 `'全部'`/`'经营项目'` 比较，`'business' !== '全部'` → 进入过滤但匹配不上任何数据
- **修复**: emit 值改为 `'全部'`/`'经营项目'`/`'自筹项目'`（中文）

### Bug #5: E 区域表头筛选下拉的输入框被面板边框裁掉 （2026-09-11 修复）
- **现象**: E 区域数值列（如「立项合计」）表头漏斗展开后，条件下拉与数值输入框右侧被面板边框挡住
- **根因**: 面板挂在 `<th class="whitespace-nowrap">` 内，`white-space: nowrap` 被面板继承，
  数值列的 `select` 与 `input`（行内块元素）因此不换行、并排撑到 553px（内容区仅 290px），
  溢出部分被面板 `overflow-hidden` 裁掉
- **修复**: [ColumnFilterDropdown.vue](src/components/common/ColumnFilterDropdown.vue) 面板根元素加 `whitespace-normal` 重置继承的 nowrap；
  [costTableHeaderFilter.test.js](tests/costTableHeaderFilter.test.js) 增加回归断言

### Bug #6: 一次上传多个台账只导入了第一个，成本管控页一直是空的 （2026-09-11 修复）
- **现象**: 在「数据导入」一次选「经营台账 + 自筹台账 + 支出合同」3 个文件，toast 显示 3 个文件都「解析成功」，
  但 E 区域成本管控始终没有数据（提示「请先上传【支出合同事项】台账」），D 区域也只剩第一个台账的项目
- **根因**: 「导入后跳转到概览」最初做在**每个文件**的 `file-uploaded` 里 —— 第一份台账成功就切走路由，
  `DataView` 随即卸载；而 `UploadArea` 是串行异步解析，后续文件的 `emit('file-uploaded')` 在已卸载实例上
  被 Vue 丢弃（`emit` 在 `isUnmounted` 时直接 return），`setDataset` 从未执行，`store.datasets` 里只有第一个文件
- **修复**: [UploadArea.vue](src/components/UploadArea/UploadArea.vue) 整批处理完后再发 `batch-done`（携带 `total / successCount`，
  `handleFile` 返回是否成功）；[UploadSection.vue](src/components/sections/UploadSection.vue) 改为在 `batch-done` 时跳转
- **回归测试**: [uploadArea.test.js](tests/uploadArea.test.js) 新增「每个文件都发 file-uploaded，整批结束后只发一次 batch-done」
  「单文件同样以 batch-done 收尾」「整批拒绝不发 batch-done」；新增 [uploadSection.test.js](tests/uploadSection.test.js) 3 项
  （逐个 `file-uploaded` 不跳转 / `batch-done` 才跳转 / `successCount = 0` 不跳转）

### Bug #7: 表头筛选「空选」后面板自动退出 （2026-09-11 修复）
- **现象**: E 区域（含项目清单列）表头筛选里把勾选清空（显式空选）后，筛选面板会立刻自动关闭，
  用户想改选别的值必须重新点开漏斗
- **根因**: [ColumnFilterDropdown.vue](src/components/common/ColumnFilterDropdown.vue) 自己监听了
  window 的 `scroll`（capture）/ `resize`，**任何滚动都直接收起面板**（初衷是滚动后 fixed 坐标失效）。
  空选 → 表格行数骤减 → 页面高度塌缩、scrollTop 被浏览器钳制回弹 → 产生 scroll 事件 → 面板被关掉
- **修复**: 「滚动即关闭」改为「**跟随触发按钮重定位**」：
  [DataTable.vue](src/components/common/DataTable.vue) 持有触发按钮元素，滚动 / 缩放时重新取
  `getBoundingClientRect` 更新锚点（面板跟随移动）；只有触发按钮**滚出视口**才收起面板。
  面板自身只保留「点击外部」与「Escape」两种关闭方式
- **回归测试**: [costTableHeaderFilter.test.js](tests/costTableHeaderFilter.test.js) 新增
  「空选后面板不退出：滚动 / 缩放只重定位，触发按钮滚出视口才收起」

---

## ⚠️ 重要：这是中文数据项目！

**所有数据值、常量、比较字符串都是中文，禁止使用英文关键词！**

| 分类 | 正确的值（中文） | ❌ 禁止使用 |
|------|-----------------|------------|
| 项目类型 | `'经营项目'`, `'自筹项目'`, `'全部'` | `'business'`, `'all'`, `'self_financed'` |
| 项目状态 | `'待初验'`, `'待终验'`, `'待结算'`, `'已结算'`, `'已终止'` | `'pending'`, `'completed'` |
| 立项方式 | `'基于商机立项'` | `'business_opportunity'` |
| Excel列名 | `'项目计划初验时间含变更'`, `'立项收入(元)'`, `'业务部所'` 等 | — |

**写任何 `===` 或 `switch` 比较前，先确认用的是中文值。**

### 验收业务规则（核心！）

**验收分为"初验"和"终验"两个阶段：**

| 规则 | 说明 |
|------|------|
| 初验 | 初步验收，**不是所有项目都有**。部分项目跳过初验直接进入终验 |
| 终验 | 最终验收，**所有项目必须有终验** |

**🚫 排除商机项目（不在履约范围内）：**

```
排除条件: 立项方式 === "基于商机立项"
原因: 商机项目尚未拿到中标通知书、未签合同，不在履约范围
```

> 数据清洗阶段（dataCleaner.js）已排除"基于商机立项"的项目，不进入后续KPI计算。

**"计划验收"的含义（本月计划验收 = 初验 + 终验的并集）：**

```
本月计划验收项目 =
  项目计划初验时间含变更 ∈ [本月起止日期]
  OR 项目计划终验时间含变更 ∈ [本月起止日期]
```

**判断某个项目是否已完成验收（含提前完成）：**

```
"已完成初验" → 项目实际初验时间 ≤ 本月底（含本月及之前月份）
"已完成终验" → 项目实际终验时间 ≤ 本月底（含本月及之前月份）
"未完成初验" → 项目实际初验时间为空 OR 实际初验时间 > 本月底
"未完成终验" → 项目实际终验时间为空 OR 实际终验时间 > 本月底
```

⚠️ 一个项目可以实际初验时间为空（没初验），但实际终验时间一定有值。
⚠️ 提前完成也算完成：计划6月验收的项目，如果实际在5月就验收了，仍算完成。

**初验 KPI 计算逻辑：**

```
计划初验（分母）: 所有 planInitialDate ∈ [dateRange] 的项目 → sum(budget)
完成初验（分子）: 范围内项目中 actualInitialDate ≤ 月底的 → sum(budget)
初验完成率 = 完成金额 / 计划金额 × 100%
```

**终验 KPI 计算逻辑：**

```
计划终验（分母）: 所有 planFinalDate ∈ [dateRange] 的项目 → sum(budget)
完成终验（分子）: 范围内项目中 actualFinalDate ≤ 月底的 → sum(budget)
终验完成率 = 完成金额 / 计划金额 × 100%
```

**"本月计划验收金额"（初验+终验合计）：**

```
计划验收金额 = sum(budget) WHERE planInitialDate ∈ [range] OR planFinalDate ∈ [range]
完成验收金额 = sum(budget) WHERE (planInitialDate ∈ [range] AND actualInitialDate ≤ 月底)
                            OR (planFinalDate ∈ [range] AND actualFinalDate ≤ 月底)
```

### Excel 列名映射 (77列 → 12字段)

| 程序字段 | Excel 列名 | 用途 |
|---------|-----------|------|
| projectCode | 项目编号 | 表格展示 |
| projectName | 项目名称 | 表格展示 |
| manager | 项目经理 | 表格展示 |
| department | 业务部所 | 表格展示 |
| projectType | 项目类型(列值) 或 文件名判定 | 表格+KPI分类 |
| budget | 立项收入(元) | KPI金额计算 |
| planInitialDate | 项目计划初验时间含变更 | C+D初验筛选 |
| planFinalDate | 项目计划终验时间含变更 | C+D终验筛选 |
| actualInitialDate | 项目实际初验时间 | KPI完成判定+D状态（可为空） |
| actualFinalDate | 项目实际终验时间 | KPI完成判定+D状态（必有值） |
| startDate | 立项审批完成时间 | 表格展示 |
| status | 项目状态 | 表格展示+清洗过滤 |

### 关键文件速查

| 文件 | 作用 |
|-----|------|
| `src/components/Dashboard/Dashboard.vue` | 区域编排入口（按 `constants/sections.js` 渲染 + 全局空态），不持有业务数据 |
| `src/stores/dataStore.js` | 应用级数据状态：datasets + 派生 projects/kpiData/costAnalysis |
| `src/constants/sections.js` | 区域注册表（新增区域只改这里 + 新建 Section 组件），并提供 `getSection(id)` |
| `src/router/index.js` | 路由表 + `NAV_ITEMS`（导航/路由/标题同源）+ `ROUTE_TITLES` |
| `src/views/*.vue` | 3 个页面视图（Overview / Projects / Cost），只拼装既有区域容器 |
| `src/utils/filterQuery.js` | 公共-筛选条件 ↔ URL query 纯函数（编码/解码/等价判断） |
| `src/composables/useFilterQuerySync.js` | 公共-筛选条件 ↔ URL query 双向同步（App.vue 调用一次） |
| `src/components/sections/*.vue` | 各区域容器组件（A/B/C/D/E，自行从 store 取数） |
| `src/composables/useTablePaging.js` | 公共-表格分页（D/E 共用） |
| `src/utils/projectFilters.js` | 公共-默认筛选条件（年初~本月末 + 全部） |
| `src/constants/sectionTones.js` | 公共-区域徽章配色 |
| `src/components/common/DataTable.vue` | 公共-表格渲染内核（列宽/表头筛选/排序标识/空态/`cell-*` 插槽） |
| `src/composables/useDataTable.js` | 公共-表格状态内核（搜索/列筛选/排序/分页/列显隐） |
| `src/utils/tableModel.js` | 公共-列/行/单元格模型与金额列判定 |
| `src/utils/excelExport.js` | 公共-Excel 导出（表头 + 二维数据 + 金额格式） |
| `src/utils/projectTableColumns.js` | D区域-列模型（Excel 列 + 固定日期/倒计时列） |
| `src/utils/projectTableRow.js` | D区域-行模型（链接/状态/金额/倒计时单元格） |
| `src/components/UploadArea/UploadArea.vue` | A区域-文件上传 |
| `src/components/ProjectTable/ProjectTable.vue` | D区域-表格, isDateInRange问题所在 |
| `src/utils/dataCleaner.js` | 数据清洗, 精确列名映射 |
| `src/utils/excelParser.js` | SheetJS解析 |
| `src/data/projectData.js` | KPI计算公式 |
| `src/composables/useProjectData.js` | dataStore 的组合式函数薄封装（保持旧调用签名） |
| `src/components/filters/DateRangeFilter.vue` | B区域-时间范围选择 |
| `src/components/KpiCards/KpiCards.vue` | C区域-KPI卡片 |
| `src/components/CostControl/CostChart.vue` | E区域-超支分布双轴图（柱=超支项目数/折线=超支金额） |
| `src/utils/costChartOption.js` | E区域-图表配置纯函数（双轴/格式化/tooltip） |
| `src/components/CostControl/CostTable.vue` | E区域-成本明细表+超支筛选+导出+生成图片+详情入口 |
| `src/components/CostControl/CostDetailModal.vue` | E区域-超支详情弹窗（项目→科目→合同下钻） |
| `src/components/common/ImageExportModal.vue` | 公共-表格截图弹窗（D/E 区域共用，props: tableRef/titleText/fileName） |
| `src/utils/imageExport.js` | 公共-DOM 转 PNG（标题/水印叠加，自动适配 D/E 两种容器结构） |
| `src/constants/costCategory.js` | 成本分类配置（含预留位） |
| `src/data/costData.js` | 成本对比计算/超支判定/导出 |

### 测试数据位置
经营项目测试数据位置：
```
/Users/yao/Desktop/项目全景展示/excel upload file /经营项目台账明细列表_20260522150106604.xlsx
```
自筹项目测试数据位置：
```
/Users/yao/Desktop/项目全景展示/excel upload file /自筹项目台账列表_20260518160212361.xlsx
```
支出合同事项测试数据位置：
```
C:/Users/gyfly/Desktop/项目全景面板/source/支出合同事项/_20260910100057413.xlsx
```

### 启动命令
```bash
cd /Users/yao/Desktop/项目全景展示/excel-project-dashboard
npm run dev
# → http://localhost:5173/
```

---

### 改进 #2: E 区域图表改为「按项目类型超支分布」 （2026-09-11）
- **需求**: 不再展示成本对比（立项 vs 实际支出），改为展示超支项目数量与类型的对比
- **横轴**: 台账原始「项目类型」列（`projectTypeLabel`，空值统一归 `-`）
- **主指标（左轴柱）**: 超支项目数，口径 = `row.hasOverBudget`（任一分类超支或整体超支），与明细表「状态」列、超支筛选一致
- **副指标（右轴折线）**: 超支金额，口径 = `Σ max(0, row.diffTotal)`，与概览行 `overAmount` 一致
- **改动**:
  - [costData.js](src/data/costData.js) `summarize` 新增 `typeTotals` 聚合（稳定排序；`categoryTotals` 保留不删，避免连锁改动）
  - [costChartOption.js](src/utils/costChartOption.js) 新增图表配置纯函数 `buildOverBudgetOption`；[CostChart.vue](src/components/CostControl/CostChart.vue) 只保留实例/resize/watch/dispose
  - 测试: [costChartOption.test.js](tests/costChartOption.test.js)（新增 10 条）+ [costData.test.js](tests/costData.test.js)（追加 `typeTotals` 断言）

---

### 改进 #3: 架构加固（为更多数据源与更多区域铺路） （2026-09-11）
- **背景**: 原结构中 Dashboard 既是 5 区域编排器、又是数据容器（`businessProjects/selfFundedProjects/contracts` 三个 ref），
  还通过 `watch(allProjects → projects.value = merged)` 把合并结果写回 composable（双向流动）；新增区域必须改 Dashboard，
  新增数据源要改上传分派 if/else
- **状态层**: 引入 pinia（依赖早已存在）的 [dataStore.js](src/stores/dataStore.js) 作为唯一写入点：
  `datasets` → 派生 `projects / contracts / kpiData / costAnalysis(costRows/costSummary/costRuleStats)`；
  [useProjectData.js](src/composables/useProjectData.js) 退化为薄适配层（旧调用签名不变）；
  `createDefaultFilters` 抽到 [projectFilters.js](src/utils/projectFilters.js) 以避免循环依赖
- **数据集注册表**: [uploadRouting.js](src/utils/uploadRouting.js) 的 `ACCEPT_CONFIG` 增加
  `feedsProjectList / mergeOrder / countUnit / uploadTitle` 元数据，并新增 `datasetOptions()` 与 `buildImportMessage()`；
  上传分派与提示文案完全由注册表驱动
- **区域注册表**: 新增 [sections.js](src/constants/sections.js)（id/badge/title/tone/order/component）+
  [SectionHeader.vue](src/components/common/SectionHeader.vue) + [sectionTones.js](src/constants/sectionTones.js)；
  5 个区域拆为 `components/sections/*` 容器组件，[Dashboard.vue](src/components/Dashboard/Dashboard.vue) 缩为 50 行编排入口
- **公共能力**: 新增 [useTablePaging.js](src/composables/useTablePaging.js)，D 区域 ProjectTable 与 E 区域 CostTable 改为共用
- **测试**: 新增 `dataStore(7) / useTablePaging(6) / sections(3)` 共 16 条，`uploadRouting` 追加 6 条，全量 **226 条通过**；
  构建通过（688 模块 → 单文件 1.79MB）；重构前后截图逐区一致、console error = 0
- **回滚点**: `_backup/excel-project-dashboard_20260911_pre-refactor/`（含 zip 与重构前整页截图）

---

### 改进 #4: 表格内核统一（D/E 共用一套表格能力） （2026-09-11）
- **背景**: D 区域 `ProjectTable.vue` 1037 行把列模型、单元格模板、导出、样式全部内联；E 区域另有一套 `CostTableGrid` + 列模型。
  渲染层、表头筛选排序、导出、截图 ref 四处双份实现
- **内核**: 新增 [tableModel.js](src/utils/tableModel.js)（列/行/单元格模型）、[useDataTable.js](src/composables/useDataTable.js)
  （搜索 → 列筛选 → 排序 → 分页 + 列显隐）、[DataTable.vue](src/components/common/DataTable.vue)（纯渲染内核 + `cell-*` 插槽）、
  [excelExport.js](src/utils/excelExport.js)（统一导出）
- **迁移**:
  - E 区域：[CostTable.vue](src/components/CostControl/CostTable.vue) 改用内核；删除重复的 `CostTableGrid.vue`
  - D 区域：拆出 [projectTableColumns.js](src/utils/projectTableColumns.js) / [projectTableRow.js](src/utils/projectTableRow.js)，
    表格样式经 `:deep()` 穿透内核，视觉与导出结构保持不变
- **迁移中修复**: 金额列漏了格式化（一度直接输出原始值）与日期列取值错误，由新增的 `projectTableRow.test.js` 捕获；
  空金额现展示 `0`，与原实现一致
- **千行级性能**: 列筛选由「逐列 filter」改为单次遍历求交；金额 `Intl.NumberFormat` 改为模块级复用；
  新增 `tableKernelPerformance.test.js`（1000 行合成数据）兜住复杂度退化
- **测试**: 新增 `tableModel(9) / excelExport(6) / useDataTable(13) / projectTableRow(8) / projectTableColumns(8) / tableKernelPerformance(2)`
  + E 区域追加 2 条，全量 **275 条通过**；构建通过（dist 单文件 1.79MB）；D/E 截图与 DOM 探针核对一致，console error = 0
- **方案文档**: [docs/table-kernel-unification-plan.md](docs/table-kernel-unification-plan.md)
- **回滚点**: `_backup/excel-project-dashboard_20260911_pre-table-kernel/`（含 zip）

---

### 改进 #5: 多页面路由（方案 B：vue-router + hash 模式） （2026-09-11）
- **背景**: 单页把 A~E 五个区域纵向堆在一起，页面过长、无法直达某一类信息；需要可分享、可刷新的分页入口
- **路由**: 新增 [router/index.js](src/router/index.js)，hash 模式（单文件产物 `file://` 可用），
  `NAV_ITEMS` 作为「导航 / 路由注册 / 面包屑标题」的唯一来源；`/` 与未匹配路径都重定向到 `/overview`
- **视图**: 新增 [views/OverviewView.vue](src/views/OverviewView.vue)、[ProjectsView.vue](src/views/ProjectsView.vue)、
  [CostView.vue](src/views/CostView.vue)（零侵入复用，只拼装既有 `components/sections/*`，区域元数据走 `getSection(id)`）
- **布局**: [App.vue](src/App.vue) 改为「顶部导航 + Breadcrumbs + RouterView」，并保留原 1400px 居中容器；
  [Breadcrumbs.vue](src/components/common/Breadcrumbs.vue) 末级标题改为跟随路由
- **筛选 ↔ URL**: 新增 [filterQuery.js](src/utils/filterQuery.js)（纯函数）与
  [useFilterQuerySync.js](src/composables/useFilterQuerySync.js)（双向同步，只写非默认值，非法参数回退，replace 不污染历史）
- **上传后跳转**: [UploadSection.vue](src/components/sections/UploadSection.vue) 在整批导入成功后（`batch-done`）跳回概览
- **测试**: 新增 `filterQuery(9) / router(4)`，`sections` 追加 1 条（`getSection`），全量 **289 条通过**；
  构建通过（713 modules，单文件 1,823.35 kB）

---

### 改进 #6: 页面职责归位（数据导入并入概览、超支分布图只留 E 区域） （2026-09-11）
- **需求**: 概览页不该出现「超支项目分布」图（它属于 E 区域成本管控）；顶部导航不再单独占一个「数据导入」项，数据导入并入概览页
- **视图**: [OverviewView.vue](src/views/OverviewView.vue) 改为 A 数据导入 + B 筛选 + C KPI，移除 `CostChart`；
  删除 [views/DataView.vue](src/views/DataView.vue)
- **路由**: [router/index.js](src/router/index.js) 的 `NAV_ITEMS` 收缩为 3 项（概览 / 项目明细 / 成本管控）；
  `#/data` 通过通配路由重定向到概览，旧书签不 404
- **测试**: [router.test.js](tests/router.test.js) 断言改为 3 个页面、并断言 `/data` 不再注册、`/data` 书签回到概览；全量 **295 条通过**
- **真机核对**: 概览页含 A/B/C 三区、无「超支项目分布」；`#/cost` 有该图；导航 3 项；访问 `#/data` 回到 `#/overview`；console error = 0

---

### 改进 #7: E 区域列设置纳入「项目清单」全部列（默认仍为成本列） （2026-09-11）
- **需求**: 参考 D 区域的列设置，E 区域的可选列要包含项目清单（台账）里的其他列，但默认展示保持原来的成本列
- **改动**:
  - [costTableColumns.js](src/utils/costTableColumns.js)：新增 `buildLedgerColumns`（台账其余列，标 `ledger: true` + `ledgerName`）、
    `defaultCostColumnLabels`（默认勾选 = 非台账列）、`COST_ROW_FIELDS`（排除成本行派生字段，避免 `budgetTotal` 之类混进列设置）；
    台账列排在「操作」之前，金额列用 `isAmountColumn` 判定（右对齐 + 数值筛选），单元格用 `getColumnValue` 取台账原值
  - [costData.js](src/data/costData.js)：`buildCostRow` 透传台账原始列（`...project`，派生字段随后覆盖同名值，口径不变）；
    导出链路新增台账列解析（勾选后导出，未勾选不导出；缺省导出仍是默认列）
  - [useDataTable.js](src/composables/useDataTable.js)：`initialSelectedLabels` 支持传函数（按当前列模型延迟求值）
  - [CostTable.vue](src/components/CostControl/CostTable.vue)：首次进入默认勾选成本列，列设置「默认」按钮同样回到成本列
- **测试**: 新增 [costTableColumnSettings.test.js](tests/costTableColumnSettings.test.js)（5 条，走组件交互）；
  `costTableColumns` 追加 6 条、`costData` 追加 3 条、`useDataTable` 追加 1 条，全量 **310 条通过**；构建通过
- **真机核对（真实三份台账）**: 列设置 114 项（18 成本列 + 96 台账列），默认勾选 18；勾「单位」后表头增至 19–20 列且首行显示真实公司名，
  缺该列的行显示 `-`；台账列同样有筛选漏斗；点「默认」回到 18 列；console error = 0

---

### 改进 #8: E 区域全局搜索扩到全部字段 （2026-09-11）
- **需求**: 列设置已能勾到台账列，但全局搜索仍只覆盖原来那组成本业务字段（可见却搜不到），需要扩到全部字段
- **改动**: [CostTable.vue](src/components/CostControl/CostTable.vue) 的 `getGlobalSearchValues` 改为
  `[...pickAllValues(row, ['id', 'categories']), 超支/正常, overCategories, ...成本分类名]`
  - 复用 [tableSearch.js](src/utils/tableSearch.js) 的 `pickAllValues`（与 D 区域同一套语义）
  - 排除 `id`（无意义）与 `categories`（内含合同明细对象，字符串化成噪音）；成本分类名单独以标签纳入
  - 成本口径文案（超支 / 正常、超支成本类型）不是行的原始字段，但用户会照着表格搜，故显式保留
  - 同步更新搜索帮助 tooltip 的 `global-fields-hint`
- **测试**: 新增 [costTableSearch.test.js](tests/costTableSearch.test.js)（5 条：基础搜索不含台账列、全局覆盖台账列、
  保留超支 / 正常与分类名、保留内部口径与合计、或 / 与匹配），全量 **315 条通过**；构建通过
- **真机核对（真实三份台账）**: 用台账专有列「立项提交时间」的首行值搜索——基础搜索 0 行（表格空态）、
  全局搜索 58 行；全局「已结算」79 行、「超支」5 行（与图表概览的「超支项目 5 个」一致）、「项目分包费」206 行；清空后回到 206 行；console error = 0

---

### 改进 #9: 筛选条件跨页保持（站内跳转带 query） （2026-09-11）
- **问题**: 自定义「时间范围」后切换页面，筛选被重置成默认（年初至本月）
- **根因**: 筛选条件以 URL query 为唯一来源（`useFilterQuerySync` 监听 `route.query` 写回 store），
  而顶部导航用 `:to="{ name: item.name }"` 生成跳转目标 → 切页时 query 被清空 → 空 query 解码成默认值写回 store。
  `UploadSection` 的「整批上传后跳转概览」是同一类隐患（会清掉 query）
- **修复**:
  - [filterQuery.js](src/utils/filterQuery.js) 新增 `navLocation(target, query)`，作为站内跳转的统一出口
  - [App.vue](src/App.vue) 导航与 [UploadSection.vue](src/components/sections/UploadSection.vue) 的跳转都改为 `navLocation(..., route.query)`
- **测试**: 新增 [appNavigation.test.js](tests/appNavigation.test.js)（4 条：URL 恢复筛选、切页保留、多次切页保留、默认筛选不进 URL）；
  `filterQuery` 追加 1 条 `navLocation` 用例，全量 **320 条通过**；构建通过
- **真机核对（Chrome）**: 设置自定义 2026-02-01 ~ 2026-05-31 后——切到项目明细 / 成本管控 / 概览 URL 与输入框都保留该区间；
  刷新页面保留；上传三份台账（触发整批跳转）后保留，且 E 区域按该区间过滤为「统计项目 86 个」（默认区间是 206）；console error = 0

---

### 改进 #10: 时间范围「年初至本月 / 自定义」切换不丢自定义日期 （2026-09-11）
- **需求**: 在「年初至本月」和「自定义」两个按钮之间切换时，不要丢掉用户填过的自定义日期
- **问题**: 切到「年初至本月」会把输入框改成年初~本月末，切回「自定义」时输入框沿用被改过的值（用户填的日期被覆盖）
- **修复**: [DateRangeFilter.vue](src/components/filters/DateRangeFilter.vue) 新增 `customRange` 记忆：
  仅在**从自定义切出时**留存当前填写值（避免被「年初至本月」覆盖）；切回自定义时还原，
  从未填过则沿用当前值（不置空）；`syncFromProps` 遇到外部带入的自定义区间时也同步记忆，
  因此切页重建组件后「切走再切回」同样能还原
- **测试**: 新增 [dateRangeFilter.test.js](tests/dateRangeFilter.test.js)（5 条：年初至本月口径不变、首次点自定义不置空、
  切走再切回还原、外部带入区间切走再切回还原、连续点「年初至本月」不覆盖记忆），全量 **325 条通过**；构建通过
- **真机核对（Chrome）**: 填 `2026-02-01 ~ 2026-05-31` → 切「年初至本月」→ 切回「自定义」，输入框还原为原区间；
  切到「成本管控」后重复同样操作同样还原；URL 保持 `?start=2026-02-01&end=2026-05-31&range=custom`；console error = 0

---

**最后更新**: 2026-09-11（时间范围两按钮切换不丢自定义日期）
