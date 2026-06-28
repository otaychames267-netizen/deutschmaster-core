import "dotenv/config";
import { extractPageImagePng } from "../src/lib/import/gemini-vision.js";
import { createWorker } from "tesseract.js";
import { createCanvas, loadImage } from "canvas";

async function main() {
  const pdf = process.argv[2];
  const pages = (process.argv[3] ?? "1,2").split(",").map(Number);
  const worker = await createWorker(["deu", "eng"], 1, { logger: () => {} });
  for (const p of pages) {
    const png = await extractPageImagePng(pdf, p);
    const img = await loadImage(png);
    const c = createCanvas(img.width * 2, img.height * 2);
    (c.getContext("2d") as any).drawImage(img, 0, 0, img.width * 2, img.height * 2);
    const { data } = await worker.recognize(c.toBuffer("image/png"));
    console.log(`\n═══ PAGE ${p} (conf=${data.confidence?.toFixed(0)}) ═══`);
    console.log(data.text.split("\n").map((l) => l.trim()).filter(Boolean).join("\n"));
  }
  await worker.terminate();
}
main().catch((e) => { console.error(e); process.exit(1); });
