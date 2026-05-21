# Excel 项目台账数据清洗与展示 SPA 应用 - 项目记录

## 项目概述
这是一个基于 Vue 3 + Vite 的单页应用（SPA），用于 Excel 项目台账数据的清洗、处理和可视化展示。所有数据操作在前端内存中完成，支持本地文件上传和处理。

## 技术栈
- Vue 3 + Vite
- Composition API
- Tailwind CSS v4
- xlsx (SheetJS) - Excel 文件解析
- ECharts (待添加) - 数据可视化

## 项目结构
```
src/
├── components/
│   ├── Dashboard/          # 主界面组件
│   ├── UploadArea/         # Excel 文件上传
│   ├── KpiCards/          # KPI 指标卡片
│   ├── ProjectTable/      # 项目数据表格
│   ├── filters/           # 过滤器组件
│   └── common/           # 通用组件
├── utils/
│   ├── excelParser.js    # Excel 解析工具
│   └── dataCleaner.js    # 数据清洗工具
├── data/
│   └── projectData.js    # 示例数据
├── composables/          # 组合式函数
└── constants/           # 常量定义
```

## 已完成功能

### 1. Excel 文件上传与解析
- **位置**: `/src/components/UploadArea/UploadArea.vue`
- **功能**: 
  - 拖拽上传和点击上传
  - 文件类型验证（.xlsx, .xls）
  - 上传进度显示
  - 文件状态管理

### 2. 数据清洗规则
- **位置**: `/src/utils/dataCleaner.js`
- **规则**:
  - 过滤空行和"合计"行
  - 去除字符串前后空格
  - 统一日期格式为 YYYY-MM-DD
  - 清洗金额字段（去除¥、$、等符号）

### 3. KPI 指标展示
- **位置**: `/src/components/KpiCards/KpiCards.vue`
- **功能**: 环形进度图展示完成率

### 4. 项目数据表格
- **位置**: `/src/components/ProjectTable/ProjectTable.vue`
- **功能**: 
  - 双层 Tab 切换
  - 搜索和筛选
  - 分页功能
  - 导出功能（待完善）

## 变更记录

### 🐛 已修复的问题

#### 1. 图标大小问题 (2026-05-21)
- **问题描述**: UploadArea 上传图标和 ProjectTable 空状态图标过大
- **修复方案**:
  - UploadArea: `h-12 w-12` → `h-8 w-8`
  - ProjectTable: `48px` → `32px`
- **文件位置**:
  - `src/components/UploadArea/UploadArea.vue:13`
  - `src/components/ProjectTable/ProjectTable.vue:550-552`

#### 2. CSS 配置问题 (2026-05-21)
- **问题描述**: Tailwind CSS v4 配置缺少必要依赖
- **修复方案**: 安装 `autoprefixer` 和 `@tailwindcss/postcss`
- **文件位置**: `postcss.config.js`

### 📝 关键修改记录

#### 数据清洗功能实现
```javascript
// 新增 cleanExcelData 函数 (dataCleaner.js)
export const cleanExcelData = (rawData) => {
  // 1. 过滤空行
  // 2. 过滤合计行
  // 3. 字段清洗和格式化
  // 4. 返回清洗后的数据
}
```

#### Dashboard 组件更新
```vue
<!-- 添加上传区域 -->
<div class="upload-section">
  <UploadArea
    @file-uploaded="handleFileUploaded"
    @file-error="handleFileError"
  />
</div>
```

## 开发规范

### 1. 代码结构
- 单个 .vue 文件不超过 200 行
- 逻辑与视图分离
- 使用 Composition API

### 2. 命名规范
- 语义化命名
- 避免魔法数字
- 使用常量定义状态

### 3. 错误处理
- Excel 解析使用 try-catch
- 提供友好的错误提示
- 显示空状态页面

## 测试要点

### 1. 功能测试
- Excel 文件上传和解析
- 数据清洗规则验证
- 图表数据准确性
- 表格功能测试

### 2. 边界情况
- 空文件处理
- 格式错误的 Excel
- 大文件处理
- 网络异常情况

## 下一步计划

### 1. 数据可视化
- 添加 ECharts 图表
- 状态分布饼图
- 部门分布柱状图
- 月度趋势折线图

### 2. 功能完善
- 高级筛选功能
- Excel 导出功能
- 数据缓存机制

### 3. 性能优化
- 大数据量处理
- 组件懒加载
- 防抖和节流

## 文档
- `CHANGELOG.md` - 详细的变更记录
- `DEVELOPMENT_LOG.md` - 开发过程日志
- `README.md` - 项目说明文档

---

**维护状态**: 开发中  
**最后更新**: 2026-05-21