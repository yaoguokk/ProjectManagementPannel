const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];

function getMonth(v) {
  if (!v) return null;
  if (v instanceof Date) return v.getFullYear() + '-' + String(v.getMonth()+1).padStart(2,'0');
  const d = String(v).trim();
  const m = d.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + '-' + m[2] : null;
}

function dateLE(dateStr, month) {
  if (!dateStr) return false;
  const prefix = month; // '2026-06'
  // dateStr starts with '2026-05-XX' means it's before June
  return String(dateStr).trim().substring(0,7) <= prefix;
}

let planned = [], actualInMonth = [], completed = [], notCompleted = [];

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!validStatuses.includes(row[44])) continue;

  const name = row[13];
  const budget = parseFloat(row[37]) || 0;

  const pi = getMonth(row[33]);
  const pf = getMonth(row[34]);
  const ai = getMonth(row[35]);
  const af = getMonth(row[36]);
  const aInit = row[35], aFinal = row[36];

  // 计划验收: 计划初验 in 6月 OR 计划终验 in 6月
  const isPlanInit = (pi === '2026-06');
  const isPlanFinal = (pf === '2026-06');

  // 实际验收规则:
  // 对于计划初验项目: 实际初验日期 <= 2026-06 (含6月及之前) → 完成
  // 对于计划终验项目: 实际终验日期 <= 2026-06 (含6月及之前) → 完成

  if (isPlanInit || isPlanFinal) {
    let isDone = false;
    let reason = '';

    if (isPlanInit) {
      if (aInit && String(aInit).trim().substring(0,7) <= '2026-06') {
        isDone = true;
        reason = '实际初验' + (ai||'') + ' <= 6月底';
      }
    }

    if (isPlanFinal) {
      if (aFinal && String(aFinal).trim().substring(0,7) <= '2026-06') {
        isDone = true;
        reason = '实际终验' + (af||'') + ' <= 6月底';
      }
    }

    const item = { name, budget, pi: row[33]||'', pf: row[34]||'', ai: row[35]||'', af: row[36]||'' };

    if (isDone) completed.push({ ...item, reason });
    else notCompleted.push({ ...item, reason: '实际验收日期在6月之后' });
  }

  // 实际验收 in 6月 (直接按月份)
  if (ai === '2026-06' || af === '2026-06') {
    actualInMonth.push({ name, budget });
  }
}

const tPlan = completed.reduce((s,p)=>s+p.budget,0) + notCompleted.reduce((s,p)=>s+p.budget,0);
const tComp = completed.reduce((s,p)=>s+p.budget,0);
const tNot = notCompleted.reduce((s,p)=>s+p.budget,0);

console.log('==================================================');
console.log('  2026年6月 验收分析（修正版）');
console.log('==================================================');
console.log('');
console.log('规则：计划验收 in 6月，实际验收 <= 6月底 → 完成');
console.log('（含6月内完成 + 6月之前提前完成）');
console.log('');

console.log('--------------------------------------------------');
console.log('一、计划验收: ' + (completed.length + notCompleted.length) + ' 项, ' + (tPlan/10000).toFixed(2) + ' 万元');
console.log('--------------------------------------------------');

console.log('');
console.log('✅ 已完成 (' + completed.length + ' 项, ' + (tComp/10000).toFixed(2) + ' 万元):');
completed.forEach((p, i) => {
  console.log('  ' + (i+1) + '. ' + p.name);
  console.log('     ' + (p.budget/10000).toFixed(2) + '万 | ' + p.reason);
});

console.log('');
console.log('❌ 未完成 (' + notCompleted.length + ' 项, ' + (tNot/10000).toFixed(2) + ' 万元):');
notCompleted.forEach((p, i) => {
  console.log('  ' + (i+1) + '. ' + p.name);
  console.log('     ' + (p.budget/10000).toFixed(2) + '万 | 计划终验:' + p.pf + ' | 实际初验:' + (p.ai||'(空)') + ' 实际终验:' + (p.af||'(空)'));
});

console.log('');
console.log('--------------------------------------------------');
console.log('二、KPI');
console.log('--------------------------------------------------');
console.log(' 完成率(金额): ' + (tPlan>0 ? (tComp/tPlan*100).toFixed(1) : 'N/A') + '%  (' + (tComp/10000).toFixed(2) + '万 / ' + (tPlan/10000).toFixed(2) + '万)');
console.log(' 完成率(项目数): ' + ((completed.length+notCompleted.length)>0 ? (completed.length/(completed.length+notCompleted.length)*100).toFixed(1) : 'N/A') + '%  (' + completed.length + '/' + (completed.length+notCompleted.length) + ')');

console.log('');
console.log('--------------------------------------------------');
console.log('三、当月实际验收: ' + actualInMonth.length + ' 项, ' + (actualInMonth.reduce((s,p)=>s+p.budget,0)/10000).toFixed(2) + ' 万元');
console.log('--------------------------------------------------');
console.log(' (这些项目实际终验日期正好落在6月内)');
console.log('==================================================');
