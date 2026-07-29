const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const headers = rows[0];

// Correct 0-based column indices:
// [33] 项目计划初验时间含变更
// [34] 项目计划终验时间含变更
// [35] 项目实际初验时间
// [36] 项目实际终验时间
// [37] 立项收入(元)
// [44] 项目状态

function getMonth(dateStr) {
  if (!dateStr) return null;
  const d = String(dateStr).trim();
  const m = d.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + '-' + m[2] : null;
}

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];
let planned = [], actual = [], pComp = [], pNotComp = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const status = row[44];
  if (!validStatuses.includes(status)) continue;

  const name = row[13] || '(未命名)';
  const mgr = row[15] || '';
  const dept = row[17] || '';
  const budget = parseFloat(row[37]) || 0;

  const pi = getMonth(row[33]);
  const pf = getMonth(row[34]);
  const ai = getMonth(row[35]);
  const af = getMonth(row[36]);

  const isPlan = (pi === '2026-06') || (pf === '2026-06');
  const isAct = (ai === '2026-06') || (af === '2026-06');

  if (isPlan) {
    const t = [];
    if (pi === '2026-06') t.push('初验');
    if (pf === '2026-06') t.push('终验');
    planned.push({ name, mgr, dept, budget, pi: row[33]||'', pf: row[34]||'', ai: row[35]||'', af: row[36]||'', t: t.join('+'), status });
    const done = (pi==='2026-06' && row[35]) || (pf==='2026-06' && row[36]);
    if (done) pComp.push({ name, budget }); else pNotComp.push({ name, budget });
  }

  if (isAct) {
    const t = [];
    if (ai === '2026-06') t.push('初验');
    if (af === '2026-06') t.push('终验');
    actual.push({ name, mgr, dept, budget, pi: row[33]||'', pf: row[34]||'', ai: row[35]||'', af: row[36]||'', t: t.join('+'), status });
  }
}

console.log('==================================================');
console.log('  2026年6月 验收分析报告（经营项目）');
console.log('==================================================');

console.log('\n业务规则: 计划验收 = 计划初验OR计划终验 in 6月');
console.log('         实际验收 = 实际初验OR实际终验 in 6月');

console.log('\n--------------------------------------------------');
console.log('一、计划验收项目 (' + planned.length + ' 项)');
console.log('--------------------------------------------------');
let tp = 0;
planned.forEach((p, idx) => {
  tp += p.budget;
  console.log((idx+1) + '. ' + p.name);
  console.log('   ' + p.t + ' | ' + (p.budget/10000).toFixed(2) + '万 | ' + p.mgr + ' | ' + p.dept + ' | ' + p.status);
});
if (planned.length) console.log('   合计: ' + (tp/10000).toFixed(2) + ' 万元');

console.log('\n--------------------------------------------------');
console.log('二、实际验收项目 (' + actual.length + ' 项)');
console.log('--------------------------------------------------');
let ta = 0;
actual.forEach((p, idx) => {
  ta += p.budget;
  console.log((idx+1) + '. ' + p.name);
  console.log('   ' + p.t + ' | ' + (p.budget/10000).toFixed(2) + '万 | ' + p.mgr + ' | ' + p.dept + ' | ' + p.status);
});
console.log('   ----------------------------------------');
console.log('   实际验收总金额: ' + (ta/10000).toFixed(2) + ' 万元');

console.log('\n--------------------------------------------------');
console.log('三、完成率');
console.log('--------------------------------------------------');
if (planned.length) {
  console.log('  计划: ' + planned.length + ' 项, ' + (tp/10000).toFixed(2) + ' 万元');
  console.log('  已完成: ' + pComp.length + ' 项, ' + (pComp.reduce((s,p)=>s+p.budget,0)/10000).toFixed(2) + ' 万元');
  console.log('  未完成: ' + pNotComp.length + ' 项, ' + (pNotComp.reduce((s,p)=>s+p.budget,0)/10000).toFixed(2) + ' 万元');
  const rate = tp > 0 ? (pComp.reduce((s,p)=>s+p.budget,0)/tp*100).toFixed(1) : 'N/A';
  console.log('  完成率(金额): ' + rate + '%');
} else {
  console.log('  计划验收: 0 项（台账中计划验收列数据大面积缺失）');
  console.log('  无法计算完成率');
}

// Show month distributions
const piM = {}, pfM = {}, aiM = {}, afM = {};
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!validStatuses.includes(r[44])) continue;
  const a = getMonth(r[33]), b = getMonth(r[34]), c = getMonth(r[35]), d = getMonth(r[36]);
  if (a) piM[a] = (piM[a]||0)+1;
  if (b) pfM[b] = (pfM[b]||0)+1;
  if (c) aiM[c] = (aiM[c]||0)+1;
  if (d) afM[d] = (afM[d]||0)+1;
}
console.log('\n--------------------------------------------------');
console.log('四、各月份分布（全量数据）');
console.log('--------------------------------------------------');
console.log('  计划初验: ' + Object.entries(piM).sort().map(([k,v])=>k+':'+v).join(', '));
console.log('  计划终验: ' + Object.entries(pfM).sort().map(([k,v])=>k+':'+v).join(', '));
console.log('  实际初验: ' + Object.entries(aiM).sort().map(([k,v])=>k+':'+v).join(', '));
console.log('  实际终验: ' + Object.entries(afM).sort().map(([k,v])=>k+':'+v).join(', '));

console.log('\n==================================================');
