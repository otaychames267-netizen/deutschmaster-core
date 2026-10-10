// Probe: Gemini TTS over the Interactions API with stream:true (docs: audio arrives as step.delta events) — time to first audio chunk.
import { readFileSync } from "node:fs";
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const model = process.argv[2] ?? "gemini-3.8-flash-lite-tts"; const voice = process.argv[3] ?? "Kore";
const text = process.argv[4] ?? "Amira, warum war die Architektur in Barcelona für Sie besonders beeindruckend?";
const variants = { textParts: [{ type: "text", text }], plainString: text, contentRole: [{ role: "user", content: [{ type: "text", text }] }] };
for (const [name, input] of Object.entries(variants)) {
  const t0 = Date.now();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse&key=${process.env.GEMINI_API_KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, stream: true, input, response_format: { type: "audio" }, generation_config: { speech_config: [{ voice }] } }) });
  if (!r.ok) { console.log(name.padEnd(12), r.status, (await r.text()).slice(0, 260).replace(/\s+/g, " ")); await new Promise((x) => setTimeout(x, 8000)); continue; }
  const rd = r.body.getReader(); const dec = new TextDecoder(); let buf = "", first = null, bytes = 0, events = 0, types = new Set();
  for (;;) { const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true }); let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line.startsWith("data:")) continue; let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; } events++; types.add(ev.event_type + (ev.delta?.type ? ":" + ev.delta.type : "")); if (ev.event_type === "step.delta" && ev.delta?.type === "audio") { if (first === null) first = Date.now() - t0; bytes += Buffer.byteLength(ev.delta.data, "base64"); } } }
  console.log(name.padEnd(12), `OK | first audio ${first}ms | total ${Date.now() - t0}ms | audio ${(bytes / 48000).toFixed(1)}s | events ${events} | types ${[...types].join(",")}`);
  break;
}
process.exit(0);
