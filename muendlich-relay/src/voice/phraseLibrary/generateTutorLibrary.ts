/**
 * Offline generation of the 1:1 tutor's cached clips (owner 2026-10-09): the fixed lead sentence of every solo section-transition line
 * (Teil 1 -> 2, Teil 2 -> 3) and the closing lines, in the professional ("formal") register only, for the 10 tutor examiner voices, with
 * eleven_v4_turbo — the model the tutor now speaks live — so a cached lead and the live remainder after it share one timbre.
 *
 * Output (local, git-ignored like the rest of audio-library/, copied into the Docker image at deploy):
 *   audio-library/tutor-v4/scripted_lead/<phraseId>__<voiceId>.pcm   raw PCM16 mono 24 kHz
 *   audio-library/tutor-v4/exam_end/<phraseId>__<voiceId>.pcm
 *   audio-library/tutor-v4/manifest.json                             rebuilt from the files on disk on every run
 *
 * Run:  ELEVENLABS_API_KEY=... AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=... npx tsx src/voice/phraseLibrary/generateTutorLibrary.ts [--dry] [--provider azure|elevenlabs]
 * Resumable: a clip whose .pcm already exists is never re-synthesized. Default voice settings (no stability override) on purpose: the live
 * dialogue stream uses the voice's defaults, and the clip must sound like the sentence that follows it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICES } from "../voices.config.js";
import { TUTOR_EXAMINER_POOL, voiceProvider } from "../voicePools.js";
import { isAzureVoice, synthesizeAzureOnce } from "../azureTts.js";
import { getSoloTransitionLeadPhrases, getSoloExamEndPool, TUTOR_PHRASE_STYLE } from "../../examinerPhrases.js";
import type { PhraseAudioAsset } from "./phraseTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../audio-library/tutor-v4");
const MODEL = "eleven_v4_turbo";
const OUTPUT_FORMAT = "pcm_24000";

// --provider azure|elevenlabs limits which clips get SYNTHESIZED in this run; the job list (and so the manifest, which is rebuilt from the files on
// disk every run) always covers every examiner voice of the tutor pool, so a partial run can never drop the other provider's clips from the manifest.
const onlyProvider = process.argv.includes("--provider") ? process.argv[process.argv.indexOf("--provider") + 1] : null;
const voices = VOICES.filter((v) => v.enabled && v.pools?.includes(TUTOR_EXAMINER_POOL));
/** Azure voice names contain ":" (invalid in Windows file names) — files use a sanitized id, the manifest keeps the real voiceId. */
const safeId = (voiceId: string) => voiceId.replace(/[^A-Za-z0-9._-]/g, "_");
const leads = getSoloTransitionLeadPhrases();
const ends = getSoloExamEndPool().filter((p) => p.style === TUTOR_PHRASE_STYLE);

interface Job { category: "scripted_lead" | "exam_end"; phraseId: string; text: string; voiceId: string; file: string }
const jobs: Job[] = [];
for (const v of voices) {
  for (const l of leads) jobs.push({ category: "scripted_lead", phraseId: l.id, text: l.text, voiceId: v.voiceId, file: path.join("scripted_lead", `${l.id}__${safeId(v.voiceId)}.pcm`) });
  for (const e of ends) jobs.push({ category: "exam_end", phraseId: e.id, text: e.text, voiceId: v.voiceId, file: path.join("exam_end", `${e.id}__${safeId(v.voiceId)}.pcm`) });
}

async function synth(voiceId: string, text: string): Promise<Buffer> {
  if (isAzureVoice(voiceId)) return synthesizeAzureOnce(voiceId, text); // raw PCM16 mono 24 kHz, same as the ElevenLabs clips
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: MODEL }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = await res.text().catch(() => "");
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); continue; }
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
  }
  throw new Error("ElevenLabs: gave up after 5 attempts");
}

async function writeManifest() {
  const now = new Date().toISOString();
  const manifest: PhraseAudioAsset[] = jobs
    .filter((j) => existsSync(path.join(ROOT, j.file)))
    .map((j) => ({ phraseId: j.phraseId, category: j.category, style: TUTOR_PHRASE_STYLE, voiceId: j.voiceId, text: j.text, characterCount: j.text.length, pcmPath: j.file.replace(/\\/g, "/"), generatedAt: now }));
  await writeFile(path.join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`manifest: ${manifest.length}/${jobs.length} clips`);
}

async function main() {
  const chars = jobs.reduce((n, j) => n + j.text.length, 0);
  console.log(`${voices.length} voices x (${leads.length} leads + ${ends.length} endings) = ${jobs.length} clips, ${chars} characters ≈ ${(chars * 0.059).toFixed(0)} credits at the promo rate (≈ $${((chars / 1000) * 0.011).toFixed(2)}), ≈ $${((chars / 1000) * 0.04).toFixed(2)} at the regular $0.04/1k`);
  if (process.argv.includes("--dry")) return;
  const todo = jobs.filter((j) => !existsSync(path.join(ROOT, j.file)) && (!onlyProvider || (isAzureVoice(j.voiceId) ? "azure" : "elevenlabs") === onlyProvider));
  if (todo.some((j) => !isAzureVoice(j.voiceId)) && !process.env.ELEVENLABS_API_KEY) { console.error("ELEVENLABS_API_KEY not set — aborting (use --provider azure to generate only the Azure clips)."); process.exit(1); }
  if (todo.some((j) => isAzureVoice(j.voiceId)) && !(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)) { console.error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set — aborting (use --provider elevenlabs to skip the Azure clips)."); process.exit(1); }
  await mkdir(path.join(ROOT, "scripted_lead"), { recursive: true });
  await mkdir(path.join(ROOT, "exam_end"), { recursive: true });
  let ok = 0, skipped = jobs.length - todo.length, failed = 0, spent = 0;
  for (const j of todo) {
    const full = path.join(ROOT, j.file);
    try {
      await writeFile(full, await synth(j.voiceId, j.text));
      ok++; spent += j.text.length;
      if (ok % 25 === 0) console.log(`  ${ok} generated (${spent} chars)`);
    } catch (e) { failed++; console.error(`  FAILED ${j.file}: ${String(e)}`); }
  }
  console.log(`done: ${ok} generated, ${skipped} already on disk, ${failed} failed, ${spent} characters synthesized`);
  await writeManifest();
}

main().catch((e) => { console.error(e); process.exit(1); });
