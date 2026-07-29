const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);

// Read with date parsing enabled
const wb = read(file, { type: 'array', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('=== 12个实际验收项目的筛选过程 ===');
console.log('筛选条件: 实际初验时间 in 2026-06 OR 实际终验时间 in 2026-06');
console.log('（列索引: [35]=实际初验, [36]=实际终验）');

const validStatuses = ['待初验', '待终验', '待结算', '已结算'];
let count = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const status = row[44];
  if (!validStatuses.includes(status)) continue;

  const name = row[13] || '(未命名)';
  const actualInit = row[35];
  const actualFinal = row[36];

  function getMonth(v) {
    if (!v) return null;
    if (v instanceof Date) {
      return v.getFullYear() + '-' + String(v.getMonth()+1).padStart(2,'0');
    }
    const d = String(v).trim();
    const m = d.match(/^(\d{4})-(\d{2})/);
    return m ? m[1] + '-' + m[2] : null;
  }

  const initMonth = getMonth(actualInit);
  const finalMonth = getMonth(actualFinal);

  if (initMonth === '2026-06' || finalMonth === '2026-06') {
    count++;
    const vInit = actualInit instanceof Date ? actualInit.toISOString().substring(0,10) : String(actualInit);
    const vFinal = actualFinal instanceof Date ? actualFinal.toISOString().substring(0,10) : String(actualFinal);
    console.log('');
    console.log(count + '. ' + name);
    console.log('   实际初验: ' + (vInit || '(空)') + ' | 实际终验: ' + (vFinal || '(空)'));
    console.log('   命中: ' + (finalMonth === '2026-06' ? '实际终验在6月' : '实际初验在6月'));
  }
}

console.log('');
console.log('========================================');
console.log('共筛选出 ' + count + ' 项');
console.log('========================================');

// Also check: are these dates stored as Date objects or strings?
console.log('');
console.log('=== 数据类型验证 ===');
let dateCount = 0, strCount = 0, numCount = 0;
for (let i = 1; i < rows.length; i++) {
  const v = rows[i][36];
  if (v instanceof Date) dateCount++;
  else if (typeof v === 'string') strCount++;
  else if (typeof v === 'number') numCount++;
}
console.log('实际终验列数据类型: Date=' + dateCount + ', String=' + strCount + ', Number=' + numCount);

// Show how 1659600 maps to a date
console.log('');
console.log('=== Excel序列号-日期换算验证 ===');
function excelSerialToDate(serial) {
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().substring(0,10);
}
console.log('1659600 -> ' + excelSerialToDate(1659600));
console.log('15250000 -> ' + excelSerialToDate(15250000));
console.log('865590 -> ' + excelSerialToDate(865590));
console.log('2755000 -> ' + excelSerialToDate(2755000));
console.log('81000 -> ' + excelSerialToDate(81000));
