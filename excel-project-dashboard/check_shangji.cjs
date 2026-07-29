const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];

console.log('=== 立项方式字段分布 ===');
const lxFangsi = {};
for (let i = 1; i < rows.length; i++) {
  const v = rows[i][5] || '(空)';
  lxFangsi[v] = (lxFangsi[v]||0)+1;
}
Object.entries(lxFangsi).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log('  ' + k + ': ' + v));

console.log('');
console.log('=== 项目状态字段分布 ===');
const statusDist = {};
for (let i = 1; i < rows.length; i++) {
  const v = row = rows[i][44] || '(空)';
  statusDist[v] = (statusDist[v]||0)+1;
}
Object.entries(statusDist).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log('  ' + k + ': ' + v));

console.log('');
console.log('=== 所有包含"商机"二字的项目名称 ===');
let count = 0;
let totalBudget = 0;
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!validStatuses.includes(row[44])) continue;
  const name = row[13] || '';
  if (name.includes('商机')) {
    count++;
    const budget = parseFloat(row[37]) || 0;
    totalBudget += budget;
    console.log('  ' + name + ' | 立项方式:' + (row[5]||'-') + ' | ' + (budget/10000).toFixed(2) + '万 | 状态:' + row[44]);
  }
}
console.log('  合计: ' + count + ' 项, ' + (totalBudget/10000).toFixed(2) + ' 万元');
