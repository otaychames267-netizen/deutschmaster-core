// usage (cwd = work dir): node t1-retry.mjs <slug> [--live] [--max N]
// A QA-flagged build (t1-run exit 2) is almost always ONE chunk the voice model mangled (typically the announcer's
// instruction text with its last sentence dropped). The synthesis cache would hand back the same bad audio, so this
// deletes the cache entries of exactly the chunks `<slug>.qa.log` marks "<== CHECK", rebuilds the file (only those chunks
// are synthesized again — the rest comes from the cache) and re-runs QA. Repeats up to N times (default 4); Gemini Live is
// not deterministic, a fresh take usually passes. Exit codes as t1-run: 0 QA ok (built, not applied), 2 still flagged, else error.
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2), slug = args[0];
const max = Number(args[args.indexOf("--max") + 1]) || 4;
if (!slug) { console.log("usage: node t1-retry.mjs <slug> [--live] [--max N]"); process.exit(1); }
const T = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const frag = (() => { const m = JSON.parse(fs.readFileSync(`${slug}.meta.json`, "utf8")); return m.audioPath ?? m.audio_path ?? m.file ?? null; })();

function flaggedChunkIndexes() {
  return fs.readFileSync(`${slug}.qa.log`, "utf8").split("\n")
    .map((l) => l.match(/^\s*chunk (\d+) \[.*<== CHECK/)).filter(Boolean).map((m) => Number(m[1]));
}

for (let attempt = 1; attempt <= max; attempt++) {
  const idx = flaggedChunkIndexes();
  if (idx.length === 0) { console.log(`${slug}: nothing flagged`); process.exit(0); }
  const speech = JSON.parse(fs.readFileSync(`${slug}.timeline.json`, "utf8")).filter((e) => e.kind === "speech");
  const script = JSON.parse(fs.readFileSync(`${slug}.script.json`, "utf8"));
  let removed = 0;
  for (const i of idx) {
    const e = speech[i]; if (!e) continue;
    const key = crypto.createHash("sha1").update(`${script.provider}|${script.voices[e.voice]}|${e.text}`).digest("hex");
    const f = `cache/${key}.pcm`;
    if (fs.existsSync(f)) { fs.unlinkSync(f); removed++; }
  }
  console.log(`${slug}: attempt ${attempt}/${max} — flagged chunk(s) ${idx.join(",")}, ${removed} cache entr${removed === 1 ? "y" : "ies"} dropped`);
  if (removed === 0) { console.log("no cache entry matched (text/voice differ from the script?) — stopping"); process.exit(1); }
  if (!frag) { console.log("meta.json has no audio path — cannot rebuild"); process.exit(1); }
  const r = spawnSync("node", [T + "t1-run.mjs", frag, ...(args.includes("--live") ? ["--live"] : [])], { encoding: "utf8", maxBuffer: 1 << 26 });
  console.log((r.stdout ?? "").trim().split("\n").filter((l) => /CHECK|WER|QA|quota|QUOTA/.test(l)).join("\n"));
  if (r.status === 0) { console.log(`${slug}: QA ok after ${attempt} attempt(s)`); process.exit(0); }
  if (r.status === 3) { console.log("quota exhausted — stop, retry later"); process.exit(3); }
  if (r.status !== 2) { console.log((r.stdout ?? "").slice(-400), (r.stderr ?? "").slice(-300)); process.exit(1); }
}
console.log(`${slug}: still flagged after ${max} attempts`);
process.exit(2);
