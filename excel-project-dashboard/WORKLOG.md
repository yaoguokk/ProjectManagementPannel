# WORKLOG — 唯一任务账本

---

## [2026-09-10] 修正 E 区域「项目类型」取值口径：改取台账原值

**总目标**：E 区域成本明细表与超支详情弹窗的「项目类型」不再显示内部类别（经营项目 / 自筹项目），改取台账原始「项目类型」列（工程集成类 / 产品销售类 / 研究咨询类 / 技术研究类 等），与 D 区域同名列口径一致；经营 / 自筹只保留在 B 区域顶部筛选。

**状态**：✅ 完成

**干到哪了**：
- [x] `data/costData.js`：`buildCostRow` 新增透传字段 `projectTypeLabel: project['项目类型'] || ''`（台账原值口径），保留内部 `projectType` 供 B 区域筛选与 `calculateCostAnalysis` 过滤；`FIXED_EXPORT_COLUMNS['项目类型']` 改取 `projectTypeLabel || '-'`。
- [x] `utils/costTableColumns.js`：「项目类型」列 `getFilterValue` 与 `buildCostCell` 同步改取 `projectTypeLabel`（空值 `-`），列宽 100 / 列序 / `filter: VALUE` 均未动。
- [x] `components/CostControl/CostDetailModal.vue`：项目信息条「项目类型」改为 `row.projectTypeLabel || '-'`。
- [x] `components/CostControl/CostTable.vue`：全局搜索取值追加 `row.projectTypeLabel`（保留 `row.projectType`，输入「经营 / 自筹」仍可命中）。
- [x] 测试：`tests/costTableColumns.test.js` 夹具补 `projectTypeLabel`、新增「表头筛选取值与单元格同源」断言；`tests/costTableHeaderFilter.test.js` 项目类型下拉用例改为按台账原值计数（研究咨询类 2 / 信息系统开发类 1 / 产品销售类 1）并断言面板**不出现**经营 / 自筹；`tests/costData.test.js` 夹具补中文「项目类型」键、导出断言由 `经营项目` 改为 `研究咨询类`，新增「透传字段与内部口径并存」「缺列回退空串」两条防回归用例。
- [x] `README.md`「表头筛选与排序（E 区域）」补两条口径说明（展示/筛选/搜索/导出统一取台账原值；内部口径只用于 B 区域筛选）。

**验证证据**：
- `npm run test:run`：166/166 通过（13 个测试文件，较上一轮 163 项新增 3 项）。
- `npm run build`：构建通过（663 modules，产物 `dist/index.html` 1,772.65 kB）；已按惯例覆盖导出文件 `项目全景面板_20260910.html`（1,785,363 字节，23:05 写入，与 dist 产物哈希一致）。
- 真机核对（dev server + 上传 3 个真实源文件，206 行）：E 区域「项目类型」列显示台账原值，下拉计数 `产品销售类（190）92.2%`、`工程集成类（9）4.4%`、`研究咨询类（3）1.5%`、`共享资源设施购置类 / 技术创新平台类 / 技术研究类-应用研究 / 其他技改 各（1）0.5%`，`全选（206）`，面板内无「经营项目 / 自筹项目」。
- 同口径核对：首行「科创湾6号楼3F联合产线装修建设项目」单元格为 `其他技改`，打开超支详情弹窗显示 `项目类型 其他技改`。
- B 区域回归：点「自筹项目」+ 查询后，E 区域只剩 `其他技改 / 技术创新平台类 / 技术研究类-应用研究 / 共享资源设施购置类`，无经营台账的 `工程集成类 / 产品销售类`，证明内部口径过滤未被破坏。
- 本次改动文件 `read_lints` 0 报错；核对用临时脚本与截图已删除。

**边界**：
- 只切换展示口径，不改变数据清洗、上传分发、D 区域列取值、KPI 统计与 B 区域筛选。
- 新增字段名固定为 `projectTypeLabel`，避免与内部 `projectType` 混淆；两处代码注释已标明用途。
- 台账缺「项目类型」列时透传为空串，展示/导出回退 `-`，不回退成经营 / 自筹字样。
- 本轮改动已与 E 区域表头筛选一并提交为 `07b14cd`，并推送 `origin/main`。

---

## [2026-09-10] E 区域明细表新增「项目类型」列

**总目标**：E 区域成本明细表展示「项目类型」（经营 / 自筹），可被列设置开关、可被表头筛选，并随 Excel 导出。

**状态**：✅ 完成

**干到哪了**：
- [x] `utils/costTableColumns.js`：`HEAD_COLUMNS` 在「业务部所」之后插入 `projectType` 列（宽 100px，取 D 区域同名列宽），`filter: VALUE`、`getFilterValue: (row) => row.projectType`；`buildCostCell` 增加 `projectType` 分支（空值显示 `-`）。
- [x] `data/costData.js`：`FIXED_EXPORT_COLUMNS` 补 `项目类型`，该列重新参与导出（此前因表格无此列而默认不导出）。
- [x] 列序变为「项目编号 → 项目名称 → 项目经理 → 业务部所 → 项目类型 → 计划终验时间」，与 D 区域一致；列设置默认全选，所以新列默认展示。
- [x] 测试：`tests/costTableColumns.test.js` 固定列 11→12、首 6 列断言、新增「项目类型展示与占位符」；`tests/costTableHeaderFilter.test.js` 表头 17→18、夹具补 `projectType`、新增「按经营 / 自筹筛选」（经营 3 / 自筹 1，取消经营后只剩 1 行）；`tests/costData.test.js` 缺省导出表头补 `项目类型` 并断言取值。
- [x] README「表头筛选与排序（E 区域）」补充项目类型列说明。

**验证证据**：
- `npm run test:run`：163/163 通过（13 个测试文件，较上一轮 161 项新增 2 项）。
- `npm run build`：构建通过（663 modules，产物 `dist/index.html` 1,772.57 kB）。
- 已用新构建覆盖导出文件 `项目全景面板_20260910.html`（1,785,283 字节，22:50 写入）。
- 本地 dev server（http://127.0.0.1:5173/）返回 200；本次改动的 5 个文件 `read_lints` 0 报错。

**边界**：
- 单元格用台账原值，空值显示 `-`；表头筛选取原值，空值归入 `(空白)`（与「计划终验时间」同口径）。
- 只增加展示与筛选，不改变 `calculateCostAnalysis` 的项目类型过滤（B 区域筛选仍由上层 filters 控制）。
- 展示 / 隐藏仍跟随列设置，刷新回到默认全部列（未做持久化）。
- 本条的「经营 / 自筹」展示口径随后被上一条「修正取值口径」取代（改取台账原值）；两批改动最终一并提交为 `07b14cd`。

---

## [2026-09-10] E 区域表头筛选（Excel 风格）

**总目标**：E 区域明细表每列表头可像 Excel 一样筛选，下拉里列出该列取值并显示**数量与占比**。

**状态**：✅ 完成

**干到哪了**：
- [x] 新增 `src/utils/columnFilters.js`：筛选取值、计数/占比、同列 OR + 跨列 AND、数值条件、排序（纯函数）。
- [x] 新增 `src/components/common/ColumnFilterDropdown.vue`：排序 + 搜索 + 全选/反选/清除 + 计数占比列表 + 数值条件。
- [x] `utils/costTableColumns.js`：每列声明 `filter` 类型与 `getFilterValue`，筛选与排序复用单元格口径。
- [x] `CostTableGrid.vue`：表头加漏斗入口与排序箭头；下拉用 fixed 定位，避开表格容器 overflow 裁切。
- [x] `CostTable.vue`：筛选链「超支筛选 → 搜索 → 表头筛选 → 排序」，工具栏加「清除表头筛选（n）」，换数据自动重置。
- [x] 新增单测 `tests/columnFilters.test.js`（20 项）与组件测试 `tests/costTableHeaderFilter.test.js`（10 项）。
- [x] README（`excel-project-dashboard/README.md`）新增「表头筛选与排序（E 区域）」章节，并在项目结构树中登记 `columnFilters.js` 与 `common/ColumnFilterDropdown.vue`。

**验证证据**：
- `npm run test:run`：161/161 通过（13 个测试文件，较上一轮 131 项新增 30 项）。
- `npm run build`：构建通过；产物中已含 `column-filter-panel` / `filter-trigger` / 「清除表头筛选」「搜索取值，空格分隔多个关键字」「(空白)」等新文案与类名。
- 真机核对（Edge + 真实台账与合同）：上传 3 个源文件后 E 区域 206 行；「超支成本类型」下拉显示 `(空白)（201）97.6%`、`项目分包费（3）1.5%`、`软硬件采购（2）1.0%`，`全选（206）`；「差额合计」下拉为数值条件（等于/介于）。截图核对时用临时脚本，核对后已删除。
- 已用新构建覆盖导出文件 `项目全景面板_20260910.html`，本地 dev server 返回 200。
- 收尾复跑（同一份工作区状态）：`npm run test:run` 161/161、`npm run build` 通过并再次覆盖 `项目全景面板_20260910.html`（1,785,040 字节）；本次改动的 5 个源文件 `read_lints` 0 报错。

**边界**：
- 只做 E 区域成本管控明细表；D 区域与 A/B/C 未动，`columnFilters.js` 与 `ColumnFilterDropdown.vue` 已按通用能力抽出，D 区域接入只需在列模型声明 `filter` / `getFilterValue`。
- 表头筛选与「超支筛选」「关键词搜索」叠加（AND），导出与图片导出跟随当前结果。
- 隐藏列（列设置）上的筛选依然生效，只有「清除表头筛选（n）」的计数会提示有隐性条件。
- 项目编号 / 项目名称是唯一值列，下拉会有很多"计数 1"的项，用搜索框缩小即可；这是 Excel 的既有行为，未做特殊裁剪。
- 本轮改动已提交为 `07b14cd`（含新增的 `columnFilters.js` / `ColumnFilterDropdown.vue` 与两个测试文件，13 files changed）；推送 `origin/main` 后 `main` 与 `origin/main` 同步。
- `excel-project-dashboard/dev.log` 是 dev server 日志，已被根 `.gitignore` 的 `*.log` 忽略，不进版本库。

---

## [2026-09-10] A 区域批量上传：任一入口一次选 1-3 个文件，按文件名自动分发

**总目标**：点任意一个「选择文件」按钮都能一次选择 1-3 个 Excel，系统按文件名关键词自动分发到经营 / 自筹 / 支出合同三个数据入口；出现 2 份同类型台账或无关文件时，提示「上传文件有误」并整批拒绝。

**状态**：✅ 完成

**干到哪了**：
- [x] 新增 `src/utils/uploadRouting.js`：三类台账的识别关键词与解析配置（`ACCEPT_CONFIG`，从 UploadArea 迁出）+ 纯函数 `matchAcceptType` / `routeUploadFiles` / `KEYWORD_HINT_TEXT` / `MAX_UPLOAD_FILES`。
- [x] `routeUploadFiles` 校验规则：每个文件必须命中恰好一个关键词；同类型最多 1 份；一次最多 3 个；错误原因逐条返回。
- [x] `UploadArea.vue`：文件输入加 `multiple`，点击选择与拖拽都改走批量入口 `handleFiles`——先整批校验（任一文件有问题则整批拒绝，不解析任何文件），通过后按选择顺序串行解析；`file-uploaded` 事件携带**文件自身路由出的类型**，父组件无需感知文件来自哪个卡片。
- [x] 「上传文件有误：…」前缀写进 `file-error` 的 error 消息本身——该事件冒泡到 Dashboard 后还会再弹一次 toast 并覆盖前一条，只有消息自带前缀才能保证用户看到的最终提示正确。
- [x] 文件 id 改为 `Date.now()+序号`：同一次批量选择在同一毫秒内处理，旧的纯时间戳 id 会撞车导致状态更新错位。
- [x] 删除旧的 `validateFileName`（"文件请上传到 XX 区域"的引导已不适用，入口不再限制类型）；三个上传卡片的 description 统一为「任一入口均可一次选择 1-3 个文件，按文件名自动分发」。
- [x] 新增常驻单测 `tests/uploadRouting.test.js`（12 项：识别/路由/重复拒绝/无关文件/超限/空选择）与 `tests/uploadArea.test.js`（4 项组件测试：multiple 属性、三类文件按真实类型分发、两份自筹整批拒绝且不解析、混入无关文件整批拒绝）。
- [x] README 补充「批量上传与自动分发」说明。

**验证证据**：
- `npm run test:run`：131/131 通过（11 个测试文件，较上一轮 115 项新增 16 项）。
- `npm run build`：构建通过。
- 产物校验：交付 HTML 中 `multiple` 属性已编译进 input（`multiple:""`），「上传文件有误」「一次最多选择」「无法识别文件」等消息文案均在。
- 已用新构建覆盖导出文件 `项目全景面板_20260910.html`；本地 dev server 返回 200。
- 已提交并推送：`61fc3d1`（`cc0defb..61fc3d1  main -> main`，远端 https://github.com/yaoguokk/ProjectManagementPannel.git）；推送后 `git status -sb` 为 `## main...origin/main`，`git ls-remote origin refs/heads/main` 指向 `61fc3d1ed246748d0ccde58a58aaea081c9f7e8c`。
- 环境备注：本机原先未安装 git，本轮用 winget 安装 Git 2.55.0.3（`C:\Program Files\Git\cmd\git.exe`，已打开的终端 PATH 未刷新，需用完整路径）；直连 github.com:443 超时（curl 28），推送须按次传参 `-c http.proxy=http://127.0.0.1:7890`——未写入任何 git config，提交身份也是按次 `-c user.name/-c user.email`（取自历史作者 `yaoguokk`）。

**边界**：
- 批量校验是原子的：合法文件与问题文件混选时，合法文件也不会被处理，需要去掉问题文件后重新选择（刻意为之，避免"半成功"状态）。
- 同类型重复目前是"整批拒绝"而不是"后传覆盖前传"；如需"同名类型自动覆盖旧数据"，可在此基础上放开。
- 文件状态列表显示在发起选择的卡片下（含被分发到其他入口的文件），跨卡片不重复展示。

---

## [2026-09-10] E 区域表格区通铺视口宽度（对齐 D 区域）

**总目标**：D 区域明细表格会突破 1400px 内容宽度、随窗口宽度变化；让 E 区域成本明细表采用同一套布局，不再被压在窄卡片里。

**状态**：✅ 完成

**干到哪了**：
- [x] `CostTable.vue` 由「一个大卡片」拆成三段：工具栏、表格区、分页。
- [x] 工具栏与分页各自 `mx-auto max-w-[1400px] rounded-lg bg-white shadow-sm`，保持与 A/B/C 区域左右对齐。
- [x] 表格区外层用 `ml-[calc(50%_-_50vw)] w-screen border-y border-gray-200 bg-white` 突破 `main-container` 的 `max-width: 1400px`，与 D 区域 `.table-breakout` 是同一实现；内层 `p-6` 对应 D 区域 `.table-section` 的 `padding: 1.5rem`。
- [x] 最外层容器改为 `overflow-visible`，避免负边距被裁切。
- [x] 列宽拖拽、业务部所切换、导出、下钻等逻辑均未改动，`tableContainerRef` 仍指向表格横向滚动容器。
- [x] 新增常驻单测 `tests/costTableLayout.test.js`（4 项）：锁住「表格必须位于 1400px 约束容器之外」这一结构不变量、工具栏 → 表格 → 分页的文档顺序、以及通铺后每列表头仍带拖拽手柄。
- [x] README（`excel-project-dashboard/README.md`）补充表格通铺布局说明。

**验证证据**：
- `npm run test:run`：115/115 通过（9 个测试文件，较上一轮 111 项新增 4 项）。
- `npm run build`：构建通过。
- 产物校验：`dist/index.html` 中 `calc(50% - 50vw)` 出现 2 次、`100vw` 出现 2 次（D/E 各一），确认 Tailwind 任意值 `ml-[calc(50%_-_50vw)]` / `w-screen` 已正确编译。
- 已用新构建覆盖导出文件 `项目全景面板_20260910.html`；本地 dev server（http://127.0.0.1:5173/）返回 200。

**边界**：
- `100vw` 包含滚动条宽度，窄窗口下页面可能出现约 15px 的横向滚动条；D 区域原本就是这个行为，本次刻意保持一致，未单独修正。
- 只改 E 区域布局，D 区域代码未动，避免回归风险。
- 本机没有浏览器二进制，未做截图比对；表格实际视觉宽度需人工在不同窗口宽度下确认。
- `CostTable.vue` 现 301 行（规范 ≤200）；已确认本次不再拆分工具栏/分页，留待后续按需处理。

---

## [2026-09-10] D/E 区域表格列宽可调 + E 区域业务部所展示方式切换

**总目标**：参考 D 区域，让 E 区域成本明细表也能拖动调整列宽；并新增「业务部所」展示口径切换，让自筹项目的 `公司/公司/部门` 可只显示部门名。

**状态**：✅ 完成

**干到哪了**：
- [x] 新增 `src/composables/useColumnResize.js`：把 D 区域原有的列宽拖拽逻辑（mousedown 记起点 → document 上 mousemove 改宽 → mouseup 收尾、最小宽度 60px、新列自动补默认宽度、卸载时移除监听）抽为组合式函数，默认宽度由调用方通过 `resolveDefaultWidth` 提供。
- [x] D 区域（`ProjectTable.vue`）改用 `useColumnResize`，删除内部约 50 行重复实现，行为保持不变。
- [x] 新增 `src/components/CostControl/CostTableGrid.vue`：E 区域的表头/表体渲染与列宽拖拽独立成组件，`table-fixed` + `colgroup` 让列宽严格生效，单元格统一 `truncate` + `title` 截断可悬浮查看。
- [x] `CostTable.vue` 瘦身：表格渲染移交 `CostTableGrid`，只保留数据、筛选、导出等状态。
- [x] `costTableColumns.js` 列定义自带 `width`（固定列按内容长度、动态分类列统一 110px），并导出 `FALLBACK_COLUMN_WIDTH`。
- [x] 新增 `src/utils/departmentDisplay.js`：`DepartmentDisplay` / `DEPARTMENT_DISPLAY_OPTIONS` / `formatDepartment`，「仅部门」按 `/`（兼容全角 `／`）取最后一段，无分隔符或空值原样返回。
- [x] E 区域搜索框旁新增「业务部所」下拉（全部展示 / 仅部门），默认全部展示即原有行为。
- [x] `buildCostCell(row, col, options)` 支持 `departmentMode`；搜索取值口径保持台账原值不变。
- [x] Excel 导出跟随展示方式：`buildCostExportTable(rows, columnLabels, options)` 把 options 透传给取值函数，「业务部所」按 `departmentMode` 输出。
- [x] 新增常驻单测 `tests/departmentDisplay.test.js`（9 项）与 `tests/useColumnResize.test.js`（6 项）；`costTableColumns.test.js` 补 3 项、`costData.test.js` 补 1 项。
- [x] README 补充列宽能力、业务部所展示口径与新增文件说明。

**验证证据**：
- `npm run test:run`：111/111 通过（8 个测试文件，较上一轮 92 项新增 19 项）。
- `npm run build`：构建通过，产物 `dist/index.html` 生成成功。
- 临时组件冒烟测试（`@vue/test-utils` + jsdom，验证后已删除）4/4 通过：
  - E 区域：表头与每行单元格数量一致；拖动第 4 列手柄后 `colgroup` 宽度由 220px 变为 300px；切换「仅部门」后单元格文本由 `A公司/B公司/产品研发部` 变为 `产品研发部`。
  - D 区域：拖动第 1 列手柄后 `colgroup` 宽度由 160px 变为 260px（列宽重构回归）。
- 已用新构建覆盖导出文件 `项目全景面板_20260910.html`。
- 本地 dev server（http://127.0.0.1:5173/）返回 200，应用正常加载。

**边界**：
- 列宽与「业务部所」展示方式仅存于组件内存，刷新页面回到默认（与列设置一致，未做持久化）。
- 「业务部所」展示切换只做在 E 区域；D 区域自筹项目仍显示公司全称，需要时可直接复用 `departmentDisplay.js`。
- 搜索始终匹配台账原值，因此切到「仅部门」后仍可用公司名搜到该项目（避免漏检）。
- `CostTable.vue` 抽走表格栅格后仍有 289 行（规范 ≤200）；经确认本次不再拆分工具栏/分页，留待后续按需处理。
- Playwright e2e 未执行：本机缺少浏览器二进制（未运行 `npx playwright install`），与本次改动无关。

---

## [2026-09-10] E 区域（成本管控）接入列设置与搜索，搜索能力抽为公共模块

**总目标**：参考 D 区域，让 E 区域成本明细表也能配置展示列、也能按关键词搜索；把两处重复的搜索逻辑收敛为一份公共实现。

**状态**：✅ 完成

**干到哪了**：
- [x] 新增 `src/utils/tableSearch.js`：抽出搜索语义（基础/全局范围、任意/全部匹配、多关键词分隔符、取值口径），导出 `SearchMode` / `SearchMatchMode` / `matchesSearchQuery` / `filterBySearchQuery` / `pickAllValues`。
- [x] 新增 `src/components/common/TableSearchBox.vue`：搜索框 UI（范围下拉、匹配方式下拉、帮助 tooltip）连同原 `.search-box` 系列样式一起迁移，D/E 共用。
- [x] `ColumnSelector.vue` 从 `components/ProjectTable/` 移到 `components/common/`，成为公共组件。
- [x] D 区域（`ProjectTable.vue`）改用公共实现：删除内部 `normalizeSearchText` / `parseSearchTerms` 与内联搜索框模板及样式，行为保持不变。
- [x] E 区域（`CostTable.vue`）工具栏新增列设置与搜索框；列改为数据驱动 + `selectedColumnLabels` 控制可见列，新增/隐藏分类列自动跟随。
- [x] E 区域渲染改为 `displayRows`（行 × 可见列的单元格模型），表格结构与可见列解耦，避免取消再勾选后列序错乱。
- [x] E 区域搜索取值口径：基础搜索=项目编号/名称/经理/部所；全局搜索=成本业务字段（含分类名、超支状态、超支类型）。
- [x] 新增 `src/utils/costTableColumns.js`：把列模型（固定列 + 动态分类列）与单元格内容/样式构造从组件抽出，`CostTable.vue` 因此瘦身约 90 行，符合「逻辑与视图分离」规范。
- [x] E 区域 Excel 导出跟随当前可见列（与 D 区域同语义）：`buildCostExportTable(rows, columnLabels)` 按列名映射表头与取值函数，缺省导出全部列；「操作」等非数据列不参与导出，金额列仍导出为数值。
- [x] 新增常驻单测 `tests/tableSearch.test.js`（11 项）与 `tests/costTableColumns.test.js`（10 项）；同步调整 `tests/costData.test.js` 中导出用例（新增「按可见列导出」「非数据列不导出」）。
- [x] README 补充 E 区域布局、公共组件与 `tableSearch.js` / `costTableColumns.js` 说明。

**验证证据**：
- `npm run test:run`：92/92 通过（6 个测试文件，含新增的 23 项）。
- `npm run build`：构建通过，产物 `dist/index.html` 生成成功。
- 临时组件冒烟测试（`@vue/test-utils` + jsdom，验证后已删除）：
  - CostTable 4/4 通过——默认展示全部列且每行单元格数与表头一致；列设置取消「项目分包费-立项」后表头与单元格同步减少；基础搜索按项目名称命中；全局搜索命中「超支成本类型」。列模型抽出后复跑仍 4/4 通过。
  - ProjectTable 2/2 通过——公共搜索框渲染且基础搜索可过滤；全局搜索 +「全部关键词（与）」需同时命中。
- 已用新构建覆盖导出文件 `项目全景面板_20260910.html`。

**边界**：
- 列设置状态仅存于组件内存，刷新页面回到「全部列」，未做本地持久化。
- E 区域列设置复用 D 区域的 `ColumnSelector`，二者状态互相独立，不联动。
- 搜索匹配方式下拉沿用 D 区域原行为：仅在「全局搜索」下显示。
- E 区域导出改为「所见即所得」后，`项目类型`、`实际终验时间` 这两列因不在表格中展示，默认不再导出；如需保留需先在表格中提供对应列。

---

## [2026-07-30] 搜索功能增强：全局搜索 + 关键词匹配 + 搜索帮助

**总目标**：在 ProjectTable 中增加全局搜索模式切换（基础/全局）、关键词匹配方式（任意/全部）、搜索使用说明提示，并补充 e2e 测试。

**状态**：✅ 完成

**干到哪了**：
- [x] ProjectTable.vue 增加 searchMode、searchMatchMode 状态与对应 UI —— 证据：`git diff` 确认新增全局搜索下拉框、匹配方式选择、帮助 tooltip
- [x] 响应式适配（1300px 断点） —— 证据：`@media (max-width: 1300px)` 新增样式块
- [x] e2e 测试覆盖搜索模式切换 —— 证据：`tests/e2e/app.spec.js` 新增 `should switch between basic and global search modes` 用例
- [x] 提交并推送 —— 证据：`git push origin main` 成功，`6fb762b..cc0defb`
- [x] Firebase 部署 —— 证据：`firebase deploy --only hosting` 成功，Deploy complete

**边界**：不改动搜索核心逻辑以外的功能；不重构表格渲染。

**关联**：commit `cc0defb`

<!--
使用规则：
1. 动代码必记，不动代码不记
2. 新条目追加在最上方（最新的永远最先被读到）
3. 每条必须有「验证证据」——没有证据的「已完成」不算完成
4. 禁止建第二份进度文档
合格标准：一个零上下文的 agent 只凭最新条目就能接着干活
-->

---

## [2026-07-30] 区域D搜索说明问号提示

**总目标**：缩短区域D搜索框，在输入框右侧增加问号图标，悬停或键盘聚焦时展示详细搜索说明。

**状态**：✅ 完成

**干到哪了**：
- [x] 将基础/全局搜索占位文字缩短为“输入关键词...”和“输入全字段关键词...”。
- [x] 在搜索输入框右侧增加“搜索使用说明”问号按钮及详细 tooltip。
- [x] tooltip 说明基础搜索、全局搜索、关键词分隔符及“与/或”匹配规则。
- [x] 增加键盘聚焦显示支持，并保持窄桌面布局不遮挡其他按钮。
- [x] 完成构建、单元测试和浏览器交互验证，并将状态更新为完成。

**验证证据**：
- `npm run test:run`：38/38 通过。
- `npm run build`：构建通过。
- `npm run test:e2e -- --project=chromium --workers=1`：8/8 通过；测试先聚焦“搜索使用说明”按钮，再校验 tooltip 内容。
- 本地浏览器 `http://127.0.0.1:5173/`：确认按钮唯一存在；点击聚焦后 tooltip 可见，显示基础/全局搜索字段、分隔符及“任意关键词（或）/全部关键词（与）”说明。
- 浏览器控制台 error/warn：无记录。

**边界**：只调整区域D搜索控件的说明和布局，不改变已有搜索数据逻辑。

---

## [2026-07-30] 区域D多关键词与/或搜索

**总目标**：在区域D保留原有关键词搜索的同时，支持全局搜索的“任意关键词（或）”和“全部关键词（与）”匹配方式。

**状态**：✅ 完成

**干到哪了**：
- [x] 在 `src/components/ProjectTable/ProjectTable.vue` 增加关键词匹配方式下拉框，仅在全局搜索模式显示。
- [x] 保留默认“任意关键词（或）”行为；切换为“全部关键词（与）”后，项目必须同时命中所有关键词。
- [x] 多关键词继续支持英文逗号、中文逗号、顿号、分号和换行分隔，并自动清理空关键词。
- [x] 在 `tests/e2e/app.spec.js` 增加匹配方式切换回归用例。
- [x] 增加 1300px 以下工具栏换行规则，避免全局搜索控件挤压导出按钮。
- [x] 按本记录规则写入本条目，未创建第二份工作记录文件。

**验证证据**：
- `npm run test:run`：38/38 通过。
- `npm run build`：构建成功，产物 `dist/index.html` 生成成功。
- Chromium E2E：8/8 通过；覆盖搜索范围切换和“或/与”匹配方式切换。
- 本地浏览器 `http://127.0.0.1:5173/`：确认全局搜索显示匹配方式控件，默认“任意关键词（或）”，可切换为“全部关键词（与）”；控制台无错误/警告。
- 本地浏览器约 1250px 视口：工具栏自动换行，列设置、搜索、导出和生成图片按钮均保持可见。

**边界**：
- 当前“与”关系要求所有关键词出现在同一个项目对象的字段集合中，但不强制某个关键词必须对应指定字段。
- 尚未使用真实 Excel 上传数据验证具体项目结果；需要上传包含“产品部”和“张三”的台账后进行业务数据验收。

---

## [2026-07-29] Codex 优化代码审查、提交与部署

**总目标**：审查 Codex 对项目全景面板的所有优化修改，确认无误后提交并部署到 Firebase Hosting。

**状态**：✅ 完成

**干到哪了**：
- [x] 审查 Codex 修改的全部文件 —— 证据：逐一读取 App.vue、UploadArea.vue、Toast.vue、useProjectData.js、useToast.js、DateRangeFilter.vue、Dashboard.vue、vite.config.js、playwright.config.js、tests/state.test.js、tests/e2e/app.spec.js、package.json，确认修改合理
- [x] 本地提交 —— 证据：`git commit -m "Codex优化：项目分类存储、toast定时器修复、增加单元测试和e2e测试、UI优化"` 返回 commit `6fb762b`
- [x] 推送到 GitHub —— 证据：`git push origin main` 成功（经历多次 SSL 超时后第4次重试成功）
- [x] 部署到 Firebase Hosting —— 证据：`firebase deploy --only hosting` 成功，用户完成 `firebase login --reauth` 后部署通过
- [x] 线上可访问 —— 证据：https://project-management-panel.web.app

**边界**：不修改 Codex 已提交的代码逻辑；不新增功能。

**关联**：commit `6fb762b`
