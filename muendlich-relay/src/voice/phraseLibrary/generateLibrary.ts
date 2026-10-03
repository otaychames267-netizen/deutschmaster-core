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
 * Idempotent-ish: re-running regenerates every file and overwrites
 * manifest.json. Safe to re-run after adding a new voice or phrase.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICES } from "../voices.config.js";
import { WELCOME_PHRASES, EXAM_END_PHRASES, EARLY_END_TIME_UP_PHRASES, EARLY_END_IDLE_PHRASES, EARLY_END_PARTNER_DISCONNECTED_PHRASES } from "./fixedPhrases.js";
import { allTeil1Questions } from "./teil1Questions.js";
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
  const voices = VOICES.filter((v) => v.enabled);
  const categories = [
    { name: "welcome" as const, phrases: WELCOME_PHRASES },
    { name: "exam_end" as const, phrases: EXAM_END_PHRASES },
    // 105 real Teil-1 presentation prompts (7 topics x 15 questions — see
    // teil1Questions.ts's header for why this is a partial, real delivery
    // against the requested 7x50=350, not the full count) x 27 voices =
    // 2,835 syntheses. Same $0-at-runtime library mechanism as welcome/
    // exam_end — these are name-free, so fully pre-generatable.
    { name: "teil1_question" as const, phrases: allTeil1Questions() },
    // Added 2026-10-03: candidate-name/topic-free, same as welcome/exam_end
    // above — see fixedPhrases.ts's own comment for why these moved out of
    // live-TTS-only territory once the account-tier blocker cleared.
    { name: "early_end_time_up" as const, phrases: EARLY_END_TIME_UP_PHRASES },
    { name: "early_end_idle_timeout" as const, phrases: EARLY_END_IDLE_PHRASES },
    { name: "early_end_partner_disconnected" as const, phrases: EARLY_END_PARTNER_DISCONNECTED_PHRASES },
  ];

  const manifest: PhraseAudioAsset[] = [];
  let ok = 0, failed = 0;

  for (const { name, phrases } of categories) {
    const dir = path.join(LIBRARY_ROOT, name);
    await mkdir(dir, { recursive: true });
    for (const phrase of phrases) {
      for (const voice of voices) {
        const fileName = `${phrase.id}__${voice.voiceId}.pcm`;
        const fullPath = path.join(dir, fileName);
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
  console.log(`\nDone. ${ok} generated, ${failed} failed. Manifest: ${path.join(LIBRARY_ROOT, "manifest.json")}`);
  if (failed > 0 && ok === 0) process.exit(1);
}

main();
