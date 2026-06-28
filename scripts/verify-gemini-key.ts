/** Minimal text-only generateContent test to verify the key/quota cheaply. */
import "dotenv/config";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  if (!key) { console.log("FAIL: no GEMINI_API_KEY"); process.exit(1); }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const body = { contents: [{ parts: [{ text: "Reply with exactly: OK" }] }], generationConfig: { temperature: 0 } };
  const t = Date.now();
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json: any = await res.json();
  const dt = ((Date.now() - t) / 1000).toFixed(1);
  if (res.ok) {
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "(empty)";
    console.log(`SUCCESS (${dt}s) model=${model} reply=${JSON.stringify(text.trim())}`);
  } else {
    console.log(`FAIL ${res.status} (${dt}s): ${JSON.stringify(json).slice(0, 300)}`);
  }
}
main().catch((e) => { console.log("ERROR:", String(e).slice(0, 200)); process.exit(1); });
