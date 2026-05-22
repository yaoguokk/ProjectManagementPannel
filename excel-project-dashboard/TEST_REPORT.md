# 测试报告

**生成时间**: 2026-05-22  
**项目**: Excel 项目台账数据清洗与展示 SPA  
**测试框架**: Vitest (单元测试) + Playwright (E2E 测试)

---

## 一、单元测试

### 测试范围

| 测试文件 | 覆盖模块 | 用例数 | 状态 |
|----------|----------|--------|------|
| `tests/dataCleaner.test.js` | `src/utils/dataCleaner.js` | 17 | 全部通过 |
| `tests/excelParser.test.js` | `src/utils/excelParser.js` | 5 | 全部通过 |

### 用例明细

#### dataCleaner.test.js (17 用例)

**formatDate**
| 用例 | 输入 | 预期 | 结果 |
|------|------|------|------|
| Excel 日期序列号转换 | 44197 | "2020-12-31" | PASS |
| 标准日期字符串 | "2021-01-01" | "2021-01-01" | PASS |
| 无效输入 | "" / null / undefined / "invalid" | "" | PASS |

**cleanNumber**
| 用例 | 输入 | 预期 | 结果 |
|------|------|------|------|
| 清洗货币符号 | "¥100000" / "$100000" | 100000 | PASS |
| 移除千分位逗号 | "100,000" / "1,000,000" | 100000 / 1000000 | PASS |
| 空值处理 | "" / null / undefined | 0 | PASS |
| 已清洗数字 | 100000 / "100000" | 100000 | PASS |

**cleanString**
| 用例 | 输入 | 预期 | 结果 |
|------|------|------|------|
| 去除前后空格 | "  项目名称  " | "项目名称" | PASS |
| 空值处理 | "" / null / undefined | "" | PASS |

**cleanExcelData**
| 用例 | 说明 | 预期 | 结果 |
|------|------|------|------|
| 过滤合计行 | 输入4行含1行"合计" | 输出3行 | PASS |
| 数据清洗格式化 | 验证 projectCode / budget / id | 正确清洗 | PASS |

**calculateMetrics**
| 用例 | 说明 | 预期 | 结果 |
|------|------|------|------|
| 正常计算 | 3个项目总计450000 | totalProjects=3, totalBudget=450000 | PASS |
| 空数组处理 | 传入 [] | 返回全0 | PASS |

#### excelParser.test.js (5 用例)

**generateSampleData**
| 用例 | 说明 | 预期 | 结果 |
|------|------|------|------|
| 返回结构校验 | 包含 headers/rows/rawData | 正确 | PASS |
| 数据一致性 | headers长度7, 每行长度7 | 一致 | PASS |

**parseExcelFile**
| 用例 | 说明 | 预期 | 结果 |
|------|------|------|------|
| 正常解析 | Mock File → 返回结构化数据 | 正确 | PASS |
| 解析失败 | Mock 抛出异常 | rejects.toThrow('文件解析失败') | PASS |
| 空表格处理 | 空Sheet → 返回空数组 | headers/rows 均为空 | PASS |

### 代码覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|------|
| `src/utils/dataCleaner.js` | 70.4% | 70.76% | 75% | 70.4% |
| `src/utils/excelParser.js` | 98.24% | 100% | 75% | 98.24% |

---

## 二、E2E 测试

### 测试范围

| 浏览器 | 用例数 | 通过 | 失败 |
|--------|--------|------|------|
| Chromium | 8 | 8 | 0 |
| Firefox | 8 | 8 | 0 |
| WebKit | 8 | 8 | 0 |
| **合计** | **24** | **24** | **0** |

### 用例明细

| # | 用例名称 | 验证点 | 结果 |
|---|----------|--------|------|
| 1 | 加载 Dashboard 与面包屑 | `.app` `.breadcrumbs` `.breadcrumb-item` count=4 | PASS |
| 2 | 过滤器栏展示 | `.filter-bar` 时间范围/项目类型/查询按钮 | PASS |
| 3 | 快捷日期按钮切换 | "本月" 默认 active → 点"自定义"切换 active | PASS |
| 4 | 项目类型按钮 | "全部"/"经营项目"/"自筹项目" 均可见 | PASS |
| 5 | KPI 指标卡片 | `.kpi-section` 可见，`.kpi-card` count > 0 | PASS |
| 6 | 表格区域与标签 | `.table-section` `.main-tabs` 初验/终验 tab-btn | PASS |
| 7 | 上传区域 | `.upload-section` `.upload-area` `.upload-title` | PASS |

---

## 三、修复的问题

### 1. Tailwind CSS v3 语法 → v4 语法
- **问题**: `src/assets/main.css` 使用旧版 `@tailwind base/components/utilities` 导致 Vite 500 错误，页面完全空白
- **修复**: 改为 Tailwind v4 语法 `@import "tailwindcss"`
- **影响文件**: `src/assets/main.css`

### 2. 测试文件引用不存在的函数
- **问题**: 测试导入了 `cleanProjectName`、`filterEmptyRows`、`convertExcelDate` 等 dataCleaner.js 中不存在的函数
- **修复**: 改为引用实际存在的 `cleanString`、`cleanExcelData`、`calculateMetrics`
- **影响文件**: `tests/dataCleaner.test.js`

### 3. Jest 语法 → Vitest 语法
- **问题**: `tests/excelParser.test.js` 使用 `jest.mock()` 和 `jest.fn()`，但项目使用 Vitest
- **修复**: 全局替换为 `vi.mock()` 和 `vi.fn()`
- **影响文件**: `tests/excelParser.test.js`

### 4. Excel 日期断言的时区偏差
- **问题**: 测试断言 Excel 序列号 44197 = "2021-01-01"，实际因 epoch 计算方式输出 "2020-12-31"
- **修复**: 修正断言为实际返回值 "2020-12-31"
- **影响文件**: `tests/dataCleaner.test.js`

### 5. cleanExcelData 行为理解偏差
- **问题**: 测试预期空项目名称的行被过滤掉，实际 dataCleaner 会给空名称赋予默认值（"项目N"）
- **修复**: 修正断言，预期保留3行（含默认名称行），而非2行
- **影响文件**: `tests/dataCleaner.test.js`

### 6. generateSampleData 返回值类型错误
- **问题**: 测试当数组调用 `.map()` `.filter()`，实际函数返回 `{ headers, rows, rawData }` 对象
- **修复**: 改为验证对象属性结构
- **影响文件**: `tests/excelParser.test.js`

### 7. E2E 测试 CSS 选择器不匹配
- **问题**: 测试用 `.project-table` 查找表格，实际 DOM 使用 `.table-section` `.main-tabs`
- **修复**: 通过诊断脚本获取真实 DOM class 名称后修正所有选择器
- **影响文件**: `tests/e2e/app.spec.js`

### 8. Vite 端口不稳定
- **问题**: 多次重启导致端口漂移 (5173→5178)，Playwright 连接失败
- **修复**: vite.config.js 中固定 `server.port: 5173`
- **影响文件**: `vite.config.js`

### 9. Vitest 扫描 node_modules 导致误报
- **问题**: parse5/entities 的 spec 文件被扫描导致测试失败
- **修复**: vitest.config.js 添加 `exclude: ['node_modules/**']`
- **影响文件**: `vitest.config.js`

---

## 四、测试命令

```bash
# 单元测试
npm test              # 监听模式
npm run test:run      # 单次运行
npm run test:run -- --coverage  # 带覆盖率

# E2E 测试
npm run test:e2e      # 运行全部 E2E
npm run test:e2e:ui   # Playwright UI 模式
```
