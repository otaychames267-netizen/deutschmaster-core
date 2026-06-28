async function main() {
  const fs = require('fs');
  const { createRequire } = require('module');
  const req = createRequire(__filename);
  const { createCanvas } = require('canvas');

  const pdfjsMod = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = req.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjsMod.GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.replace(/\\/g, '/');

  const bytes = fs.readFileSync('C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 1.pdf');
  const pdf = await pdfjsMod.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await pdf.getPage(1);

  const opList = await page.getOperatorList();
  console.log('op list done');

  // Try to get the XObject image from page.objs
  const imgKey = 'img_p0_1';
  console.log('page.objs type:', page.objs.constructor.name);

  // Try get
  try {
    const imgData = await new Promise((resolve, reject) => {
      page.objs.get(imgKey, resolve);
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    console.log('imgData type:', typeof imgData);
    console.log('imgData keys:', imgData ? Object.keys(imgData).slice(0, 10) : 'null');
    if (imgData && imgData.data) {
      console.log('Has raw data! width:', imgData.width, 'height:', imgData.height, 'data length:', imgData.data.length);
    }
    if (imgData && imgData.bitmap) {
      console.log('Has bitmap:', imgData.bitmap.constructor?.name);
    }
  } catch (e) {
    console.log('Failed to get img via callback:', e.message);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
