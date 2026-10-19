// 1-transcribe — part of the Hören audio-grounded "Warum?" pipeline (2026-10-13). Order: 1) transcribe  2) gen-aids  3) apply-aids  (then verify-evidence-substrings.mjs).
// Work files (transcripts, generated explanations, backups) live in scripts/hoeren-warum/work/ (git-ignored) — override with HOEREN_WORK_DIR.
// Whisper large-v3 (DeepInfra) on the ORIGINAL audio of every non-hidden Hören exercise with audio (hoeren_audio_backup.old_audio_path — the denoised files transcribe much worse; timestamps are identical). Pauses while a live tutor session exists. Resume-safe.
import { fileURLToPath } from "node:url";
const WORK = (process.env.HOEREN_WORK_DIR ?? fileURLToPath(new URL("./work/", import.meta.url))).split(String.fromCharCode(92)).join("/").replace(/[/]*$/, "/");
// Transcribes every non-hidden Hören exercise that has audio (the file the site actually serves = hoeren_exercises.audio_path) with Whisper large-v3 on DeepInfra.
// Output: hoeren-t/<exercise_id>.json {id,title,level,teil,audio_path,duration,text,segments:[{start,end,text}]}. Resume-safe.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const SP = WORK + "hoeren-t/"; fs.mkdirSync(SP, { recursive: true });
const SHARD = Number(process.env.SHARD ?? 0), SHARDS = Number(process.env.SHARDS ?? 1);
const env = {}; for (const f of ["C:/Users/asus/AuraLingovia/.env", "C:/Users/asus/AuraLingovia/muendlich-relay/.env"]) for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const sql = async (query) => (await (await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) })).json());
const rows = await sql("select e.id, e.title, e.level, e.teil, e.position, e.audio_path, coalesce(b.old_audio_path, e.audio_path) as asr_path from public.hoeren_exercises e left join public.hoeren_audio_backup b on b.exercise_id=e.id and b.reverted_at is null where e.audio_path is not null and coalesce(e.is_hidden,false)=false order by e.level, e.teil, e.position");
console.log("exercises with audio:", rows.length);
const STOCK = /^s*(vielen dank|danke)[.!s]*$|untertitel(ung)?\s+(des|der|von|im auftrag)|amara\.org|vielen dank f(ü|ue)r(s| das)?\s+(zuschauen|zuh(ö|oe)ren)|^\s*\*[^*]*\*\s*$/i;
let done = 0, failed = [];
// be a good neighbour: the live KI-Sprachtrainer uses the same DeepInfra account (Whisper turbo per segment) — pause while a student session is running
async function waitForQuietTutor() { for (let i = 0; i < 60; i++) { const live = await sql("select count(*)::int n from public.voice_tutor_sessions where ended_at is null and started_at > now() - interval '30 minutes'"); if (!(Number(live?.[0]?.n) > 0)) return; console.log("tutor session live — pausing 60 s"); await new Promise((x) => setTimeout(x, 60_000)); } }
async function one(r) {
  await waitForQuietTutor();
  const out = SP + r.id + ".json"; if (fs.existsSync(out)) { done++; return; }
  const src = SP + r.id + ".src", mp3 = SP + r.id + ".mp3";
  try {
    const dl = await fetch(`${env.SUPABASE_URL}/storage/v1/object/hoeren-audio/${r.asr_path.split("/").map(encodeURIComponent).join("/")}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
    if (!dl.ok) throw new Error("download " + dl.status);
    fs.writeFileSync(src, Buffer.from(await dl.arrayBuffer()));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", mp3]);
    const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3]).toString());
    let j = null, err = "";
    for (let a = 1; a <= 3 && !j; a++) {
      const form = new FormData(); form.append("file", new Blob([fs.readFileSync(mp3)], { type: "audio/mpeg" }), "a.mp3"); form.append("model", "openai/whisper-large-v3"); form.append("language", "de"); form.append("response_format", "verbose_json"); form.append("temperature", "0");
      try { const res = await fetch("https://api.deepinfra.com/v1/openai/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${env.DEEPINFRA_API_KEY}` }, body: form, signal: AbortSignal.timeout(240_000) }); if (res.ok) j = await res.json(); else { err = res.status + " " + (await res.text()).slice(0, 120); if (res.status === 402) throw new Error("PAYMENT " + err); } } catch (e) { err = String(e.message ?? e); if (err.startsWith("PAYMENT")) throw e; }
      if (!j) await new Promise((x) => setTimeout(x, 1500 * a));
    }
    if (!j) throw new Error("stt " + err);
    const segments = (j.segments ?? []).map((s) => ({ start: Math.round(s.start * 10) / 10, end: Math.round(s.end * 10) / 10, text: String(s.text).replace(/\s+/g, " ").trim() })).filter((s) => s.text && !STOCK.test(s.text));
    fs.writeFileSync(out, JSON.stringify({ id: r.id, title: r.title, level: r.level, teil: r.teil, audio_path: r.audio_path, asr_path: r.asr_path, duration: Math.round(duration * 10) / 10, text: segments.map((s) => s.text).join(" "), segments }));
    done++;
  } catch (e) { failed.push({ id: r.id, title: r.title, err: String(e.message ?? e) }); }
  finally { for (const f of [src, mp3]) try { fs.unlinkSync(f); } catch {} }
  if (done % 10 === 0) console.log("done", done, "/", rows.length);
}
const queue = rows.filter((_, i) => i % SHARDS === SHARD); await Promise.all(Array.from({ length: 2 }, async () => { while (queue.length) await one(queue.shift()); }));
console.log("finished:", done, "ok,", failed.length, "failed"); if (failed.length) console.log(JSON.stringify(failed, null, 1));
