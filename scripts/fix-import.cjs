const fs = require('fs');
let c = fs.readFileSync('scripts/import-all-pdfs.ts', 'utf8');
const lines = c.split('\n');

// Find the broken split call (spans two lines due to literal newline)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const rawLines = text.split("') && !lines[i].includes('\\n')) {
    // This line has a literal newline in the string — merge and fix
    lines[i] = '    const rawLines = text.split("\\n");';
    if (lines[i + 1] && lines[i + 1].trim() === '");') {
      lines.splice(i + 1, 1);
    }
    console.log('Fixed line', i + 1, ':', lines[i]);
    break;
  }
}

fs.writeFileSync('scripts/import-all-pdfs.ts', lines.join('\n'), 'utf8');
console.log('Done');
