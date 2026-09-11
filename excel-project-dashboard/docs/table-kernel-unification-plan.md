# 表格内核统一方案（下一阶段）

> 状态：**已完成（2026-09-11）**
> 目标数据量级：数百 ~ 数千行（千行级）
> 原则：行为与数值口径零变化；分阶段可独立回滚

### 执行结果

| 阶段 | 结果 |
|---|---|
| S0 方案文档 | ✅ 本文件 |
| S1 内核基础设施 | ✅ `tableModel` / `excelExport` / `useDataTable` / `DataTable`，28 条单测 |
| S2 E 区域迁移 | ✅ `CostTable` 改用内核，删除 `CostTableGrid.vue`；E 区域测试全绿 |
| S3 D 区域迁移 | ✅ 拆出列/行模型两个纯函数模块；特殊单元格改插槽；`ProjectTable` 只保留适配层与样式 |
| S4 千行级性能 | ✅ 筛选单次遍历求交 + formatter 复用 + 1000 行基线程 |
| S5 验证 | ✅ 275 条测试通过、构建通过、D/E 截图与 DOM 探针核对一致、console error = 0 |
| S6 文档 | ✅ CLAUDE.md 增补「表格内核」章节与改进 #4 |

迁移中由新增单测捕获并修复：金额列漏格式化、日期列取值错误（详见 CLAUDE.md 改进 #4）。

---

## 1. 现状与问题

两处表格各自实现了一套表格能力，同类逻辑存在 2 份实现，口径已经开始漂移：

| 能力 | D 区域 `ProjectTable.vue` | E 区域 `CostTable.vue` |
|---|---|---|
| 体积 | **1037 行**（模板 + 逻辑 + 样式） | 354 行 + `CostTableGrid.vue` 182 行 + `ColumnFilterDropdown.vue` 268 行 |
| 列模型 | 列名字符串数组，从数据键动态提取，固定追加日期列/倒计时列 | `buildCostColumns()` 生成 `{ key, label, align, width, filter }` |
| 单元格渲染 | **内联模板 if/else**（项目名称链接、状态标签、金额格式化、倒计时复合单元格） | `buildCostCell()` 纯函数 → `{ text, type, className }` + Grid 渲染 |
| 筛选 | 项目类型 + Tab + 状态按钮 + 关键词搜索 | 超支筛选 + 关键词搜索 + **表头列筛选 + 排序** |
| 分页 | ✅ 已统一（`useTablePaging`） | ✅ 已统一（`useTablePaging`） |
| 列宽拖拽 | ✅ 已统一（`useColumnResize`） | ✅ 已统一（`useColumnResize`） |
| 列显隐 | ✅ `ColumnSelector` | ✅ `ColumnSelector` |
| 搜索框 | ✅ `TableSearchBox` + `utils/tableSearch` | ✅ 同左 |
| 导出 | 组件内直接 `XLSX.utils.json_to_sheet` + 手写金额格式 | `costData.buildCostExportTable` + `downloadCostAnalysis` |
| 截图 | `ImageExportModal`，但 DOM 用 **`document.querySelector('.table-container')` 全局查询** | `ImageExportModal` + 组件内 `ref` |

**结论**：分页/列宽/列显隐/搜索 已经统一；**渲染层、表头筛选排序、导出、截图 ref 获取** 这四块仍是双份实现，其中 D 区域的单元格渲染完全无法复用，是 1037 行的主因。

---

## 2. 目标架构

```
┌───────────────────────── 区域适配层（薄） ─────────────────────────┐
│  ProjectTable.vue (D)                CostTable.vue (E)            │
│   · 列定义：utils/projectTableColumns.js   · utils/costTableColumns.js │
│   · 行 → 单元格模型                        · buildCostCell          │
│   · 导出映射 / 截图标题 / 工具栏                                        │
└───────────────┬───────────────────────────────┬───────────────────┘
                │                               │
        ┌───────▼───────────────────────────────▼──────┐
        │  useDataTable.js（状态编排内核）                    │
        │  列显隐 · 列宽 · 分页 · 搜索 · 列筛选/排序 · 取值统计缓存 │
        │  → 输出 filteredRows / tableProps / tableEvents     │
        └───────┬───────────────────────────────┬──────┘
                │                               │
        ┌───────▼───────────────────────────────▼──────┐
        │  DataTable.vue（纯渲染内核，无业务语义）              │
        │  列宽拖拽 · 表头筛选漏斗 · 排序标识 · 空态 · 单元格插槽   │
        └──────────────────────────────────────────────┘
                │
        utils/tableModel.js（列/单元格模型规范化）
        utils/excelExport.js（统一导出：表头 + 值 + 金额格式）
```

**内核边界（关键约束）**

- `DataTable.vue` 不认识"项目""成本""超支"等业务概念，只吃**列模型 + 行×单元格模型**，特殊单元格通过**具名插槽**（`cell-status` / `cell-link` / `cell-countdown` / `cell-action`）由区域注入。
- `useDataTable.js` 只做状态编排与派生，不 import 任何区域数据源；列定义、搜索取值口径、行映射由区域传入。
- 业务口径（超支判定、项目类型、验收倒计时）留在 `data/*.js` 纯函数与区域适配层。

---

## 3. 任务清单与验收标准

### S0 方案文档（本文件）
- 验收：文档落盘，任务可逐条勾选。

### S1 内核基础设施
| 产物 | 说明 |
|---|---|
| `utils/tableModel.js` | `normalizeColumns()`、`createCell()`、`resolveAlign()`、`isAmountColumn()`（金额关键词规则收敛到一处） |
| `utils/excelExport.js` | `buildSheet({ headers, rows })`、`applyAmountFormat(ws, columns, rowCount)`、`downloadSheet({ headers, rows, sheetName, fileName, amountColumns })` |
| `composables/useDataTable.js` | 组合：`useTablePaging` + `useColumnResize` + 列显隐 + 搜索 + 列筛选/排序 + 空态派生 |
| `components/common/DataTable.vue` | 由 `CostTableGrid.vue` 泛化：列宽拖拽、筛选漏斗、排序标识、空态、`cell-*` 插槽 |

- 验收：新增单测覆盖 `tableModel`（对齐/金额判定/单元格规范化）、`excelExport`（表头与金额格式）、`useDataTable`（筛选→排序→分页链路、列显隐、清除筛选）。

### S2 E 区域迁移
- `CostTable.vue` 改用 `useDataTable` + `DataTable`；`CostTableGrid.vue` 删除（能力已并入内核）。
- 行为不变项：超支筛选、表头筛选取值口径（其他列筛选之后统计直到底、排除自身列）、排序标识、列宽、导出列与格式、截图、空态文案「当前筛选条件下暂无成本数据」。
- 验收：`costTableHeaderFilter.test.js`、`costTableLayout.test.js`、`costTableColumns.test.js` 全绿 + 截图一致。

### S3 D 区域迁移
- 新增 `utils/projectTableColumns.js`（列定义 + 默认宽度 + 日期列/倒计时列生成）与 `utils/projectTableRow.js`（行 → 单元格模型，含 `type: 'link' | 'status' | 'amount' | 'countdown' | 'text'`）。
- `ProjectTable.vue` 缩为适配层（工具栏 + 列定义 + 导出 + 截图），特殊单元格用插槽渲染。
- 行为不变项：Tab（初验/终验）、状态筛选、搜索语义（`basic`/`global`）、金额格式化、状态标签与红黄绿标签、倒计时两行结构、列宽默认值、导出列（含两个倒计时列）与金额数字格式、`open-detail` 事件。
- 验收：`ProjectTable` 行数 ≤ 450（自 1037 降），截图逐区一致，`open-detail` 与导出行为不变。

### S4 千行级性能
| 优化 | 位置 | 预期 |
|---|---|---|
| 列筛选从「每列一次 filter」改为**单次遍历求交** | `utils/columnFilters.filterRowsByColumnFilters` | O(列数 × 行数) → O(行数 × 生效列数一次扫描)，千行级下筛选耗时下降明显 |
| 下拉取值统计加**缓存**（key = 列 key + 数据版本 + 其他列筛选签名 + 搜索签名） | `useDataTable` | 反复开关下拉不再重复统计全表 |
| 单元格计算复用 | `utils/projectTableRow` | 避免每行多次 `new Date()` / `Intl.NumberFormat` 实例化 |
- 验收：新增 `columnFilters` 性能相关断言（结果不变）+ 1000 行合成数据的计算耗时基线记录在测试备注中；首屏与筛选交互无可感知卡顿。

### S5 验证
- 全量 `npx vitest run` 全绿（基线 226 条 + 新增）；
- `npm run build` 通过；
- playwright 上传 `source/` 三份台账截图，与基线逐区对比；console error = 0。

### S6 文档
- `CLAUDE.md` 增加「表格内核」章节与本次迁移记录，更新「最后更新」。

---

## 4. 风险与回滚

| 风险 | 缓解 |
|---|---|
| D 区域行为回归（它是 1037 行手写实现） | 先迁移 E（结构已接近内核），D 后迁；每步截图对比 + 事件/导出逐项核对 |
| 表头筛选口径被改变 | 现有 `costTableHeaderFilter.test.js`（12 条）先跑通再改结构；取值统计逻辑原样搬进 `useDataTable`，不重写语义 |
| 导出文件格式变化 | 复用既有 `buildCostExportTable`；D 区域导出保持 `#,##0.00` 金额格式 |
| 一次性改动过大 | 分 S1→S4 提交式推进，每阶段独立可回滚（文件粒度） |

**回滚点**：本轮开始前打包 `_backup/excel-project-dashboard_<日期>_pre-table-kernel/`（含 zip 与整页基线截图）；上一轮回滚点 `_backup/excel-project-dashboard_20260911_pre-refactor/` 继续有效。

**不改的东西**：`data/*.js` 计算口径、`stores/dataStore.js`、`constants/sections.js`、区域注册表与容器组件结构、`useTablePaging` 对外接口。
