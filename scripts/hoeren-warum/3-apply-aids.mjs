// 3-apply-aids — part of the Hören audio-grounded "Warum?" pipeline (2026-10-13). Order: 1) transcribe  2) gen-aids  3) apply-aids  (then verify-evidence-substrings.mjs).
// Work files (transcripts, generated explanations, backups) live in scripts/hoeren-warum/work/ (git-ignored) — override with HOEREN_WORK_DIR.
// Dry run by default; --apply writes hoeren_exercises.learning_aids (+ hoeren_transcripts), backs up the previous learning_aids and writes review.md for the held-back statements.
import { fileURLToPath } from "node:url";
const WORK = (process.env.HOEREN_WORK_DIR ?? fileURLToPath(new URL("./work/", import.meta.url))).split(String.fromCharCode(92)).join("/").replace(/[/]*$/, "/");
// Writes the generated audio-grounded explanations into hoeren_exercises.learning_aids (+ the transcripts into hoeren_transcripts).
// usage: node hoeren-apply-aids.mjs [--apply] [--only id,id]    (dry run by default). Backs up every learning_aids it touches to aids-backup.json first.
// Publishable statements get the new audio-based item; statements that failed a check (key vs audio, quote not verbatim, ...) lose their old generic
// item (no Warum is better than a wrong one) and are listed in review.md for the owner. `translation` and every other key are kept.
import fs from "node:fs";
const SP = WORK;
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const APPLY = process.argv.includes("--apply"); const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
const rest = async (path, opt = {}) => { const r = await fetch(env.SUPABASE_URL + "/rest/v1/" + path, { ...opt, headers: { ...H, ...(opt.headers ?? {}) } }); const t = await r.text(); if (!r.ok) throw new Error(`${path} ${r.status} ${t.slice(0, 200)}`); return t ? JSON.parse(t) : null; };

const bold = (quote, kp) => { const i = kp ? quote.toLowerCase().indexOf(kp.toLowerCase()) : -1; return i < 0 ? quote : quote.slice(0, i) + "**" + quote.slice(i, i + kp.length) + "**" + quote.slice(i + kp.length); };
const files = fs.readdirSync(SP + "hoeren-aids").filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(SP + "hoeren-aids/" + f, "utf8"))).filter((a) => !only || only.includes(a.id));
const backupPath = SP + "aids-backup.json"; const backup = fs.existsSync(backupPath) ? JSON.parse(fs.readFileSync(backupPath, "utf8")) : {};
let pub = 0, flagged = 0, touched = 0; const review = [];
for (const a of files) {
  const cur = (await rest(`hoeren_exercises?id=eq.${a.id}&select=learning_aids,title,level,teil`))[0]; if (!cur) { console.log("missing exercise", a.id); continue; }
  if (!(a.id in backup)) backup[a.id] = cur.learning_aids ?? null;
  const aids = JSON.parse(JSON.stringify(cur.learning_aids ?? {})); aids.items = aids.items ?? {};
  for (const it of Object.values(a.items)) {
    if (it.publishable) {
      aids.items[it.n] = { audio_start: Math.round(it.start * 10) / 10, audio_end: Math.round(it.end * 10) / 10, evidence_text: bold(it.evidence_quote, it.key_phrase), evidence_translation: it.quote_translation_ar, explanation_correct: it.explanation_correct_ar, explanation_wrong: it.explanation_wrong_ar, keyword: it.merke_de };
      pub++;
    } else { delete aids.items[it.n]; flagged++; review.push(`- **${a.level} Teil ${a.teil} — ${a.title}** · statement ${it.n} (key: ${it.key}${it.blind ? `, blind: ${it.blind}` : ""}): ${it.statement}\n  - ${it.flags.join("\n  - ")}`); }
  }
  if (APPLY) {
    const tr = JSON.parse(fs.readFileSync(SP + "hoeren-t/" + a.id + ".json", "utf8"));
    await rest("hoeren_transcripts?on_conflict=exercise_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ exercise_id: a.id, audio_path: tr.audio_path, model: "openai/whisper-large-v3", duration_s: tr.duration, text: tr.text, segments: tr.segments }) });
    await rest(`hoeren_exercises?id=eq.${a.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ learning_aids: aids }) });
    touched++;
  }
}
if (APPLY) fs.writeFileSync(backupPath, JSON.stringify(backup));
fs.writeFileSync(SP + "review.md", `# Hören audio-Warum — statements NOT published (needs a look)\n\n${review.join("\n\n") || "(none)"}\n`);
console.log(`${APPLY ? "APPLIED" : "DRY RUN"}: ${files.length} exercises, ${pub} statements published, ${flagged} held back${APPLY ? `, ${touched} exercises updated` : ""}`);
