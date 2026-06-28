const fs = require('fs');
let c = fs.readFileSync('scripts/import-all-pdfs.ts', 'utf8');
const lines = c.split('\n');
// Line 72 (0-indexed: 71) has a broken template literal with regex
// Replace it with a safe string concatenation
lines[71] = '    pdfjsMod.GlobalWorkerOptions.workerSrc = "file:///" + wp.split("\\\\").join("/");';
c = lines.join('\n');
fs.writeFileSync('scripts/import-all-pdfs.ts', c, 'utf8');
console.log('Fixed line 72:', lines[71]);
