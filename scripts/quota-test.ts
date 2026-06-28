import "dotenv/config";
import { extractPageImagePng, classifyT2Page } from "../src/lib/import/gemini-vision.js";

async function main() {
  const png = await extractPageImagePng("C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 2 (1).pdf", 3);
  const t = Date.now();
  try {
    const r = await classifyT2Page(png.toString("base64"), 3);
    console.log(`OK in ${((Date.now() - t) / 1000).toFixed(1)}s role=${r.role} hl=${JSON.stringify(r.article_headline)} textlen=${r.article_text?.length || 0}`);
  } catch (e) {
    console.log("FAIL:", String(e).slice(0, 250));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
