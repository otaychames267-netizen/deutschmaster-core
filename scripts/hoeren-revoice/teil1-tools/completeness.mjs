// usage (cwd = work dir): node completeness.mjs [slug ...]      (no slug = every <slug>.final.m4a in the folder)
// Is anything of the ORIGINAL recording missing from the re-voiced one? The per-chunk QA only compares the new audio with OUR transcript;
// if that transcript skipped a passage, the new audio skips it too and the QA cannot see it. This transcribes the original with an
// independent ASR (DeepInfra Whisper) and looks for runs of >= 20 consecutive words that appear nowhere in the script text.
// Teacher-tag talk (Orhan Yigit, channel, "abonnier…") is dropped on purpose and ignored here. Costs a few cents in total.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const env = {}; for (const l of fs.readFileSync("C:/Users/asus/AuraLingovia/muendlich-relay/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/); if (m) env[m[1]] = m[2]; }
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(".").filter((f) => f.endsWith(".final.m4a")).map((f) => f.replace(/\.final\.m4a$/, ""));
const TAG = /orhan|yigit|jigit|youtube|kanal|abonnier|deutschlehrer|beitr[aä]g/i;
const norm = (s) => s.toLowerCase().replace(/[^a-zäöüß0-9\s]/g, " ").split(/\s+/).filter(Boolean);
// numbers are spelled differently by every ASR ("500" / "fünfhundert"): ignore digit tokens and a few number words
const NUMW = /^(null|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|hundert|tausend|und)$/;

async function whisper(slug) {
  const mp3 = `cmp-${slug}.mp3`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", `src/${slug}.m4a`, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", mp3]);
  for (let a = 1; a <= 3; a++) {
    const form = new FormData(); form.append("file", new Blob([fs.readFileSync(mp3)], { type: "audio/mpeg" }), "a.mp3");
    form.append("model", "openai/whisper-large-v3-turbo"); form.append("language", "de"); form.append("temperature", "0");
    try {
      const r = await fetch("https://api.deepinfra.com/v1/openai/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.DEEPINFRA_API_KEY}` }, body: form, signal: AbortSignal.timeout(240000) });
      if (r.ok) { fs.unlinkSync(mp3); return (await r.json()).text ?? ""; }
      console.log(`  ${slug}: ASR ${r.status}`);
    } catch (e) { console.log(`  ${slug}: ASR ${String(e.message).slice(0, 60)}`); }
    await new Promise((x) => setTimeout(x, 4000 * a));
  }
  fs.unlinkSync(mp3); return "";
}

let bad = 0;
for (const slug of slugs) {
  const script = JSON.parse(fs.readFileSync(`${slug}.script.json`, "utf8"));
  const have = new Set(script.items.flatMap((i) => norm(i.text)));
  const text = await whisper(slug);
  if (!text) { console.log(`${slug}: no ASR text — NOT CHECKED`); bad++; continue; }
  fs.writeFileSync(`${slug}.whisper.txt`, text); // kept for a closer look at a flagged file
  const w = norm(text).filter((x) => !/^\d/.test(x) && !NUMW.test(x));
  // Word membership alone is useless (common German words are everywhere): a word counts as present only when its
  // neighbour pair (previous or next word) is also in the script, i.e. it sits inside a shared 2-gram. A transcript that
  // paraphrased or invented a passage ("In den Alten …", "FC Neustadt" for "FC Riedlingen") then shows up as a low coverage.
  const sw = script.items.flatMap((i) => norm(i.text).filter((x) => !/^\d/.test(x) && !NUMW.test(x)));
  const pairs = new Set(); for (let i = 0; i + 1 < sw.length; i++) pairs.add(sw[i] + " " + sw[i + 1]);
  const present = w.map((x, i) => (i > 0 && pairs.has(w[i - 1] + " " + x)) || (i + 1 < w.length && pairs.has(x + " " + w[i + 1])));
  const cover = present.filter(Boolean).length / Math.max(1, w.length);
  // longest stretch of words absent from the script, tolerating a few hits (ASR spelling noise)
  let worst = { len: 0, at: 0 };
  for (let i = 0; i + 20 <= w.length; i++) {
    let absent = 0; for (let k = 0; k < 20; k++) if (!present[i + k]) absent++;
    if (absent >= 14) { let j = i + 20; while (j < w.length && !present[j]) j++; const len = j - i; if (len > worst.len) worst = { len, at: i }; i = j; }
  }
  const sample = worst.len ? w.slice(worst.at, worst.at + Math.min(worst.len, 24)).join(" ") : "";
  const tagged = sample && TAG.test(w.slice(Math.max(0, worst.at - 5), worst.at + worst.len + 5).join(" "));
  const flag = worst.len >= 20 && !tagged;
  if (flag) bad++;
  console.log(`${slug.padEnd(34)} coverage ${(100 * cover).toFixed(1)}%  words ${w.length}  longest gap ${worst.len}${flag ? "  <== MISSING? \"" + sample + "…\"" : tagged ? "  (teacher tag, dropped on purpose)" : ""}`);
}
console.log(`\n${slugs.length} file(s), ${bad} to look at`);
