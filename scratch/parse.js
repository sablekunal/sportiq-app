const xlsx = require('xlsx');

const filePath = 'c:\\Users\\parsh\\Desktop\\Projects\\sportiq-app\\teams\\Copy of SXY Throwball Tournament Team & Player Details 2026.xlsx';
const workbook = xlsx.readFile(filePath);

const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

const fs = require('fs');
fs.writeFileSync('scratch/data.json', JSON.stringify(data, null, 2), 'utf8');
