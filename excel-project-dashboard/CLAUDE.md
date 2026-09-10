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
│  CostChart + CostTable             │  立项vs实际对比图 / 超支明细表 / 导出
└────────────────────────────────────┘
```

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
| `src/components/Dashboard/Dashboard.vue` | 主界面, 4区域布局, 数据流枢纽 |
| `src/components/UploadArea/UploadArea.vue` | A区域-文件上传 |
| `src/components/ProjectTable/ProjectTable.vue` | D区域-表格, isDateInRange问题所在 |
| `src/utils/dataCleaner.js` | 数据清洗, 精确列名映射 |
| `src/utils/excelParser.js` | SheetJS解析 |
| `src/data/projectData.js` | KPI计算公式 |
| `src/composables/useProjectData.js` | filters状态, applyFilters, kpiData |
| `src/components/filters/DateRangeFilter.vue` | B区域-时间范围选择 |
| `src/components/KpiCards/KpiCards.vue` | C区域-KPI卡片 |
| `src/components/CostControl/CostChart.vue` | E区域-成本对比柱状图 |
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

**最后更新**: 2026-09-10（新增 E 区域-成本管控模块）
