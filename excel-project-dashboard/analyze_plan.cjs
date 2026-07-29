const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];

// Count empty vs non-empty for key columns
let planInitFilled = 0, planInitEmpty = 0;
let planFinalFilled = 0, planFinalEmpty = 0;
let actualInitFilled = 0, actualInitEmpty = 0;
let actualFinalFilled = 0, actualFinalEmpty = 0;

const planMonthCounts = {};
const planFinalMonthCounts = {};

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const status = row[44];
  if (!validStatuses.includes(status)) continue;
  
  const planInit = row[33];
  const planFinal = row[35];
  const actualInit = row[36];
  const actualFinal = row[37];
  
  if (planInit) { planInitFilled++; const m = String(planInit).substring(0,7); planMonthCounts[m] = (planMonthCounts[m]||0)+1; }
  else planInitEmpty++;
  
  if (planFinal) { planFinalFilled++; const m = String(planFinal).substring(0,7); planFinalMonthCounts[m] = (planFinalMonthCounts[m]||0)+1; }
  else planFinalEmpty++;
  
  if (actualInit) actualInitFilled++; else actualInitEmpty++;
  if (actualFinal) actualFinalFilled++; else actualFinalEmpty++;
}

console.log('=== 各字段填充分布（有效项目） ===');
console.log(`计划初验时间: 已填 ${planInitFilled}, 未填 ${planInitEmpty}`);
console.log(`计划终验时间: 已填 ${planFinalFilled}, 未填 ${planFinalEmpty}`);
console.log(`实际初验时间: 已填 ${actualInitFilled}, 未填 ${actualInitEmpty}`);
console.log(`实际终验时间: 已填 ${actualFinalFilled}, 未填 ${actualFinalEmpty}`);

console.log('\n=== 计划初验月份分布 ===');
Object.entries(planMonthCounts).sort().forEach(([m, c]) => console.log(`  ${m}: ${c} 项`));

console.log('\n=== 计划终验月份分布 ===');
Object.entries(planFinalMonthCounts).sort().forEach(([m, c]) => console.log(`  ${m}: ${c} 项`));
