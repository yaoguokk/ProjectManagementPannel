const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const planInitialIdx = 33;  // 项目计划初验时间
const planFinalIdx = 35;    // 项目计划终验时间
const actualInitialIdx = 36; // 项目实际初验时间
const actualFinalIdx = 37;   // 项目实际终验时间
const budgetIdx = 37;        // 实际终验时间（需要找到立项收入）

// 重新确认索引 (0-based)
const headers = rows[0];
console.log('Hands-on header check:');
console.log('  [34]', headers[33]); // 项目计划初验时间含变更
console.log('  [36]', headers[35]); // 项目计划终验时间含变更
console.log('  [37]', headers[36]); // 项目实际初验时间
console.log('  [38]', headers[37]); // 项目实际终验时间
console.log('  [39]', headers[38]); // 立项收入(元)

const budget = 38; // 立项收入(元) 0-based index

function isInMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const d = String(dateStr).trim();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return d.startsWith(prefix);
}

let planCount = 0, planSum = 0;
let actualCount = 0, actualSum = 0;
let details = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const planDate = row[33]; // 计划初验时间含变更
  const actualDate = row[36]; // 实际初验时间
  const projectName = row[13]; // 项目名称
  const bud = parseFloat(row[budget]) || 0;
  const status = row[44];
  
  // 只保留有效状态
  const validStatuses = ['待初验', '待终验', '待结算', '已结算'];
  if (!validStatuses.includes(status)) continue;
  
  if (isInMonth(planDate, 2026, 6)) {
    planCount++;
    planSum += bud;
    if (details.length < 10) {
      details.push({ name: projectName, planDate, actualDate, bud, status });
    }
  }
  
  if (isInMonth(actualDate, 2026, 6)) {
    actualCount++;
    actualSum += bud;
  }
}

console.log('\n=== 2026年6月 初验统计 ===');
console.log(`计划初验项目数: ${planCount}`);
console.log(`计划初验金额: ${(planSum / 10000).toFixed(2)} 万元`);
console.log(`实际初验项目数: ${actualCount}`);
console.log(`实际初验金额: ${(actualSum / 10000).toFixed(2)} 万元`);
console.log(`初验完成率: ${(actualSum / planSum * 100).toFixed(1)}%`);

console.log('\n=== 计划初验项目示例 ===');
details.forEach(d => {
  console.log(`  ${d.name} | 计划:${d.planDate} | 实际:${d.actualDate} | 金额:${(d.bud/10000).toFixed(1)}万 | ${d.status}`);
});
