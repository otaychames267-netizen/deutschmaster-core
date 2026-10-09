/**
 * Offline, one-time generation of the fixed audio library: every fully-
 * fixed-category phrase (welcome | exam_end | early_end_*) x every enabled
 * voice, synthesized ONCE via ElevenLabs v3 (synthesizeOnce — quality
 * matters here, not latency, since this never runs during a live exam) and
 * saved as raw PCM16 mono @ 24kHz — the exact wire format
 * muendlichVoiceSession.ts already streams to clients, so runtime playback
 * (playLibraryPhrase) needs zero transcoding.
 *
 * Run with: npm run generate-phrase-library
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
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICES } from "../voices.config.js";
import { voiceProvider } from "../voicePools.js";
import { WELCOME_PHRASES, EXAM_END_PHRASES, EARLY_END_TIME_UP_PHRASES, EARLY_END_IDLE_PHRASES, EARLY_END_PARTNER_DISCONNECTED_PHRASES } from "./fixedPhrases.js";
import { synthesizeOnce } from "../elevenLabsTts.js";
import type { PhraseAudioAsset } from "./phraseTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = path.resolve(__dirname, "../../../audio-library");
const OUTPUT_FORMAT = "pcm_24000";
const MODEL = "eleven_v3";

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    console.error("ELEVENLABS_API_KEY not set — aborting.");
    process.exit(1);
  }
  const voices = VOICES.filter((v) => v.enabled && voiceProvider(v) === "elevenlabs"); // these libraries are ElevenLabs clips; other providers have their own generators
  const categories = [
    { name: "welcome" as const, phrases: WELCOME_PHRASES },
    { name: "exam_end" as const, phrases: EXAM_END_PHRASES },
    // teil1_question is deliberately NOT pre-generated: the user chose to
    // keep Teil 1 presentation prompts live/spontaneous from the AI rather
    // than cached, even though they're name-free and technically cacheable
    // (2026-10-03 decision) — playLibraryPhrase() already falls back to live
    // TTS when no manifest entry exists for a category, so this needs no
    // runtime change, only omission here.
    // Added 2026-10-03: candidate-name/topic-free, same as welcome/exam_end
    // above — see fixedPhrases.ts's own comment for why these moved out of
    // live-TTS-only territory once the account-tier blocker cleared.
    { name: "early_end_time_up" as const, phrases: EARLY_END_TIME_UP_PHRASES },
    { name: "early_end_idle_timeout" as const, phrases: EARLY_END_IDLE_PHRASES },
    { name: "early_end_partner_disconnected" as const, phrases: EARLY_END_PARTNER_DISCONNECTED_PHRASES },
  ];

  const manifest: PhraseAudioAsset[] = [];
  let ok = 0, failed = 0, skipped = 0;

  for (const { name, phrases } of categories) {
    const dir = path.join(LIBRARY_ROOT, name);
    await mkdir(dir, { recursive: true });
    for (const phrase of phrases) {
      for (const voice of voices) {
        const fileName = `${phrase.id}__${voice.voiceId}.pcm`;
        const fullPath = path.join(dir, fileName);
        if (existsSync(fullPath)) {
          manifest.push({
            phraseId: phrase.id,
            category: name,
            style: phrase.style,
            voiceId: voice.voiceId,
            text: phrase.text,
            characterCount: phrase.text.length,
            pcmPath: path.join(name, fileName).replace(/\\/g, "/"),
            generatedAt: new Date().toISOString(),
            topic: phrase.topic,
          });
          skipped++;
          continue;
        }
        try {
          const pcm = await synthesizeOnce(voice.voiceId, phrase.text, MODEL, OUTPUT_FORMAT);
          await writeFile(fullPath, pcm);
          manifest.push({
            phraseId: phrase.id,
            category: name,
            style: phrase.style,
            voiceId: voice.voiceId,
            text: phrase.text,
            characterCount: phrase.text.length,
            pcmPath: path.join(name, fileName).replace(/\\/g, "/"),
            generatedAt: new Date().toISOString(),
            topic: phrase.topic,
          });
          ok++;
          console.log(`OK   ${name}/${fileName} (${pcm.length} bytes)`);
        } catch (e) {
          failed++;
          console.error(`FAIL ${name}/${fileName}:`, e instanceof Error ? e.message : e);
        }
      }
    }
  }

  await writeFile(path.join(LIBRARY_ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${ok} generated, ${skipped} skipped (already on disk), ${failed} failed. Manifest: ${path.join(LIBRARY_ROOT, "manifest.json")}`);
  if (failed > 0 && ok === 0) process.exit(1);
}

main();
