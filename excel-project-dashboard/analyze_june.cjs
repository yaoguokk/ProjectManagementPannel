const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const headers = rows[0];
// Column indices (0-based): 
// 33 = 项目计划初验时间含变更
// 35 = 项目计划终验时间含变更
// 36 = 项目实际初验时间
// 37 = 项目实际终验时间
// 38 = 立项收入(元)

// Check date formats and June 2026 data
const planInitialIdx = 33;
const planFinalIdx = 35;
const actualInitialIdx = 36;
const actualFinalIdx = 37;
const budgetIdx = 38;
const statusIdx = 44;

let planInitialJune = [];
let planFinalJune = [];
let actualInitialJune = [];
let actualFinalJune = [];

// Check some sample date values
console.log('=== 日期格式采样 (计划初验时间) ===');
const dateSamples = new Set();
const statusSet = new Set();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const planInitial = row[planInitialIdx];
  const status = row[statusIdx];
  
  if (status) statusSet.add(status);
  
  if (planInitial && typeof planInitial === 'number') {
    dateSamples.add(`number:${planInitial}`);
  } else if (planInitial && typeof planInitial === 'string') {
    dateSamples.add(`string:${planInitial.substring(0, 10)}`);
  }
}

console.log('Date format samples:');
[...dateSamples].slice(0, 20).forEach(s => console.log('  ' + s));
console.log('\nStatus values:');
[...statusSet].forEach(s => console.log('  ' + s));
