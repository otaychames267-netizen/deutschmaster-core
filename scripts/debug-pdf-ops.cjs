// Debug: check what operator codes pdfjs finds in scanned PDF page 1
async function main() {
  const { createRequire } = require('module');
  const req = createRequire(__filename);
  const pdfPath = 'C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 1.pdf';
  const fs = require('fs');

  const pdfjsPath = require.resolve('pdfjs-dist/legacy/build/pdf.mjs').replace(/\\/g, '/');
  console.log('pdfjs path:', pdfjsPath);

  // Use dynamic import
  const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.mjs');

  try {
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsMod.GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.replace(/\\/g, '/');
    console.log('Worker set:', pdfjsMod.GlobalWorkerOptions.workerSrc.slice(0, 60));
  } catch (e) {
    console.log('Worker setup failed:', e.message);
  }

  const bytes = fs.readFileSync(pdfPath);
  const pdf = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  console.log('Pages:', pdf.numPages);

  const page = await pdf.getPage(1);
  const opList = await page.getOperatorList();

  console.log('Operator list length:', opList.fnArray.length);
  const fnCounts = {};
  opList.fnArray.forEach(fn => { fnCounts[fn] = (fnCounts[fn] || 0) + 1; });
  console.log('Operator counts:', fnCounts);

  // Show args for image-related operators
  const IMAGE_OPS = [85, 86, 87, 88]; // paintImageXObject variants
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (IMAGE_OPS.includes(opList.fnArray[i])) {
      const args = opList.argsArray[i];
      console.log(`Op ${opList.fnArray[i]} at ${i}:`, typeof args, args ? JSON.stringify(args[0])?.slice(0, 100) : 'null');
    }
  }

  // Also check OPS object
  console.log('OPS.paintImageXObject:', pdfjsMod.OPS?.paintImageXObject);
  console.log('OPS.paintInlineImageXObject:', pdfjsMod.OPS?.paintInlineImageXObject);
}

main().catch(e => { console.error(e); process.exit(1); });
