# 项目全景面板 — 未来开发架构方向

> 本文档定义项目的可扩展架构，用于指导后续功能开发（本地持久化、成本监控、项目备注等）。

---

## 整体架构：四层分离 + 模块化

```
┌─────────────────────────────────────────────────────┐
│                    UI 组件层                          │
│  Dashboard / ProjectTable / CostPanel / NotesPanel   │
├─────────────────────────────────────────────────────┤
│              Composable 层（响应式桥梁）               │
│  useProjects / useCostTracking / useNotes / useSync  │
├─────────────────────────────────────────────────────┤
│               Service 层（业务逻辑）                   │
│  ProjectService / CostService / NotesService / Sync  │
├─────────────────────────────────────────────────────┤
│            Repository 层（数据持久化抽象）              │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ IndexedDB    │  │  Firestore   │  │  Storage   │ │
│  │ (本地缓存)    │  │  (云端同步)   │  │ (文件/图片) │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

**核心原则**：Repository 层抽象数据来源，Service 层不关心数据存哪里，Composable 层给组件提供响应式数据。换存储后端只需替换 Repository 实现。

---

## 数据模型设计

```
ExcelSnapshot (台账快照)
├── id, fileName, projectType, uploadedAt
├── projectCount
└── data: Project[]          ← 解析后的完整数据

Project (扩展原有模型)
├── 原有字段: projectCode, projectName, manager, budget...
├── planInitialDate, actualInitialDate, planFinalDate, actualFinalDate
├── costRecords: CostRecord[]    ← 新增：成本记录
└── notes: Note[]                ← 新增：备注记录

CostRecord (成本记录)
├── id, projectId
├── date, category (人力/采购/外包/租赁...)
├── amount, description
├── createdBy, createdAt

Note (备注)
├── id, projectId
├── type: 'text' | 'image'
├── content (文本内容 / 图片URL)
├── createdBy, createdAt, updatedAt
```

---

## 分阶段实施路线（渐进式，每步可独立上线）

### Phase 1：本地持久化（最快见效，无需后端）

```
src/
├── shared/
│   └── db/
│       └── index.js          ← Dexie.js 封装 IndexedDB
├── modules/
│   └── project/
│       ├── repositories/
│       │   ├── ProjectRepository.js    ← 接口定义
│       │   └── LocalProjectRepository.js  ← IndexedDB 实现
│       ├── services/
│       │   └── ProjectService.js
│       └── composables/
│           └── useProjects.js
```

**效果**：打开页面自动加载上次的台账数据，不用重新上传。

**技术选型**：`Dexie.js`（IndexedDB 的 Promise 封装，比原生 API 好用很多）

```
数据流：
上传 Excel → 解析清洗 → ProjectService.save() → IndexedDB
页面打开  → ProjectService.load() → IndexedDB → 直接渲染
```

---

### Phase 2：云端同步（Firebase 升级）

在 Repository 层加一个云端实现，与本地并行：

```
repositories/
├── LocalProjectRepository.js    ← IndexedDB（已有）
├── CloudProjectRepository.js    ← Firestore（新增）
└── SyncProjectRepository.js     ← 组合：先读本地，后台同步云端
```

```
同步策略（Offline-First）：
┌─────────────┐     ┌──────────────┐
│  读取数据    │ ──→ │ 先查IndexedDB │ ──→ 立即渲染
└─────────────┘     └──────┬───────┘
                           │ 后台异步
                           ▼
                    ┌──────────────┐
                    │  同步Firestore │ ──→ 更新本地缓存
                    └──────────────┘

写入数据：
写操作 → 先写 IndexedDB（立即生效）→ 队列同步到 Firestore
```

**Firebase 需要升级**：当前只用了 Hosting，需要开通 Firestore + Storage。

---

### Phase 3：成本监控模块

作为一个独立模块插入，不影响现有功能：

```
src/modules/cost/
├── repositories/
│   └── CostRepository.js
├── services/
│   └── CostService.js
├── composables/
│   └── useCostTracking.js
├── components/
│   ├── CostOverview.vue       ← 成本概览卡片
│   ├── CostRecordList.vue     ← 成本记录列表
│   ├── CostChart.vue          ← 预算 vs 实际图表
│   └── CostRecordForm.vue     ← 录入成本弹窗
└── constants/
    └── costCategories.js      ← 成本分类定义
```

**集成方式**：在 ProjectTable 每行加一个"成本"按钮，点击弹出成本面板。或在区域 D 加第三个 tab"成本监控"。

```
成本数据来源（两种并行）：
1. Excel 导入 → 如果台账里有成本列，自动解析
2. 手动录入 → 用户在页面上添加成本记录
```

---

### Phase 4：项目备注模块

```
src/modules/notes/
├── repositories/
│   └── NotesRepository.js
├── services/
│   ├── NotesService.js
│   └── ImageUploadService.js   ← Firebase Storage 封装
├── composables/
│   └── useNotes.js
└── components/
    ├── NotesPanel.vue          ← 备注面板（侧边抽屉）
    ├── NoteEditor.vue          ← 文本编辑器
    ├── NoteImageUploader.vue   ← 图片上传
    └── NoteTimeline.vue        ← 备注时间线
```

**图片存储策略**：

```
用户选图片 → 压缩（canvas resize, max 1920px）
           → 上传到 Firebase Storage
           → 获取下载URL
           → 存入 Note.content (Firestore/IndexedDB)
           → 渲染时用 URL 显示图片
```

**UI 交互**：点击项目名称 → 右侧滑出抽屉面板 → 上半部分项目基本信息，下半部分备注时间线（支持文本+图片混排）。

---

## 关键扩展点设计

### 1. Repository 接口统一

所有数据模块遵循同一接口约定，未来换 MongoDB/Supabase 只需新增实现：

```javascript
// 统一接口约定（伪代码）
interface Repository<T> {
  getById(id): Promise<T>
  getAll(): Promise<T[]>
  save(entity: T): Promise<void>
  delete(id: string): Promise<void>
  query(predicate): Promise<T[]>
}
```

### 2. 模块注册机制

每个功能模块自注册，主应用只负责组装：

```
app 启动
  ├── 注册 project 模块 → 加载持久化数据
  ├── 注册 cost 模块 → 挂载成本组件
  └── 注册 notes 模块 → 挂载备注组件

未来加新功能（如"风险预警"模块）：
  只需新建 src/modules/risk/，注册即可，不改现有代码
```

### 3. 事件总线（跨模块通信）

```
EventBus:
  'project:uploaded'    → cost模块重置 / notes模块加载
  'project:selected'    → notes模块打开对应项目备注
  'cost:updated'        → Dashboard 刷新 KPI
```

---

## 技术选型汇总

| 能力 | 技术 | 理由 |
|------|------|------|
| 本地存储 | Dexie.js (IndexedDB) | Promise API，支持复杂查询，容量大 |
| 云端数据库 | Firestore | 实时同步，离线支持，已用 Firebase |
| 文件存储 | Firebase Storage | 已有 Firebase 基础设施 |
| 图片压缩 | browser-image-compression | 上传前压缩，省流量 |
| 富文本编辑 | Tiptap 或 简单 textarea | 按需选择 |
| 状态管理 | Vue Composables | 不需要 Pinia，composable 够用 |

---

## 建议实施顺序

```
Phase 1 (1-2天)  → 本地持久化，立即解决"每次都要上传"的痛点
Phase 4 (2-3天)  → 项目备注，业务价值高，且只需要 Storage
Phase 3 (2-3天)  → 成本监控，需要设计成本分类体系
Phase 2 (1-2天)  → 云端同步，多设备访问（可选，看是否需要）
```

---

*最后更新：2026-07-29*
