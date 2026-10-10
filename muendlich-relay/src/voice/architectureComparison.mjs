/**
 * Real-number comparison of candidate architectures against the hard
 * business constraint: total variable AI/infra cost <= $10/subscriber/month
 * at 50-60 exams/month, with Teil 1 carrying 7,000-10,000 characters of
 * dynamically-generated (Claude-driven) examiner speech per candidate.
 *
 * Run with: npm run architecture-comparison
 *
 * Uses costAccounting.ts's real, unit-tested functions for every ElevenLabs/
 * Google/Claude dollar figure — no hand-rolled per-char/per-min formulas for
 * those vendors, specifically to avoid unit-conversion bugs (a hand-rolled
 * version of this script had exactly that bug during this session: dividing
 * a per-CHARACTER rate by 1000 a second time, understating ElevenLabs TTS
 * cost by 1000x — caught by cross-checking against the tested functions
 * before reporting any number, not shipped).
 *
 * The self-hosted (faster-whisper + Piper) figures ARE hand-computed here
 * (no existing tested function for them yet) from real-world published
 * benchmarks — see the inline comments for exact sources. NOT live-tested:
 * no GPU/CPU inference server exists in this repo to verify against.
 */
import {
  ttsCharactersToUsd, ttsCharactersToCredits, sttMinutesToUsd, sttMinutesToCredits,
  googleTtsCharactersToUsd, googleSttMinutesToUsd,
} from "./costAccounting.ts";

const STT_MIN_PER_EXAM_ROOM = 9; // carried estimate, room total (both candidates) — UNVERIFIED for the richer Teil-1 flow, see voice/README.md
const CHARS_PER_TOKEN_DE = 4.5; // rough German avg
const CLAUDE_OUT_PER_TOKEN = 10 / 1_000_000; // Sonnet 5 output rate
const CLAUDE_BASE_ROOM_USD = 0.053; // existing measured Teil2/3 + short Teil1 reasoning cost, unchanged

// Self-hosted real-world benchmarks, sourced this session (WebSearch, not
// live-tested — no inference server exists in this repo):
//   - faster-whisper on an L40S GPU: $0.75/GPU-hour at ~35x realtime audio
//     throughput -> $0.75/35 = $0.0214 per AUDIO-hour processed (source:
//     Spheron production-deployment benchmark). German WER with the
//     Whisper-large-v3-turbo German-finetuned CTranslate2 model: 2.628%
//     (source: Hugging Face model card) — BETTER than ElevenLabs Scribe's
//     published 3.1% FLEURS WER.
//   - Piper TTS: real-time factor ~0.03 (i.e. 1 second of CPU compute
//     synthesizes ~33 seconds of audio), CPU-only, no GPU needed. German
//     voice (Thorsten, "high" quality tier) independently described as
//     "audiobook-grade." Tradeoff: flatter/less expressive prosody than
//     ElevenLabs/Google's newest generative models — a real quality
//     difference, not hidden here.
const WHISPER_USD_PER_AUDIO_HOUR = 0.0214;
const PIPER_RTF = 0.03;
const CPU_SERVER_USD_PER_HOUR = 0.05; // ballpark modest multi-core CPU VM, amortized
const SPEAKING_CHARS_PER_SEC = 15; // ~900 chars/min typical German speaking rate

function claudeRoomUsd(roomBulkChars) {
  return CLAUDE_BASE_ROOM_USD + (roomBulkChars / CHARS_PER_TOKEN_DE) * CLAUDE_OUT_PER_TOKEN;
}

for (const perPerson of [7000, 8500, 10000]) {
  const roomChars = perPerson * 2;
  console.log(`\n================ Teil 1: ${perPerson} chars/person (${roomChars} chars/room) ================`);
  const claudeRoom = claudeRoomUsd(roomChars);

  const elTtsUsd = ttsCharactersToUsd(roomChars), elTtsCredits = ttsCharactersToCredits(roomChars);
  const elSttUsd = sttMinutesToUsd(STT_MIN_PER_EXAM_ROOM), elSttCredits = sttMinutesToCredits(STT_MIN_PER_EXAM_ROOM);
  const googleTtsUsd = googleTtsCharactersToUsd(roomChars);
  const googleSttUsd = googleSttMinutesToUsd(STT_MIN_PER_EXAM_ROOM);

  for (const exams of [50, 60]) {
    console.log(`\n--- ${exams} exams/month/subscriber ---`);

    const aUsdPerSub = ((elTtsUsd + elSttUsd + claudeRoom) / 2) * exams;
    const aCreditsPerSub = ((elTtsCredits + elSttCredits) / 2) * exams;
    console.log(`  [A] ElevenLabs only:  $${aUsdPerSub.toFixed(2)}/mo, ${aCreditsPerSub.toFixed(0)} credits/mo  ${aUsdPerSub <= 10 ? "UNDER $10" : "OVER $10 -- REJECTED"}`);

    const bUsdPerSub = ((googleTtsUsd + googleSttUsd + claudeRoom) / 2) * exams;
    console.log(`  [B] Google TTS+STT:   $${bUsdPerSub.toFixed(2)}/mo  ${bUsdPerSub <= 10 ? "UNDER $10" : "OVER $10 -- REJECTED"}`);

    for (const subs of [1000, 10000]) {
      const roomExamsPerMonth = (subs * exams) / 2;
      const sttHours = (roomExamsPerMonth * STT_MIN_PER_EXAM_ROOM) / 60;
      const sttUsdTotal = sttHours * WHISPER_USD_PER_AUDIO_HOUR;
      const ttsAudioSeconds = (roomExamsPerMonth * roomChars) / SPEAKING_CHARS_PER_SEC;
      const ttsCpuHours = (ttsAudioSeconds * PIPER_RTF) / 3600;
      const ttsUsdTotal = ttsCpuHours * CPU_SERVER_USD_PER_HOUR;
      const claudeUsdTotal = roomExamsPerMonth * claudeRoom;
      const totalUsd = sttUsdTotal + ttsUsdTotal + claudeUsdTotal;
      const perSub = totalUsd / subs;
      console.log(`  [C] Self-hosted (faster-whisper + Piper) @ ${subs.toString().padStart(5)} subs: STT $${sttUsdTotal.toFixed(2)} + TTS $${ttsUsdTotal.toFixed(2)} + Claude $${claudeUsdTotal.toFixed(2)} = $${totalUsd.toFixed(2)} total -> $${perSub.toFixed(3)}/subscriber/mo  ${perSub <= 10 ? "UNDER $10" : "OVER $10 -- REJECTED"}`);
    }
  }
}

// ============================================================
// Option D: HYBRID split — self-hosted Piper+faster-whisper for the
// HIGH-VOLUME Teil-1 bulk narration (where the savings are enormous and
// slightly flatter prosody is a more acceptable tradeoff for long-form
// narration), Google Chirp3 HD kept for the SMALL remaining content
// (welcome/exam_end library, transitions/handoff, Teil2/3 reactive
// moments) where expressiveness matters most and volume is cheap either way.
// ============================================================
console.log("\n\n############### Option D: hybrid split (self-hosted bulk + premium polish) ###############");
const SMALL_REMAINING_ROOM_CHARS = 465 + 890 + 1200; // library + scripted transitions/handoff + Teil2/3 reactive, unchanged from the non-Teil1-bulk measurements
for (const perPerson of [7000, 8500, 10000]) {
  const bulkRoomChars = perPerson * 2;
  const claudeRoom = claudeRoomUsd(bulkRoomChars + SMALL_REMAINING_ROOM_CHARS);
  const premiumTtsUsd = googleTtsCharactersToUsd(SMALL_REMAINING_ROOM_CHARS);
  for (const exams of [50, 60]) {
    for (const subs of [1000, 10000]) {
      const roomExamsPerMonth = (subs * exams) / 2;
      const sttHours = (roomExamsPerMonth * STT_MIN_PER_EXAM_ROOM) / 60;
      const sttUsdTotal = sttHours * WHISPER_USD_PER_AUDIO_HOUR;
      const ttsAudioSeconds = (roomExamsPerMonth * bulkRoomChars) / SPEAKING_CHARS_PER_SEC;
      const ttsCpuHours = (ttsAudioSeconds * PIPER_RTF) / 3600;
      const bulkTtsUsdTotal = ttsCpuHours * CPU_SERVER_USD_PER_HOUR;
      const premiumTtsUsdTotal = roomExamsPerMonth * premiumTtsUsd;
      const claudeUsdTotal = roomExamsPerMonth * claudeRoom;
      const totalUsd = sttUsdTotal + bulkTtsUsdTotal + premiumTtsUsdTotal + claudeUsdTotal;
      const perSub = totalUsd / subs;
      if (subs === 10000) {
        console.log(`  ${perPerson}chars/person, ${exams}exams/mo: STT $${sttUsdTotal.toFixed(2)} + Piper(bulk) $${bulkTtsUsdTotal.toFixed(2)} + Google(polish) $${premiumTtsUsdTotal.toFixed(2)} + Claude $${claudeUsdTotal.toFixed(2)} = $${totalUsd.toFixed(2)} -> $${perSub.toFixed(3)}/subscriber/mo  ${perSub <= 10 ? "UNDER $10" : "OVER $10"}`);
      }
    }
  }
}
