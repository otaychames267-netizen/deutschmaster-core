import "dotenv/config";
import { extractPageImagePng, extractT2Exercise } from "../src/lib/import/gemini-vision.js";

const pdf = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 2 (1).pdf";
async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now(); process.stdout.write(`${label}… `);
  const r = await fn(); console.log(`${((Date.now() - t) / 1000).toFixed(1)}s`); return r;
}
async function main() {
  const imgs: string[] = [];
  for (const pg of [43, 44]) {
    const png = await step(`extract page ${pg}`, () => extractPageImagePng(pdf, pg));
    imgs.push(png.toString("base64"));
  }
  const ex = await step("Gemini extract", () => extractT2Exercise(imgs));
  console.log(`RESULT: title=${JSON.stringify(ex.title)} q=${ex.questions?.length} key=${ex.answer_key?.length}`);
}
main().catch((e) => { console.error("ERR", String(e).slice(0, 200)); process.exit(1); });
