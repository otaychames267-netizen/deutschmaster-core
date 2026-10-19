/**
 * Offline, one-time generation of the fixed audio library: every fully-
 * fixed-category phrase (welcome | exam_end | early_end_*) x every enabled
 * voice, synthesized ONCE via ElevenLabs v3 (synthesizeOnce — quality
 * matters here, not latency, since this never runs during a live exam) and
 * saved as raw PCM16 mono @ 24kHz — the exact wire format
 * muendlichVoiceSession.ts already streams to clients, so runtime playback
 * (playLibraryPhrase) needs zero transcoding.
 *
 * Run with: npm run generate-phrase-library   [-- --dry] [-- --provider elevenlabs|deepinfra]
 * (2026-10-09: also covers the owner's Qwen3-TTS voices of the 2:1 examiner pool via DeepInfra — own-style phrases only, 3 requests at a time, files named with a
 * sanitized voice id; the manifest keeps every other category untouched.)
 *
 * UNBLOCKED as of 2026-10-03 — confirmed live (a real synthesizeOnce call
 * against a real library voice ID now returns 200, not the previous
 * "payment_required"/"Free users cannot use library voices via the API"
 * rejection documented here until this date). The account-tier restriction
 * that blocked this script since it was first written is gone; it has never
 * actually been run against this backend before, so EVERY exam to date has
 * paid live ElevenLabs TTS cost for welcome/exam_end/teil1_question/
 * early_end_* despite the code having supported zero-cost playback this
 * whole time. muendlichVoiceSession.ts's playLibraryPhrase() already checks
 * for a manifest and falls back to dynamic scripted TTS (speakScriptedText)
 * when one doesn't exist yet, so this has always been safe to ship ahead of
 * actually running it — but running it now is a real, one-time ElevenLabs
 * cost (voices × phrases syntheses), not free, so don't re-run casually.
 *
 * Resumable: skips any phrase/voice pair whose .pcm file already exists on
 * disk (e.g. from a prior run stopped partway through) instead of
 * re-synthesizing and re-paying for it — important since this is real,
 * metered ElevenLabs cost, not a free local operation. Delete a .pcm file
 * manually to force that one entry to regenerate. manifest.json is still
 * rebuilt from scratch every run (cheap, local) so it always matches
 * whatever is actually on disk.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICES } from "../voices.config.js";
import { voiceProvider } from "../voicePools.js";
import { WELCOME_PHRASES, EXAM_END_PHRASES, EARLY_END_TIME_UP_PHRASES, EARLY_END_IDLE_PHRASES, EARLY_END_PARTNER_DISCONNECTED_PHRASES } from "./fixedPhrases.js";
import { synthesizeOnce } from "../elevenLabsTts.js";
import { isDeepInfraVoice, synthesizeDeepInfraOnce } from "../deepinfraTts.js";
import { assignPhraseStyle } from "./voiceStyle.js";
import type { PhraseAudioAsset } from "./phraseTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = path.resolve(__dirname, "../../../audio-library");
const OUTPUT_FORMAT = "pcm_24000";
const MODEL = "eleven_v3";

// --provider elevenlabs|deepinfra limits which clips get SYNTHESIZED in this run; the job list (and so the manifest) always covers the voices of every provider.
const onlyProvider = process.argv.includes("--provider") ? process.argv[process.argv.indexOf("--provider") + 1] : null;
const DEEPINFRA_CONCURRENCY = 3;
/** DeepInfra voice ids contain ":" (invalid in Windows file names) — files use a sanitized id, the manifest keeps the real voiceId. ElevenLabs ids are unchanged by this. */
const safeId = (voiceId: string) => voiceId.replace(/[^A-Za-z0-9._-]/g, "_");

async function main() {
  // ElevenLabs: every enabled voice (as before). DeepInfra/Qwen (owner 2026-10-09): the voices of the 2:1 "examiner" pool, and only the phrases of the voice's OWN style
  // bucket — a voice only ever speaks its own style (voiceStyle.ts / pickVariant), so the other two thirds would never be played.
  const voices = VOICES.filter((v) => v.enabled && (voiceProvider(v) === "elevenlabs" || (voiceProvider(v) === "deepinfra" && v.pools?.includes("examiner"))));
  const categories = [
    { name: "welcome" as const, phrases: WELCOME_PHRASES },
    { name: "exam_end" as const, phrases: EXAM_END_PHRASES },
    // teil1_question is deliberately NOT pre-generated here (2026-10-03 decision): playLibraryPhrase() falls back to live TTS when no manifest entry exists.
    // Added 2026-10-03: candidate-name/topic-free, same as welcome/exam_end above — see fixedPhrases.ts's own comment.
    { name: "early_end_time_up" as const, phrases: EARLY_END_TIME_UP_PHRASES },
    { name: "early_end_idle_timeout" as const, phrases: EARLY_END_IDLE_PHRASES },
    { name: "early_end_partner_disconnected" as const, phrases: EARLY_END_PARTNER_DISCONNECTED_PHRASES },
  ];

  interface Job { name: (typeof categories)[number]["name"]; phrase: (typeof categories)[number]["phrases"][number]; voiceId: string; file: string }
  const jobs: Job[] = [];
  for (const { name, phrases } of categories) {
    for (const phrase of phrases) {
      for (const voice of voices) {
        if (voiceProvider(voice) === "deepinfra" && phrase.style !== assignPhraseStyle(voice.voiceId)) continue;
        jobs.push({ name, phrase, voiceId: voice.voiceId, file: path.join(name, `${phrase.id}__${safeId(voice.voiceId)}.pcm`) });
      }
    }
  }
  const providerOf = (voiceId: string) => (isDeepInfraVoice(voiceId) ? "deepinfra" : "elevenlabs");
  const todo = jobs.filter((j) => !existsSync(path.join(LIBRARY_ROOT, j.file)) && (!onlyProvider || providerOf(j.voiceId) === onlyProvider));
  const chars = (p: string) => todo.filter((j) => providerOf(j.voiceId) === p).reduce((n, j) => n + j.phrase.text.length, 0);
  console.log(`${jobs.length} clips in the job list, ${todo.length} to synthesize: ElevenLabs ${chars("elevenlabs")} chars (≈ $${((chars("elevenlabs") / 1000) * 0.04).toFixed(2)} at $0.04/1k), DeepInfra ${chars("deepinfra")} chars (≈ $${((chars("deepinfra") / 1e6) * 20).toFixed(2)} at $20/M)`);
  if (process.argv.includes("--dry")) return;
  if (todo.some((j) => providerOf(j.voiceId) === "elevenlabs") && !process.env.ELEVENLABS_API_KEY) { console.error("ELEVENLABS_API_KEY not set — aborting (use --provider deepinfra to generate only the Qwen clips)."); process.exit(1); }
  if (todo.some((j) => providerOf(j.voiceId) === "deepinfra") && !process.env.DEEPINFRA_API_KEY) { console.error("DEEPINFRA_API_KEY not set — aborting (use --provider elevenlabs to skip the Qwen clips)."); process.exit(1); }

  for (const { name } of categories) await mkdir(path.join(LIBRARY_ROOT, name), { recursive: true });
  let ok = 0, failed = 0;
  const skipped = jobs.length - todo.length;
  async function run(j: Job) {
    try {
      const pcm = providerOf(j.voiceId) === "deepinfra" ? await synthesizeDeepInfraOnce(j.voiceId, j.phrase.text) : await synthesizeOnce(j.voiceId, j.phrase.text, MODEL, OUTPUT_FORMAT);
      await writeFile(path.join(LIBRARY_ROOT, j.file), pcm);
      ok++;
      if (ok % 25 === 0) console.log(`  ${ok} generated`);
    } catch (e) {
      failed++;
      console.error(`FAIL ${j.file}:`, e instanceof Error ? e.message : e);
    }
  }
  // ElevenLabs runs stay sequential (as before); a DeepInfra-only run does DEEPINFRA_CONCURRENCY clips at a time.
  const queue = [...todo];
  const concurrency = todo.every((j) => providerOf(j.voiceId) === "deepinfra") ? DEEPINFRA_CONCURRENCY : 1;
  const workers = Array.from({ length: concurrency }, async () => { for (let j = queue.shift(); j; j = queue.shift()) await run(j); });
  await Promise.all(workers);

  // The manifest is rebuilt for THIS script's categories from the files on disk; entries of every other category (teil1_question, scripted_lead) are kept exactly as they are.
  const mine = new Set<string>(categories.map((c) => c.name));
  let kept: PhraseAudioAsset[] = [];
  try { kept = (JSON.parse(await readFile(path.join(LIBRARY_ROOT, "manifest.json"), "utf8")) as PhraseAudioAsset[]).filter((a) => !mine.has(a.category)); } catch { /* no manifest yet */ }
  const now = new Date().toISOString();
  const rebuilt: PhraseAudioAsset[] = jobs
    .filter((j) => existsSync(path.join(LIBRARY_ROOT, j.file)))
    .map((j) => ({ phraseId: j.phrase.id, category: j.name, style: j.phrase.style, voiceId: j.voiceId, text: j.phrase.text, characterCount: j.phrase.text.length, pcmPath: j.file.replace(/\\/g, "/"), generatedAt: now, topic: j.phrase.topic }));
  await writeFile(path.join(LIBRARY_ROOT, "manifest.json"), JSON.stringify([...kept, ...rebuilt], null, 2));
  console.log(`\nDone. ${ok} generated, ${skipped} skipped (already on disk or other provider), ${failed} failed. Manifest: ${rebuilt.length} clips of this script's categories + ${kept.length} kept from other categories.`);
  if (failed > 0 && ok === 0) process.exit(1);
}

main();
