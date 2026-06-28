import "dotenv/config";
import sharp from "sharp";
import { extractPageImagePng } from "../src/lib/import/gemini-vision.js";

async function main() {
  const pdf = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen\\lesen teil 2 (1).pdf";
  const native = await extractPageImagePng(pdf, 15);
  const nm = await sharp(native).metadata();
  console.log(`native page 15: ${nm.width}x${nm.height}, ${(native.length/1024/1024).toFixed(2)} MB`);
  for (const scale of [1, 2, 3]) {
    const up = await sharp(native).resize({ width: Math.round((nm.width ?? 1200) * scale) }).png().toBuffer();
    console.log(`  ${scale}x → ${(up.length/1024/1024).toFixed(2)} MB`);
  }
  // Raw call at 2x
  const img = await sharp(native).resize({ width: Math.round((nm.width ?? 1200) * 2) }).sharpen().png().toBuffer();
  const key = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const prompt = "Transcribe the German article body on this page verbatim (no questions). Return JSON {\"article\": string}.";
  const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/png", data: img.toString("base64") } }] }], generationConfig: { temperature: 0, response_mime_type: "application/json" } };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json: any = await res.json();
  console.log("\nHTTP", res.status);
  console.log("raw:", JSON.stringify(json).slice(0, 500));
}
main().catch((e) => { console.error(e); process.exit(1); });
