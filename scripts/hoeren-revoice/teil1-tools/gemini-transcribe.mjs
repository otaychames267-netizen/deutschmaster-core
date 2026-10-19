// usage: node gtrans.mjs <audio file> [model]  -> verbatim German transcript from Gemini (audio understanding)
import fs from "node:fs";
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/muendlich-relay/.env", "C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !env[m[1]]) env[m[1]] = m[2]; }
const [file, model = "gemini-3.5-flash"] = process.argv.slice(2);
const mime = file.endsWith(".mp3") ? "audio/mpeg" : file.endsWith(".wav") ? "audio/wav" : "audio/mp4";
const data = fs.readFileSync(file).toString("base64");
const t0 = Date.now();
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: "POST", headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" }, signal: AbortSignal.timeout(170000),
  body: JSON.stringify({ contents: [{ parts: [{ inlineData: { mimeType: mime, data } }, { text: "Transkribiere diese deutsche Audioaufnahme vollständig und wörtlich (nichts weglassen, nichts hinzufügen, keine Zusammenfassung). Gib nur den Text aus." }] }], generationConfig: { temperature: 0 } }) });
const j = await r.json();
console.log(model, r.status, Date.now() - t0, "ms");
console.log(j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? JSON.stringify(j).slice(0, 400));
