/**
 * Probe: render N pages of a scanned PDF to PNG and ask Gemini to describe
 * the structure of each (what TELC exercise element is on the page).
 * Read-only. No DB. Proves vision extraction works before building the pipeline.
 */
import { readFile } from "fs/promises";
import { createCanvas } from "canvas";
import "dotenv/config";

const KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-2.5-flash";

// Extract the largest embedded image (the full-page scan) from a PDF page.
async function renderPagePng(pdfPath: string, pageNum: number): Promise<Buffer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string) as any;
  const bytes = await readFile(pdfPath);
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await pdf.getPage(pageNum);
  const XOBJ = pdfjs.OPS?.paintImageXObject ?? 85;
  const opList = await page.getOperatorList();

  const keys: string[] = [];
  for (let j = 0; j < opList.fnArray.length; j++) {
    if (opList.fnArray[j] === XOBJ && opList.argsArray[j]?.[0]) {
      const k = opList.argsArray[j][0];
      if (!keys.includes(k)) keys.push(k);
    }
  }

  let best: any = null;
  for (const key of keys) {
    const img: any = await new Promise((resolve) => {
      page.objs.get(key, resolve);
      setTimeout(() => resolve(null), 8000);
    });
    if (img?.data && img.width && img.height) {
      if (!best || img.width * img.height > best.width * best.height) best = img;
    }
  }
  if (!best) throw new Error(`No image found on page ${pageNum}`);

  const nPixels = best.width * best.height;
  const channels = Math.round(best.data.length / nPixels);
  const rgba = new Uint8ClampedArray(nPixels * 4);
  if (channels === 4) {
    rgba.set(best.data);
  } else if (channels === 3) {
    for (let k = 0; k < nPixels; k++) {
      rgba[k*4] = best.data[k*3]; rgba[k*4+1] = best.data[k*3+1];
      rgba[k*4+2] = best.data[k*3+2]; rgba[k*4+3] = 255;
    }
  } else {
    for (let k = 0; k < nPixels; k++) {
      rgba[k*4] = rgba[k*4+1] = rgba[k*4+2] = best.data[k]; rgba[k*4+3] = 255;
    }
  }
  const canvas = createCanvas(best.width, best.height);
  const ctx = canvas.getContext("2d") as any;
  const id = ctx.createImageData(best.width, best.height);
  id.data.set(rgba);
  ctx.putImageData(id, 0, 0);
  return canvas.toBuffer("image/png");
}

async function askGemini(pngB64: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/png", data: pngB64 } },
      ],
    }],
    generationConfig: { temperature: 0 },
  };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json: any = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no text)";
}

async function main() {
  const pdfPath = process.argv[2];
  const pages = (process.argv[3] ?? "1,2,3").split(",").map((n) => parseInt(n));
  const prompt = `You are looking at one page of a scanned TELC B2 German "Lesen Teil 2" study booklet.
Ignore the repeated section label "Telc Leseverstehen, Teil 2" and any Arabic text, QR codes, or watermarks — those are NOT the exercise title.
Report ONLY what is actually printed, concisely:
1. ARTICLE HEADLINE: the bold/large printed title of the German article itself (e.g. a topic name). Quote it exactly, or "not present".
2. Page role: ARTICLE / QUESTIONS / ANSWER-KEY (Lösungsschlüssel) / TABLE-OF-CONTENTS / COVER / OTHER.
3. If QUESTIONS: how many and how many options each.
4. If ANSWER-KEY: quote every answer pairing you can read (e.g. "6=b, 7=a ...").
Do NOT invent anything.`;

  for (const p of pages) {
    console.log(`\n═══════════ PAGE ${p} ═══════════`);
    const png = await renderPagePng(pdfPath, p);
    const b64 = png.toString("base64");
    const out = await askGemini(b64, prompt);
    console.log(out);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
