/**
 * One-off script (not part of the app's runtime, but a real, reproducible
 * report) that runs the REAL costAccounting.ts functions against the REAL
 * measured averages from simulateFullExam.mjs's latest run, to produce the
 * exact business numbers for the final report — computed by the actual
 * shipped code, not by hand. Run with `npm run business-report`.
 */
import {
  computeExamCost, examsPerAllowance, USER_CREDIT_ALLOWANCE,
  TTS_USD_PER_1000_CHARACTERS_FLASH, TTS_USD_PER_1000_CHARACTERS_V3,
} from "./costAccounting.ts";

const PARTICIPANTS_PER_EXAM = 2;
// Real measured averages, 3 independent simulated exams (fresh prompt cache
// per exam), src/voice/simulateFullExam.mjs, this session.
const libraryCharsAvg = 465;
const scriptedCharsAvg = 834;
const claudeCharsAvg = 1633;
const claudeInputTokensAvg = 16677;
const claudeOutputTokensAvg = 840;
const claudeCacheWriteAvg = 2837;
const claudeCacheReadAvg = 22696;
// STT minutes/exam: carried estimate from the prior session's credit-budget
// live test (NOT freshly re-measured this session — no real audio pipeline
// available to measure actual STT duration; flagged explicitly).
const sttMinutesAvg = 9;

function usageFor(includeLibraryCharsInDynamicTts) {
  return {
    ttsCharacters: scriptedCharsAvg + claudeCharsAvg + (includeLibraryCharsInDynamicTts ? libraryCharsAvg : 0),
    sttMinutes: sttMinutesAvg,
    claudeInputTokens: claudeInputTokensAvg,
    claudeOutputTokens: claudeOutputTokensAvg,
    claudeCacheCreationInputTokens: claudeCacheWriteAvg,
    claudeCacheReadInputTokens: claudeCacheReadAvg,
  };
}

function report(label, usage) {
  const cost = computeExamCost(usage);
  const perParticipantCredits = cost.totalCredits / PARTICIPANTS_PER_EXAM;
  const perParticipantUsd = cost.totalUsd / PARTICIPANTS_PER_EXAM;
  console.log(`\n=== ${label} ===`);
  console.log(`  TTS characters/exam: ${usage.ttsCharacters}`);
  console.log(`  TTS credits/exam (total room): ${cost.ttsCredits.toFixed(1)}`);
  console.log(`  STT credits/exam (total room): ${cost.sttCredits.toFixed(1)}`);
  console.log(`  TOTAL credits/exam (total room): ${cost.totalCredits.toFixed(1)}`);
  console.log(`  TOTAL credits/exam PER PARTICIPANT (50/50 split): ${perParticipantCredits.toFixed(1)}`);
  console.log(`  TTS $ (Flash v2.5)/exam: $${cost.ttsUsd.toFixed(4)}`);
  console.log(`  STT $/exam: $${cost.sttUsd.toFixed(4)}`);
  console.log(`  Claude $/exam: $${cost.claudeUsd.toFixed(4)}`);
  console.log(`  TOTAL AI $/exam (total room): $${cost.totalUsd.toFixed(4)}`);
  console.log(`  TOTAL AI $/exam PER PARTICIPANT: $${perParticipantUsd.toFixed(4)}`);
  const examsPerParticipantPerMonth = examsPerAllowance(perParticipantCredits, USER_CREDIT_ALLOWANCE);
  console.log(`  Max exams/participant/month at 60,000 credits: ${examsPerParticipantPerMonth}`);
  return { cost, perParticipantCredits, perParticipantUsd, examsPerParticipantPerMonth };
}

const withLib = report("WITH fixed audio library generated (target state)", usageFor(false));
const withoutLib = report("WITHOUT library (today's fallback — ElevenLabs account still blocked)", usageFor(true));

console.log(`\n=== Fixed-library savings ===`);
const savingsChars = libraryCharsAvg;
const savingsUsdPerExam = (savingsChars / 1000) * TTS_USD_PER_1000_CHARACTERS_FLASH;
console.log(`  Characters saved from dynamic TTS per exam: ${savingsChars}`);
console.log(`  $ saved per exam (Flash v2.5 rate): $${savingsUsdPerExam.toFixed(4)}`);
console.log(`  Credits saved per exam (total room): ${(savingsChars * 0.5).toFixed(1)}`);
console.log(`  One-time v3 generation cost (24+24 phrases x 27 voices): ${(24 + 24) * 27} syntheses, ${((24 + 24) * 27 * 200 / 1000 * TTS_USD_PER_1000_CHARACTERS_V3).toFixed(2)} USD ballpark (avg ~200 chars/phrase x v3 rate)`);

console.log(`\n=== Safety-margin recommendation (WITH library) ===`);
const safeTarget = Math.floor(withLib.examsPerParticipantPerMonth * 0.8);
console.log(`  Theoretical max: ${withLib.examsPerParticipantPerMonth} exams/participant/month`);
console.log(`  Recommended safe target (80% of theoretical max): ${safeTarget} exams/participant/month`);
console.log(`  Credits remaining after ${safeTarget} exams: ${(USER_CREDIT_ALLOWANCE - safeTarget * withLib.perParticipantCredits).toFixed(0)}`);

console.log(`\n=== Cost table: exams/month -> cost/person, total cost, scale ===`);
for (const n of [1, 2, 4, 8, 12, 20, 90]) {
  const usdPerPerson = n * withLib.perParticipantUsd;
  const creditsPerPerson = n * withLib.perParticipantCredits;
  const overCap = creditsPerPerson > USER_CREDIT_ALLOWANCE;
  console.log(`  ${n.toString().padStart(2)} exams/mo: $${usdPerPerson.toFixed(3)}/person AI cost, ${creditsPerPerson.toFixed(0)} ElevenLabs credits/person${overCap ? "  *** EXCEEDS 60,000-credit allowance ***" : ""}`);
}
for (const users of [100, 1000, 10000]) {
  // perParticipantUsd is already ONE user's 50%-split share of one exam, so
  // total cost for N users each doing safeTarget exams/month is simply
  // users x safeTarget x perParticipantUsd — no further x2, that would
  // double-count (the other x2 is already "the other participant," a
  // different user in the pool, already counted separately when IT'S their
  // turn in the `users` count).
  const atSafeTarget = users * safeTarget * withLib.perParticipantUsd;
  console.log(`  ${users} users x ${safeTarget} exams/mo (safe target): $${atSafeTarget.toFixed(2)}/month total AI cost`);
}
