const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1, defval: '', raw: false, dateNF: 'yyyy-mm-dd' });

// Check column headers for 35,36,37 (0-based: 35=actualFinal, 36=actualFinal raw)
const headers = rows[0];
console.log('Column 36 header:', headers[35]);
console.log('Column 37 header:', headers[36]);
console.log('Column 38 header:', headers[37]);

// Read raw cells to see actual values
const wbRaw = read(file, { type: 'array', raw: true });
const wsRaw = wbRaw.Sheets[wbRaw.SheetNames[0]];

// Show first 5 rows for key columns
console.log('\nColumn values for first 10 data rows:');
console.log('Row | 实际初验(36) | 实际终验(37)');
console.log('--- | ------------- | ------------');
for (let i = 1; i <= Math.min(10, Object.keys(wsRaw).length > 50 ? 10 : 10); i++) {
  const row = rows[i] || [];
  // use letter references: column AJ=36, AK=37 (1-based)
  // A=1, so 36 = AJ, 37 = AK
  console.log(` ${i}  | ${row[36] || '(empty)'} | ${row[37] || '(empty)'}`);
}
