const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

// Column indices (0-based):
// 13 = 项目名称
// 15 = 项目经理
// 17 = 业务部所
// 33 = 项目计划初验时间含变更
// 35 = 项目计划终验时间含变更
// 36 = 项目实际初验时间
// 37 = 项目实际终验时间
// 38 = 立项收入(元)
// 44 = 项目状态

function getMonth(dateStr) {
  if (!dateStr) return null;
  const d = String(dateStr).trim();
  const m = d.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];

// === 1. 计划验收：计划初验时间∈6月 OR 计划终验时间∈6月 ===
let plannedProjects = [];
// === 2. 实际验收：实际初验时间∈6月 OR 实际终验时间∈6月 ===
let actualProjects = [];
// === 3. 双重验证：计划验收中已完成 vs 未完成 ===
let plannedAndCompleted = [];
let plannedAndNotCompleted = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const status = row[44];
  if (!validStatuses.includes(status)) continue;
  
  const projectName = row[13] || '(未命名)';
  const manager = row[15] || '';
  const department = row[17] || '';
  const budget = parseFloat(row[38]) || 0;
  
  const planInitMonth = getMonth(row[33]);
  const planFinalMonth = getMonth(row[35]);
  const actualInitMonth = getMonth(row[36]);
  const actualFinalMonth = getMonth(row[37]);
  
  const planInitDate = row[33] || '';
  const planFinalDate = row[35] || '';
  const actualInitDate = row[36] || '';
  const actualFinalDate = row[37] || '';
  
  // 计划验收：计划初验或计划终验在6月
  const isPlanned = (planInitMonth === '2026-06') || (planFinalMonth === '2026-06');
  
  // 实际验收：实际初验或实际终验在6月
  const isActual = (actualInitMonth === '2026-06') || (actualFinalMonth === '2026-06');
  
  if (isPlanned) {
    const types = [];
    if (planInitMonth === '2026-06') types.push('初验');
    if (planFinalMonth === '2026-06') types.push('终验');
    
    plannedProjects.push({
      projectName, manager, department, budget,
      planInitDate, planFinalDate, actualInitDate, actualFinalDate,
      types: types.join('+'), status
    });
    
    // 检查是否已完成
    const completed = (planInitMonth === '2026-06' && actualInitDate) ||
                      (planFinalMonth === '2026-06' && actualFinalDate);
    if (completed) {
      plannedAndCompleted.push({ projectName, budget, types: types.join('+') });
    } else {
      plannedAndNotCompleted.push({ projectName, budget, types: types.join('+') });
    }
  }
  
  if (isActual) {
    const types = [];
    if (actualInitMonth === '2026-06') types.push('初验');
    if (actualFinalMonth === '2026-06') types.push('终验');
    
    actualProjects.push({
      projectName, manager, department, budget,
      planInitDate, planFinalDate, actualInitDate, actualFinalDate,
      types: types.join('+'), status
    });
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('  2026年6月 验收分析报告（经营项目台账）');
console.log('═══════════════════════════════════════════════════');

console.log('\n📌 业务规则：');
console.log('  计划验收 = 计划初验时间∈6月 OR 计划终验时间∈6月');
console.log('  实际验收 = 实际初验时间∈6月 OR 实际终验时间∈6月');
console.log('  金额字段：立项收入(元)');

console.log('\n───────────────────────────────────────────────────');
console.log(`📋 一、计划验收项目（${plannedProjects.length} 项）`);
console.log('───────────────────────────────────────────────────');

if (plannedProjects.length === 0) {
  console.log('  （无）— 计划初验和计划终验列在6月均无数据');
} else {
  let totalPlanned = 0;
  plannedProjects.forEach((p, idx) => {
    totalPlanned += p.budget;
    console.log(`  ${idx+1}. ${p.projectName}`);
    console.log(`     类型:${p.types} | 金额:${(p.budget/10000).toFixed(2)}万 | 经理:${p.manager} | 部门:${p.department}`);
    console.log(`     计划初验:${p.planInitDate || '-'} | 计划终验:${p.planFinalDate || '-'}`);
    console.log(`     实际初验:${p.actualInitDate || '(空)'} | 实际终验:${p.actualFinalDate || '(空)'} | 状态:${p.status}`);
  });
  console.log(`  ──────────────────────────`);
  console.log(`  计划验收总金额: ${(totalPlanned/10000).toFixed(2)} 万元`);
}

console.log('\n───────────────────────────────────────────────────');
console.log(`✅ 二、实际验收项目（${actualProjects.length} 项）`);
console.log('───────────────────────────────────────────────────');

let totalActual = 0;
actualProjects.forEach((p, idx) => {
  totalActual += p.budget;
  console.log(`  ${idx+1}. ${p.projectName}`);
  console.log(`     类型:${p.types} | 金额:${(p.budget/10000).toFixed(2)}万 | 经理:${p.manager} | 部门:${p.department}`);
  console.log(`     实际初验:${p.actualInitDate || '-'} | 实际终验:${p.actualFinalDate || '-'} | 状态:${p.status}`);
});
console.log(`  ──────────────────────────`);
console.log(`  实际验收总金额: ${(totalActual/10000).toFixed(2)} 万元`);

console.log('\n───────────────────────────────────────────────────');
console.log('📊 三、完成率分析');
console.log('───────────────────────────────────────────────────');

if (plannedProjects.length > 0) {
  const completedCount = plannedAndCompleted.length;
  const notCompletedCount = plannedAndNotCompleted.length;
  const completedBudget = plannedAndCompleted.reduce((s,p) => s + p.budget, 0);
  const notCompletedBudget = plannedAndNotCompleted.reduce((s,p) => s + p.budget, 0);
  
  console.log(`  计划验收项目中已完成: ${completedCount}/${plannedProjects.length} 项`);
  console.log(`  计划验收项目中未完成: ${notCompletedCount}/${plannedProjects.length} 项`);
  console.log(`  完成率(按金额): ${(completedBudget/(completedBudget+notCompletedBudget)*100).toFixed(1)}%`);
  console.log(`  完成率(按项目数): ${(completedCount/plannedProjects.length*100).toFixed(1)}%`);
} else {
  console.log('  计划验收项目数为0，无法计算完成率');
  console.log('  （原因：计划初验时间和计划终验时间列数据大面积缺失）');
  console.log('  实际验收项目数:', actualProjects.length, '项');
  console.log('  实际验收金额:', (totalActual/10000).toFixed(2), '万元');
}

console.log('\n───────────────────────────────────────────────────');
console.log('🔍 四、补充：计划初验/终验列数据填充分布');
console.log('───────────────────────────────────────────────────');

const planInitByMonth = {};
const planFinalByMonth = {};
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!validStatuses.includes(row[44])) continue;
  const pi = getMonth(row[33]);
  const pf = getMonth(row[35]);
  if (pi) planInitByMonth[pi] = (planInitByMonth[pi]||0)+1;
  if (pf) planFinalByMonth[pf] = (planFinalByMonth[pf]||0)+1;
}

console.log('  计划初验时间月份分布:');
Object.entries(planInitByMonth).sort().forEach(([m,c]) => console.log(`    ${m}: ${c}项`));
console.log('  计划终验时间月份分布:');
Object.entries(planFinalByMonth).sort().forEach(([m,c]) => console.log(`    ${m}: ${c}项`));

console.log('\n═══════════════════════════════════════════════════');
