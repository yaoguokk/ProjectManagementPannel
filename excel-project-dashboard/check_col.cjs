const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });

const headers = rows[0];

// Print headers from column 30 onwards (0-based)
console.log('=== Headers from column 30 onwards ===');
for (let i = 30; i < headers.length; i++) {
  console.log(`  [${i}] ${headers[i]}`);
}

// Check: is column 37 actually a date? Let's see all unique value types
console.log('\n=== Column 37 (项目实际终验时间) value samples ===');
const vals = {};
for (let i = 1; i < rows.length; i++) {
  const v = rows[i][37];
  if (v === '' || v === undefined) {
    vals['(empty)'] = (vals['(empty)']||0)+1;
  } else if (typeof v === 'number') {
    vals['number:'+v] = (vals['number:'+v]||0)+1;
  } else if (typeof v === 'string' && v.match(/^\d{4}-\d{2}/)) {
    vals['date:string'] = (vals['date:string']||0)+1;
  } else {
    vals['other:'+String(v).substring(0,20)] = (vals['other:'+String(v).substring(0,20)]||0)+1;
  }
}
Object.entries(vals).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v]) => console.log(`  ${k}: ${v} rows`));

// Also check column 38 (立项收入)
console.log('\n=== Column 38 (立项收入) value samples ===');
const vals38 = {};
for (let i = 1; i < rows.length; i++) {
  const v = rows[i][38];
  if (v === '' || v === undefined) vals38['(empty)'] = (vals38['(empty)']||0)+1;
  else if (typeof v === 'number') vals38['number'] = (vals38['number']||0)+1;
  else vals38['other:'+String(v).substring(0,20)] = (vals38['other:'+String(v).substring(0,20)]||0)+1;
}
Object.entries(vals38).forEach(([k,v]) => console.log(`  ${k}: ${v} rows`));

// Check if column 37 values match column 38 (立项收入)
let matchCount = 0, totalChecked = 0;
for (let i = 1; i < rows.length; i++) {
  const v37 = rows[i][37];
  const v38 = rows[i][38];
  if (v37 && v38 && typeof v37 === 'number' && typeof v38 === 'number') {
    totalChecked++;
    if (Math.abs(v37 - v38) < 1) matchCount++;
  }
}
console.log(`\n=== Column 37 vs Column 38 comparison ===`);
console.log(`Matching values: ${matchCount}/${totalChecked}`);
