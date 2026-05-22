# Excel 项目台账数据清洗与展示 SPA 应用

## 技术栈
- Vue 3 + Vite + Composition API
- Tailwind CSS v4
- xlsx (SheetJS) - Excel 文件解析

---

## 当前 UI 布局（4 区域）

```
┌─ A 数据导入 ───────────────────────┐
│  UploadArea.vue                    │  上传 Excel 文件
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
| actualInitialDate | 项目实际初验时间 | KPI完成判定+D状态 |
| actualFinalDate | 项目实际终验时间 | KPI完成判定+D状态 |
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

### 测试数据位置
经营项目测试数据位置：
```
/Users/yao/Desktop/项目全景展示/excel upload file /经营项目台账明细列表_20260522150106604.xlsx
```
自筹项目测试数据位置：
```
/Users/yao/Desktop/项目全景展示/excel upload file /自筹项目台账列表_20260518160212361.xlsx
```

### 启动命令
```bash
cd /Users/yao/Desktop/项目全景展示/excel-project-dashboard
npm run dev
# → http://localhost:5173/
```

---

**最后更新**: 2026-05-22
