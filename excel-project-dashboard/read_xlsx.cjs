const { read, utils } = require('xlsx');
const { readFileSync } = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', '经营项目台账明细列表_20260713140420000.xlsx');
const file = readFileSync(filePath);
const wb = read(file, { type: 'array' });

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  console.log(`=== Sheet: ${sheetName} ===`);
  console.log(`Total rows (including header): ${rows.length}`);
  
  if (rows.length > 0) {
    console.log('\n--- 表头 (所有列) ---');
    rows[0].forEach((cell, idx) => {
      if (cell !== '') {
        console.log(`  [${idx + 1}] ${cell}`);
      }
    });
    
    if (rows.length > 1) {
      console.log('\n--- 示例数据 (第2行) ---');
      rows[1].forEach((cell, idx) => {
        if (cell !== '') {
          console.log(`  [${idx + 1}] ${rows[0][idx]}: ${cell}`);
        }
      });
    }
  }
}
