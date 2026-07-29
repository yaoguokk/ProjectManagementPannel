const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const planInitialIdx = 33;
const planFinalIdx = 35;
const actualInitialIdx = 36;
const actualFinalIdx = 37;
const budgetIdx = 38;

function isInMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = String(dateStr).trim();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return d.startsWith(prefix);
}

function getMonth(dateStr) {
  if (!dateStr) return null;
  const d = String(dateStr).trim();
  const m = d.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

let planInitJune = [], planFinalJune = [];
let actualInitJune = [], actualFinalJune = [];

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];

// Count all months for overview
const planMonthCounts = {};
const actualMonthCounts = {};

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const status = row[44];
  if (!validStatuses.includes(status)) continue;
  
  const bud = parseFloat(row[budgetIdx]) || 0;
  
  // Plan dates
  const planInitM = getMonth(row[planInitialIdx]);
  const planFinalM = getMonth(row[planFinalIdx]);
  const actualInitM = getMonth(row[actualInitialIdx]);
  const actualFinalM = getMonth(row[actualFinalIdx]);
  
  if (planInitM) {
    planMonthCounts[planInitM] = (planMonthCounts[planInitM] || 0) + 1;
    if (planInitM === '2026-06') {
      planInitJune.push({ name: row[13], date: row[planInitialIdx], bud, status });
    }
  }
  
  if (planFinalM) {
    if (planFinalM === '2026-06') {
      planFinalJune.push({ name: row[13], date: row[planFinalIdx], bud, status });
    }
  }
  
  if (actualInitM) {
    actualMonthCounts[actualInitM] = (actualMonthCounts[actualInitM] || 0) + 1;
    if (actualInitM === '2026-06') {
      actualInitJune.push({ name: row[13], date: row[actualInitialIdx], bud, status });
    }
  }
  
  if (actualFinalM) {
    if (actualFinalM === '2026-06') {
      actualFinalJune.push({ name: row[13], date: row[actualFinalIdx], bud, status });
    }
  }
}

console.log('=== 计划初验月份分布 ===');
Object.entries(planMonthCounts).sort().forEach(([m, c]) => console.log(`  ${m}: ${c} 项`));

console.log('\n=== 实际初验月份分布 ===');
Object.entries(actualMonthCounts).sort().forEach(([m, c]) => console.log(`  ${m}: ${c} 项`));

console.log('\n=== 2026年6月 初验统计 ===');
console.log(`计划初验项目数: ${planInitJune.length}`);
console.log(`计划初验金额: ${(planInitJune.reduce((s,d) => s + d.bud, 0) / 10000).toFixed(2)} 万元`);
console.log(`实际初验项目数: ${actualInitJune.length}`);
console.log(`实际初验金额: ${(actualInitJune.reduce((s,d) => s + d.bud, 0) / 10000).toFixed(2)} 万元`);

console.log('\n=== 2026年6月 终验统计 ===');
console.log(`计划终验项目数: ${planFinalJune.length}`);
console.log(`计划终验金额: ${(planFinalJune.reduce((s,d) => s + d.bud, 0) / 10000).toFixed(2)} 万元`);
console.log(`实际终验项目数: ${actualFinalJune.length}`);
console.log(`实际终验金额: ${(actualFinalJune.reduce((s,d) => s + d.bud, 0) / 10000).toFixed(2)} 万元`);

console.log('\n=== 6月计划初验项目详情 ===');
planInitJune.forEach(d => {
  console.log(`  ${d.name} | ${d.date} | ${(d.bud/10000).toFixed(1)}万 | ${d.status}`);
});

console.log('\n=== 6月实际初验项目详情 ===');
actualInitJune.forEach(d => {
  console.log(`  ${d.name} | ${d.date} | ${(d.bud/10000).toFixed(1)}万 | ${d.status}`);
});
