/**
 * One-time generation of the "scripted_lead" clips: the FIXED first sentence of
 * the scripted exam lines (exam_start / task_transition / section transitions —
 * see examinerPhrases.ts's ScriptedLine) pre-synthesized per voice, so a live
 * exam only pays TTS for the part that actually carries the candidate's name or
 * the topic. ~340 characters per exam at the live rate.
 *
 * Differences from generateLibrary.ts, on purpose:
 *  - Model is eleven_flash_v2_5 — the SAME model the live remainder is spoken
 *    with — so lead and rest have identical timbre (generateLibrary.ts uses
 *    v3 for stand-alone clips where nothing is spoken right after them).
 *  - Only variants of the voice's own style bucket are generated (a voice
 *    always speaks its assigned style, see voiceStyle.ts), ~1/3 of the matrix.
 *  - The manifest is MERGED, never rebuilt from scratch: existing entries of
 *    other categories (welcome / exam_end / teil1_question ...) are left
 *    exactly as they are, so running this can never silently change what the
 *    live relay plays for them.
 *
 * Run:  npx tsx src/voice/phraseLibrary/generateScriptedLeads.ts [--dry] [--sync-only]
 *   --dry        print counts / characters / cost estimate, call nothing
 *   --sync-only  no ElevenLabs calls: just (re)add manifest entries for clips
 *                already on disk (scripted_lead + early_end_*)
 * Resumable: a clip whose .pcm already exists is never re-synthesized.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICES } from "../voices.config.js";
import { synthesizeOnce } from "../elevenLabsTts.js";
import { getScriptedLeadPhrases } from "../../examinerPhrases.js";
import { assignPhraseStyle } from "./voiceStyle.js";
import { EARLY_END_TIME_UP_PHRASES, EARLY_END_IDLE_PHRASES, EARLY_END_PARTNER_DISCONNECTED_PHRASES } from "./fixedPhrases.js";
import type { PhraseAudioAsset, FixedPhrase, PhraseStyle } from "./phraseTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = path.resolve(__dirname, "../../../audio-library");
const MODEL = "eleven_flash_v2_5";
const OUTPUT_FORMAT = "pcm_24000";
const FLASH_USD_PER_1K_CHARS = 0.05;

const args = new Set(process.argv.slice(2));
const voices = VOICES.filter((v) => v.enabled);
const leads = getScriptedLeadPhrases();

interface Job { phraseId: string; style: PhraseStyle; text: string; voiceId: string; file: string }
const jobs: Job[] = [];
for (const voice of voices) {
  const style = assignPhraseStyle(voice.voiceId);
  for (const lead of leads) {
    if (lead.style !== style) continue;
    jobs.push({ phraseId: lead.id, style: lead.style, text: lead.text, voiceId: voice.voiceId, file: path.join("scripted_lead", `${lead.id}__${voice.voiceId}.pcm`) });
  }
}

async function loadManifest(): Promise<PhraseAudioAsset[]> {
  try { return JSON.parse(await readFile(path.join(LIBRARY_ROOT, "manifest.json"), "utf8")) as PhraseAudioAsset[]; } catch { return []; }
}

async function syncManifest() {
  const manifest = await loadManifest();
  const key = (a: { category: string; voiceId: string; phraseId: string }) => `${a.category}|${a.voiceId}|${a.phraseId}`;
  const have = new Set(manifest.map(key));
  // scripted_lead is rebuilt from the current phrase definitions (text may have changed); everything else is only ever ADDED to.
  const kept = manifest.filter((a) => a.category !== "scripted_lead");
  const added: PhraseAudioAsset[] = [];
  const now = new Date().toISOString();

  for (const j of jobs) {
    if (!existsSync(path.join(LIBRARY_ROOT, j.file))) continue;
    added.push({ phraseId: j.phraseId, category: "scripted_lead", style: j.style, voiceId: j.voiceId, text: j.text, characterCount: j.text.length, pcmPath: j.file.replace(/\\/g, "/"), generatedAt: now });
  }
  const earlyEnd: { name: "early_end_time_up" | "early_end_idle_timeout" | "early_end_partner_disconnected"; phrases: FixedPhrase[] }[] = [
    { name: "early_end_time_up", phrases: EARLY_END_TIME_UP_PHRASES },
    { name: "early_end_idle_timeout", phrases: EARLY_END_IDLE_PHRASES },
    { name: "early_end_partner_disconnected", phrases: EARLY_END_PARTNER_DISCONNECTED_PHRASES },
  ];
  let earlyAdded = 0;
  for (const { name, phrases } of earlyEnd) {
    for (const p of phrases) for (const v of voices) {
      const file = path.join(name, `${p.id}__${v.voiceId}.pcm`);
      if (!existsSync(path.join(LIBRARY_ROOT, file)) || have.has(key({ category: name, voiceId: v.voiceId, phraseId: p.id }))) continue;
      added.push({ phraseId: p.id, category: name, style: p.style, voiceId: v.voiceId, text: p.text, characterCount: p.text.length, pcmPath: file.replace(/\\/g, "/"), generatedAt: now });
      earlyAdded++;
    }
  }
  const next = [...kept, ...added];
  await writeFile(path.join(LIBRARY_ROOT, "manifest.json"), JSON.stringify(next, null, 2));
  const by: Record<string, number> = {};
  for (const a of next) by[a.category] = (by[a.category] ?? 0) + 1;
  console.log(`manifest synced: +${added.filter((a) => a.category === "scripted_lead").length} scripted_lead, +${earlyAdded} early_end_*; totals by category:`, by);
}

async function main() {
  const chars = jobs.reduce((n, j) => n + j.text.length, 0);
  console.log(`${leads.length} distinct lead sentences; ${jobs.length} clips (voices x own-style variants); ${chars} characters ≈ $${((chars / 1000) * FLASH_USD_PER_1K_CHARS).toFixed(2)} at the Flash rate`);
  if (args.has("--dry")) return;
  if (args.has("--sync-only")) { await syncManifest(); return; }

  if (!process.env.ELEVENLABS_API_KEY) { console.error("ELEVENLABS_API_KEY not set — aborting."); process.exit(1); }
  await mkdir(path.join(LIBRARY_ROOT, "scripted_lead"), { recursive: true });
  let ok = 0, skipped = 0, failed = 0, spent = 0;
  for (const j of jobs) {
    const full = path.join(LIBRARY_ROOT, j.file);
    if (existsSync(full)) { skipped++; continue; }
    try {
      const pcm = await synthesizeOnce(j.voiceId, j.text, MODEL, OUTPUT_FORMAT);
      await writeFile(full, pcm);
      ok++; spent += j.text.length;
      if (ok % 20 === 0) console.log(`  ${ok} generated (${spent} chars so far)`);
    } catch (e) {
      failed++;
      console.error(`FAIL ${j.file}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`done: ${ok} generated, ${skipped} already on disk, ${failed} failed, ${spent} characters spent`);
  await syncManifest(); // also after a partial run, so already-paid clips are never orphaned
  if (failed > 0 && ok === 0) process.exit(1);
}
main();
