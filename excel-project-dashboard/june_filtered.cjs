const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const MONTH = '2026-06';
const MONTH_LABEL = '2026年6月';
const validStatuses = ['待初验', '待终验', '待结算', '已结算'];

function getMonth(v) {
  if (!v) return null;
  if (v instanceof Date) return v.getFullYear() + '-' + String(v.getMonth()+1).padStart(2,'0');
  const d = String(v).trim();
  const m = d.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + '-' + m[2] : null;
}

function isShangji(row) { return row[5] === '基于商机立项'; }

let completed = [], notCompleted = [], actualInMonth = [];
let excludedShangji = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!validStatuses.includes(row[44])) continue;
  if (isShangji(row)) { excludedShangji++; continue; }

  const name = row[13];
  const budget = parseFloat(row[37]) || 0;
  const ai = row[35], af = row[36];
  const aInitMonth = getMonth(ai), aFinalMonth = getMonth(af);
  const pi = getMonth(row[33]), pf = getMonth(row[34]);

  const isPlanInit = (pi === MONTH);
  const isPlanFinal = (pf === MONTH);

  if (isPlanInit || isPlanFinal) {
    let isDone = false;
    let reason = '';
    if (isPlanInit && ai && String(ai).trim().substring(0,7) <= MONTH) { isDone = true; reason += '实际初验' + (aInitMonth||'') + '<=6月底 '; }
    if (isPlanFinal && af && String(af).trim().substring(0,7) <= MONTH) { isDone = true; reason += '实际终验' + (aFinalMonth||'') + '<=6月底'; }
    const item = { name, budget, pi: row[33]||'', pf: row[34]||'', ai: row[35]||'', af: row[36]||'' };
    if (isDone) completed.push({ ...item, reason: reason.trim() });
    else notCompleted.push({ ...item, reason: '实际验收在6月之后' });
  }

  if (aInitMonth === MONTH || aFinalMonth === MONTH) {
    actualInMonth.push({ name, budget });
  }
}

const tPlanAll = completed.reduce((s,p)=>s+p.budget,0) + notCompleted.reduce((s,p)=>s+p.budget,0);
const tComp = completed.reduce((s,p)=>s+p.budget,0);
const tNot = notCompleted.reduce((s,p)=>s+p.budget,0);

console.log('==================================================');
console.log('  ' + MONTH_LABEL + ' 验收分析（排除商机项目）');
console.log('==================================================');
console.log('');
console.log('排除商机项目: ' + excludedShangji + ' 项');
console.log('');

console.log('计划验收: ' + (completed.length + notCompleted.length) + ' 项, ' + (tPlanAll/10000).toFixed(2) + ' 万元');
console.log('已完成: ' + completed.length + ' 项, ' + (tComp/10000).toFixed(2) + ' 万元');
console.log('未完成: ' + notCompleted.length + ' 项, ' + (tNot/10000).toFixed(2) + ' 万元');
notCompleted.forEach((p, i) => console.log('  ' + (i+1) + '. ' + p.name + ' | ' + (p.budget/10000).toFixed(2) + '万'));
const rate = tPlanAll > 0 ? (tComp/tPlanAll*100).toFixed(1) : 'N/A';
const itemRate = (completed.length+notCompleted.length)>0 ? (completed.length/(completed.length+notCompleted.length)*100).toFixed(1) : 'N/A';
console.log('完成率(金额): ' + rate + '%');
console.log('完成率(项目数): ' + itemRate + '%');
console.log('当月实际验收: ' + actualInMonth.length + ' 项, ' + (actualInMonth.reduce((s,p)=>s+p.budget,0)/10000).toFixed(2) + ' 万元');
console.log('==================================================');
