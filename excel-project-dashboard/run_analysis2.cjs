const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

function getMonth(dateStr) {
  if (!dateStr) return null;
  const d = String(dateStr).trim();
  const m = d.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + '-' + m[2] : null;
}

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];
let plannedSet = {}, actualSet = {};

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const status = row[44];
  if (!validStatuses.includes(status)) continue;

  const name = row[13] || '(未命名)';
  const budget = parseFloat(row[37]) || 0;
  const pi = getMonth(row[33]);
  const pf = getMonth(row[34]);
  const ai = getMonth(row[35]);
  const af = getMonth(row[36]);

  if (pi === '2026-06' || pf === '2026-06') {
    plannedSet[name] = { budget, pi: row[33]||'', pf: row[34]||'', ai: row[35]||'', af: row[36]||'' };
  }

  if (ai === '2026-06' || af === '2026-06') {
    actualSet[name] = { budget, pi: row[33]||'', pf: row[34]||'', ai: row[35]||'', af: row[36]||'' };
  }
}

// Check overlap
const plannedNames = Object.keys(plannedSet);
const actualNames = Object.keys(actualSet);
const overlap = plannedNames.filter(n => actualNames.includes(n));

console.log('==================================================');
console.log('  对比分析：计划验收 vs 实际验收 是否同一批项目？');
console.log('==================================================');
console.log('计划验收: ' + plannedNames.length + ' 项');
console.log('实际验收: ' + actualNames.length + ' 项');
console.log('重叠项: ' + overlap.length + ' 项');

if (overlap.length === 0) {
  console.log('\n⚠️ 计划验收和实际验收完全是不同的项目！');
  console.log('说明：计划时间与实际时间严重脱节');
} else {
  console.log('\n重叠项目:');
  overlap.forEach(n => console.log('  - ' + n));
}

console.log('\n--- 仅计划未实际验收的项目 ---');
plannedNames.filter(n => !actualNames.includes(n)).forEach((n, i) => {
  const p = plannedSet[n];
  console.log((i+1) + '. ' + n + ' | ' + (p.budget/10000).toFixed(2) + '万 | 计划终验:' + p.pf);
});

console.log('\n--- 仅实际验收未计划的项目 ---');
actualNames.filter(n => !plannedNames.includes(n)).forEach((n, i) => {
  const p = actualSet[n];
  console.log((i+1) + '. ' + n + ' | ' + (p.budget/10000).toFixed(2) + '万 | 实际终验:' + p.af);
});

// Grand total
const plannedTotal = plannedNames.reduce((s,n) => s + plannedSet[n].budget, 0);
const actualTotal = actualNames.reduce((s,n) => s + actualSet[n].budget, 0);

console.log('\n==================================================');
console.log('  2026年6月 最终结论');
console.log('==================================================');
console.log('计划验收: ' + plannedNames.length + ' 项, ' + (plannedTotal/10000).toFixed(2) + ' 万元');
console.log('实际验收: ' + actualNames.length + ' 项, ' + (actualTotal/10000).toFixed(2) + ' 万元');
console.log('重叠: ' + overlap.length + ' 项');
console.log('\n结论: 计划与实际验收项目是不同批次。实际验收总金额 ' + (actualTotal/10000).toFixed(2) + ' 万元');
