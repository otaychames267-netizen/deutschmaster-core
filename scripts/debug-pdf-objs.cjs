async function main() {
  const fs = require('fs');
  const { createRequire } = require('module');
  const req = createRequire(__filename);

  const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = req.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjsMod.GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.replace(/\\/g, '/');

  const bytes = fs.readFileSync('C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 1.pdf');
  const pdf = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await pdf.getPage(1);

  // Get operator list to trigger image loading
  const opList = await page.getOperatorList();
  console.log('op list done');

  // Try to access page objs
  console.log('page keys:', Object.keys(page).filter(k => !k.startsWith('_')));
  console.log('page objs:', typeof page.objs);

  // Try commonObjs
  if (page.commonObjs) {
    console.log('commonObjs type:', typeof page.commonObjs);
  }

  // Try the internal _objs
  const internalKeys = Object.keys(page).filter(k => k.startsWith('_'));
  console.log('internal keys:', internalKeys.slice(0, 10));

  // Check if we can get the image via workaround
  const transport = page._transport;
  if (transport) {
    console.log('transport keys:', Object.keys(transport).filter(k => !k.startsWith('_')).slice(0, 10));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
