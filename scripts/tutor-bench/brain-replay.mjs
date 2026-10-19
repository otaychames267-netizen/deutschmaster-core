// Offline replay of the 11 Claude-written AI turns of Amal's REAL session (2026-10-12) against backup models, through the relay's own generateTutorReply (same system prompt, guards, cut rules).
// usage (from muendlich-relay/): node --import tsx <this file> "<model1>" "<model2>" ...   → writes bench-brain.json next to this file
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const RELAY = "C:/Users/asus/AuraLingovia/muendlich-relay/src/voice/tutorBrain.ts";
const { generateTutorReply } = await import(pathToFileURL(RELAY).href);
for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
process.env.ANTHROPIC_API_KEY = ""; // no Claude credit → the real code falls to the backup chain
const D = "C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus-AuraLingovia/6ec46fa6-1f81-4947-8f36-2311127c6930/scratchpad/matthias/";
const data = JSON.parse(fs.readFileSync(D + "amal-session.json", "utf8")); const nodes = data.nodes;
const NAME = data.name, W = 40;
const mat = (t) => data.materials.find((m) => m.teil === t); const fmt = (m) => (m.body_text ? `${m.title} (${m.body_text})` : m.title);
const ctxFor = (stage, partner) => ({ studentName: NAME, level: "B2", teil1Topic: fmt(mat(1)), teil2Topic: fmt(mat(2)), teil3Topic: fmt(mat(3)), stage, partner, counts: { teil1: 2, teil2: 5, teil3: 6 } });
const ord = ["", "erste", "zweite", "dritte"];
// the AI turns the model actually generated (examiner questions Teil 1; partner contributions Teil 2 + 3); transitions/announcements are scripted
const aiIdx = [12, 19, 27, 30, 36, 38, 46, 50, 55, 60, 63];
const turns = []; const seen = { 1: 0, 2: 0, 3: 0 };
for (const idx of aiIdx) {
  const n = nodes[idx]; const teil = n.teil; const k = ++seen[teil]; const partner = n.speaker === "partner";
  let text;
  if (teil === 1) text = `${k === 1 ? "Die Präsentationszeit ist um." : "Die Antwortzeit ist um."} Stellen Sie ${NAME} jetzt Ihre ${ord[k]}${k === 2 ? " und letzte" : ""} Frage zur Präsentation — ${k === 2 ? "eine andere Art von Frage als die vorherigen, " : ""}konkret bezogen auf das, was ${NAME} tatsächlich gesagt hat. ${NAME} hat maximal ${W} Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`;
  else if (teil === 2) text = `Bringen Sie jetzt Ihren nächsten Gesprächsbeitrag zum Thema (Beitrag ${k} von 5) — als Partner, nicht als Prüfer.${k === 1 ? " Das ist der erste Beitrag: Eröffnen Sie das Gespräch." : ""} ${NAME} hat maximal ${W} Sekunden Zeit zu reagieren — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`;
  else text = `Bringen Sie jetzt Ihren nächsten Gesprächsbeitrag zur gemeinsamen Planung (Beitrag ${k} von 6) — als Partner, nicht als Prüfer. ${NAME} hat maximal ${W} Sekunden Zeit zu reagieren — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`;
  turns.push({ idx, teil, k, partner, trigger: { type: "system", text: `[SYSTEM] ${text}` }, claude: n.text, history: nodes.slice(0, idx).filter((x) => !(x.speaker === "examiner" && x.teil !== teil && false)).map((x) => ({ speaker: x.speaker, text: x.text, stage: x.teil })) });
}
const models = process.argv.slice(2);
const out = fs.existsSync(D + "bench-brain.json") ? JSON.parse(fs.readFileSync(D + "bench-brain.json", "utf8")) : { turns: turns.map((t) => ({ idx: t.idx, teil: t.teil, k: t.k, partner: t.partner, claude: t.claude, replies: {} })) };
const warns = []; const origWarn = console.warn; console.warn = (...a) => { warns.push(a.join(" ").slice(0, 160)); };
async function runModel(model) {
  process.env.TUTOR_FALLBACK_MODELS = `${model},${model}`;
  for (const [i, t] of turns.entries()) {
    if (out.turns[i].replies[model]) continue;
    const t0 = Date.now(); let first = null; const chunks = []; warns.length = 0;
    try {
      const text = await generateTutorReply(ctxFor(t.teil, t.partner), t.history, t.trigger, { onChunk: (c) => { if (first === null) first = Date.now() - t0; chunks.push(c); } });
      out.turns[i].replies[model] = { text: chunks.join(" ").trim() || text, firstMs: first, totalMs: Date.now() - t0, rejected: warns.length };
    } catch (e) { out.turns[i].replies[model] = { error: String(e.message ?? e).slice(0, 120), totalMs: Date.now() - t0 }; }
    fs.writeFileSync(D + "bench-brain.json", JSON.stringify(out, null, 1));
  }
  console.log("done", model);
}
await Promise.all(models.map(runModel));
process.exit(0);
