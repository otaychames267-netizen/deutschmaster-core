/**
 * Offline, one-time generation of the fixed audio library: every (welcome |
 * exam_end) phrase x every enabled voice, synthesized ONCE via ElevenLabs
 * v3 (synthesizeOnce — quality matters here, not latency, since this never
 * runs during a live exam) and saved as raw PCM16 mono @ 24kHz — the exact
 * wire format muendlichVoiceSession.ts already streams to clients, so
 * runtime playback (playLibraryPhrase) needs zero transcoding.
 *
 * Run with: npm run generate-phrase-library
 *
 * BLOCKED as of this writing — same account-tier issue documented in
 * README.md and voiceProfiles.ts's header: the dev ElevenLabs key is on the
 * free tier, which rejects ALL library-voice TTS via the API
 * ("Free users cannot use library voices via the API", code
 * "payment_required"). This script is fully written and ready to run the
 * moment the account is upgraded — muendlichVoiceSession.ts's
 * playLibraryPhrase() already checks for a manifest and falls back to
 * dynamic scripted TTS (speakScriptedText) when one doesn't exist yet, so
 * shipping this code now is safe: it costs nothing and changes no runtime
 * behavior until generate-phrase-library has actually been run once.
 *
 * Idempotent-ish: re-running regenerates every file and overwrites
 * manifest.json. Safe to re-run after adding a new voice or phrase.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VOICES } from "../voices.config.js";
import { WELCOME_PHRASES, EXAM_END_PHRASES } from "./fixedPhrases.js";
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
