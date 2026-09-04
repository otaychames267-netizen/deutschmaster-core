/**
 * FINAL cost recalculation under the corrected architecture:
 *   - Student's 7,000-10,000 char Teil-1 response -> STT ONLY, self-hosted
 *     faster-whisper. NEVER sent to ElevenLabs TTS.
 *   - ElevenLabs TTS used ONLY for short, genuinely dynamic examiner speech
 *     (organic follow-ups, brief reactions) - the user's own given ceiling
 *     values (500/1000/1500/2000/3000/7000 chars/exam) are swept directly.
 *   - Fixed phrases + the new 350-question Teil-1 library play from
 *     pre-generated audio, $0 ElevenLabs cost at runtime.
 *   - Claude cost uses the ORIGINAL measured baseline (short examiner
 *     speech, before the since-corrected "examiner speaks 7-10k chars"
 *     misreading) - this session's real simulateFullExam.mjs numbers.
 *
 * Run with: npm run final-cost-model
 */
import { ttsCharactersToUsd, ttsCharactersToCredits, claudeUsageToUsd } from "./costAccounting.ts";

const PARTICIPANTS = 2;

// Real measured Claude baseline (short, concise examiner speech only -
// organic follow-ups, takeover questions, nudge, completion, moderation -
// this session's simulateFullExam.mjs, BEFORE the mistaken "examiner
// generates 7-10k chars" assumption). Real Anthropic-reported tokens.
const claudeUsageBaseline = {
  claudeInputTokens: 16677, claudeOutputTokens: 840,
  claudeCacheCreationInputTokens: 2837, claudeCacheReadInputTokens: 22696,
};
const claudeRoomUsd = claudeUsageToUsd(claudeUsageBaseline);

// Self-hosted faster-whisper STT via RunPod Serverless — REAL rate read
// directly from a logged-in RunPod account's own serverless pricing
// calculator on 2026-08-26: $0.00016/sec for the 16GB-VRAM GPU tier
// (A4000/A4500/RTX4000/RTX2000 — the cheapest tier RunPod offers, and
// comfortably enough VRAM for Whisper-large-v3-turbo in float16/int8).
// Serverless (not a 24/7 Pod) specifically because it scales workers to
// match concurrent exam volume automatically and costs $0.00 when idle —
// a single always-on Pod could not keep up with real concurrent demand at
// meaningful scale without manual multi-instance orchestration.
//
// Real-time-factor (RTF) for THIS specific GPU tier is not independently
// benchmarked (no live deployment exists yet) — the only real published RTF
// found this session (35x) was measured on a much more powerful L40S GPU,
// so reusing it here would overstate savings. Using a conservative,
// reasoned range instead: 10x-20x (roughly scaled down from L40S by relative
// compute capability). The headline numbers below use the CONSERVATIVE end
// (10x) so this stays a safe upper-bound estimate, not an optimistic one;
// replace with a real measured RTF the moment a live endpoint exists.
const TND_PER_USD = 2.95;
const SUBSCRIPTION_USD = 55 / TND_PER_USD;
const RUNPOD_SERVERLESS_USD_PER_SECOND = 0.00016;
const CONSERVATIVE_RTF = 10;
const WHISPER_USD_PER_AUDIO_HOUR = (3600 / CONSERVATIVE_RTF) * RUNPOD_SERVERLESS_USD_PER_SECOND;
const SPEAKING_CHARS_PER_SEC = 15; // ~900 chars/min German speaking rate

// Small, honest infra floor: audio-library storage only (a few GB at most —
// welcome/exam_end/Teil1-question PCM files across 5 real voices — see
// voice/README.md). STT compute itself is now the RunPod line above, not
// folded into this generic floor anymore.
const INFRA_USD_PER_EXAM_ROOM = 0.002;

function fmt(n, d = 4) { return `$${n.toFixed(d)}`; }

console.log("=== STT cost (self-hosted faster-whisper), by student Teil-1 response length ===");
const sttRows = [];
for (const perStudentChars of [7000, 8500, 10000]) {
  const teil1RoomChars = perStudentChars * PARTICIPANTS;
  const teil1Minutes = teil1RoomChars / SPEAKING_CHARS_PER_SEC / 60;
  const teil23Minutes = 6; // carried estimate, candidates conversing/planning in Teil 2/3 - unchanged
  const totalMinutes = teil1Minutes + teil23Minutes;
  const sttUsdRoom = (totalMinutes / 60) * WHISPER_USD_PER_AUDIO_HOUR;
  sttRows.push({ perStudentChars, totalMinutes, sttUsdRoom });
  console.log(`  ${perStudentChars} chars/student -> Teil1 ${teil1Minutes.toFixed(1)}min + Teil2/3 ${teil23Minutes}min = ${totalMinutes.toFixed(1)}min/exam(room) -> ${fmt(sttUsdRoom)}/exam(room) self-hosted`);
}
const sttUsdRoom = sttRows[1].sttUsdRoom; // use the 8500-char midpoint as the representative figure below

console.log("\n=== ElevenLabs dynamic TTS cost, at the given ceiling levels (chars/exam = ROOM total) ===");
const elRows = [];
for (const chars of [500, 1000, 1500, 2000, 3000, 7000]) {
  const usdRoom = ttsCharactersToUsd(chars);
  const creditsRoom = ttsCharactersToCredits(chars);
  const creditsPerParticipant = creditsRoom / PARTICIPANTS;
  elRows.push({ chars, usdRoom, creditsRoom, creditsPerParticipant });
  console.log(`  ${chars.toString().padStart(4)} chars/exam = ${creditsRoom.toString().padStart(5)} credits/exam (${creditsPerParticipant.toFixed(0)} credits/participant) = ${fmt(usdRoom)}/exam(room), Flash v2.5`);
}

console.log(`\n=== Claude cost/exam(room): ${fmt(claudeRoomUsd)} (real measured baseline, prompt-caching applied) ===`);
console.log(`=== Self-hosted STT cost/exam(room) at representative 8,500 chars/student: ${fmt(sttUsdRoom)} ===`);
console.log(`=== Infra floor/exam(room): ${fmt(INFRA_USD_PER_EXAM_ROOM)} ===`);

console.log("\n=== TOTAL COST TABLE (per exam and per participant/month) ===");
for (const { chars, usdRoom: elUsdRoom, creditsPerParticipant } of elRows) {
  const totalRoomUsd = elUsdRoom + sttUsdRoom + claudeRoomUsd + INFRA_USD_PER_EXAM_ROOM;
  const perParticipantUsd = totalRoomUsd / PARTICIPANTS;
  console.log(`\n  ElevenLabs ceiling: ${chars} chars/exam (${creditsPerParticipant.toFixed(0)} credits/participant/exam)`);
  console.log(`    Per exam (room): EL ${fmt(elUsdRoom)} + STT ${fmt(sttUsdRoom)} + Claude ${fmt(claudeRoomUsd)} + Infra ${fmt(INFRA_USD_PER_EXAM_ROOM)} = ${fmt(totalRoomUsd)}`);
  console.log(`    Per participant/exam: ${fmt(perParticipantUsd)}`);
  for (const exams of [50, 60]) {
    const monthlyUsd = perParticipantUsd * exams;
    const monthlyCredits = creditsPerParticipant * exams;
    const overCreditCap = monthlyCredits > 60000;
    console.log(`    @ ${exams} exams/mo: ${fmt(monthlyUsd, 2)}/participant/month, ${monthlyCredits.toFixed(0)} ElevenLabs credits/month ${overCreditCap ? "*** EXCEEDS 60,000 ***" : "(within 60,000)"}`);
  }
}

console.log(`\n=== Margin from 55 TND subscription (~$${SUBSCRIPTION_USD.toFixed(2)} at ${TND_PER_USD} TND/$1) ===`);
console.log(`  Subscription revenue: $${SUBSCRIPTION_USD.toFixed(2)}/month`);
for (const { chars, usdRoom: elUsdRoom } of elRows) {
  const totalRoomUsd = elUsdRoom + sttUsdRoom + claudeRoomUsd + INFRA_USD_PER_EXAM_ROOM;
  const perParticipantUsd = totalRoomUsd / PARTICIPANTS;
  for (const exams of [50, 60]) {
    const monthlyUsd = perParticipantUsd * exams;
    const margin = SUBSCRIPTION_USD - monthlyUsd;
    console.log(`  ${chars}ch ceiling, ${exams} exams/mo: cost $${monthlyUsd.toFixed(2)}, margin $${margin.toFixed(2)} (${((margin/SUBSCRIPTION_USD)*100).toFixed(0)}%)`);
  }
}

// Real measured dynamic-TTS volume, THIS session's actual current build,
// INCLUDING the Teil-1 question-library step (npm run simulate-exam, 3 real
// runs, real Claude calls, real prompt caching):
//   WITH library generated (steady-state target): avg 2,162 chars/exam(room)
//   WITHOUT library (today's real fallback -- library not generated yet
//   because the ElevenLabs account is still on the free tier): avg 2,772
console.log("\n\n=== HEADLINE A: REALISTIC case -- library generated (steady-state target) ===");
function headline(label, roomChars) {
  const elUsdRoom = ttsCharactersToUsd(roomChars);
  const elCreditsRoom = ttsCharactersToCredits(roomChars);
  const totalRoomUsd = elUsdRoom + sttUsdRoom + claudeRoomUsd + INFRA_USD_PER_EXAM_ROOM;
  const perParticipantUsd = totalRoomUsd / PARTICIPANTS;
  const perParticipantCredits = elCreditsRoom / PARTICIPANTS;
  console.log(`  ${roomChars} chars/exam(room) = ${elCreditsRoom} credits/exam(room), ${perParticipantCredits.toFixed(0)} credits/participant/exam`);
  console.log(`  Per exam (room): EL ${fmt(elUsdRoom)} + STT ${fmt(sttUsdRoom)} + Claude ${fmt(claudeRoomUsd)} + Infra ${fmt(INFRA_USD_PER_EXAM_ROOM)} = ${fmt(totalRoomUsd)}`);
  console.log(`  Per participant/exam: ${fmt(perParticipantUsd)}`);
  for (const exams of [50, 60]) {
    const monthlyUsd = perParticipantUsd * exams;
    const monthlyCredits = perParticipantCredits * exams;
    const margin = SUBSCRIPTION_USD - monthlyUsd;
    console.log(`  @ ${exams} exams/mo: $${monthlyUsd.toFixed(2)}/participant/month (${(monthlyUsd * TND_PER_USD).toFixed(2)} TND), ${monthlyCredits.toFixed(0)} credits/month (${monthlyCredits <= 60000 ? "within" : "EXCEEDS"} 60,000) -- margin from 55 TND ($${SUBSCRIPTION_USD.toFixed(2)}): $${margin.toFixed(2)} / ${(margin * TND_PER_USD).toFixed(2)} TND (${((margin/SUBSCRIPTION_USD)*100).toFixed(0)}%)`);
  }
}
headline("realistic (library generated)", 2162);
console.log("\n=== HEADLINE B: today's REAL fallback case -- library NOT yet generated (ElevenLabs still free-tier) ===");
headline("today's fallback (no library yet)", 2772);
