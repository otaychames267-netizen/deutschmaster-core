import {
  ttsCharactersToCredits, ttsCharactersToUsd, sttMinutesToCredits, sttMinutesToUsd, computeExamCost,
  claudeUsageToUsd, examsPerAllowance, USER_CREDIT_ALLOWANCE, TTS_CREDITS_PER_CHARACTER,
  TTS_USD_PER_1000_CHARACTERS_FLASH, TTS_USD_PER_1000_CHARACTERS_V3,
  CLAUDE_USD_PER_MILLION_INPUT_TOKENS, CLAUDE_USD_PER_MILLION_OUTPUT_TOKENS,
  googleTtsCharactersToUsd, googleSttMinutesToUsd, GOOGLE_TTS_USD_PER_1000_CHARACTERS, GOOGLE_STT_USD_PER_MINUTE,
  selfHostedSttMinutesToUsd, SELF_HOSTED_STT_USD_PER_AUDIO_HOUR,
} from "./costAccounting.ts";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}
function approx(a, b, eps = 1e-6) { return Math.abs(a - b) < eps; }

// The exact given rule: 1 character = 0.5 credits
ok("TTS_CREDITS_PER_CHARACTER is exactly 0.5", TTS_CREDITS_PER_CHARACTER === 0.5);
ok("1000 characters = 500 credits", ttsCharactersToCredits(1000) === 500);
ok("60,000 credits = 120,000 characters (the user's own stated equivalence)", approx(120_000 * TTS_CREDITS_PER_CHARACTER, USER_CREDIT_ALLOWANCE));

// TTS dollar math: live dynamic path defaults to Flash v2.5 ($0.05/1000
// chars, half of v2/v3's $0.10) — ttsCharactersToUsd models the LIVE path,
// since that's what actually runs per-exam; v3's $0.10 rate only applies to
// the one-time, offline phrase-library generation (checked separately below).
ok("Flash v2.5 rate is exactly half the v3 rate", approx(TTS_USD_PER_1000_CHARACTERS_FLASH * 2, TTS_USD_PER_1000_CHARACTERS_V3));
ok("1000 chars TTS (live, Flash v2.5) costs $0.05", approx(ttsCharactersToUsd(1000), 0.05));
ok("120,000 chars (full 60k-credit allowance) TTS costs $6.00", approx(ttsCharactersToUsd(120_000), 6.00));

// STT dollar math: $0.39/hour realtime
ok("60 minutes of STT costs $0.39", approx(sttMinutesToUsd(60), 0.39));
ok("1 minute of STT costs $0.0065", approx(sttMinutesToUsd(1), 0.0065, 1e-4));

// Claude dollar math: real published Sonnet 5 rates ($2/M in, $10/M out),
// plus real Anthropic prompt-caching multipliers (1.25x write, 0.1x read).
ok("1M Claude input tokens (uncached) costs $2", approx(claudeUsageToUsd({ claudeInputTokens: 1_000_000 }), CLAUDE_USD_PER_MILLION_INPUT_TOKENS));
ok("1M Claude output tokens costs $10", approx(claudeUsageToUsd({ claudeOutputTokens: 1_000_000 }), CLAUDE_USD_PER_MILLION_OUTPUT_TOKENS));
ok("1M cache-creation tokens costs 1.25x the base input rate ($2.50)", approx(claudeUsageToUsd({ claudeCacheCreationInputTokens: 1_000_000 }), 2.5));
ok("1M cache-read tokens costs 0.1x the base input rate ($0.20)", approx(claudeUsageToUsd({ claudeCacheReadInputTokens: 1_000_000 }), 0.20));
ok("empty/absent Claude usage costs $0 (optional fields default to 0)", claudeUsageToUsd({}) === 0);

// Google Cloud dollar math (Architecture C — hybrid path, real published
// 2026 rates, NOT live-tested — see googleTts.ts/googleStt.ts headers).
ok("1000 chars Google Chirp3 HD TTS costs $0.03", approx(googleTtsCharactersToUsd(1000), GOOGLE_TTS_USD_PER_1000_CHARACTERS));
ok("1 minute Google STT costs $0.016", approx(googleSttMinutesToUsd(1), GOOGLE_STT_USD_PER_MINUTE));
ok("Google Chirp3 HD TTS is cheaper per char than ElevenLabs Flash v2.5", GOOGLE_TTS_USD_PER_1000_CHARACTERS < TTS_USD_PER_1000_CHARACTERS_FLASH);

// Self-hosted STT dollar math (faster-whisper — real published benchmark:
// $0.75/GPU-hour @ 35x realtime).
ok("1 audio-hour self-hosted STT costs $0.0214", approx(selfHostedSttMinutesToUsd(60), SELF_HOSTED_STT_USD_PER_AUDIO_HOUR, 1e-3));
ok("self-hosted STT is far cheaper per minute than Google STT", selfHostedSttMinutesToUsd(1) < googleSttMinutesToUsd(1) / 10);

// Combined exam cost
const cost = computeExamCost({ ttsCharacters: 2000, sttMinutes: 10 });
ok("combined cost sums TTS+STT credits correctly", approx(cost.totalCredits, cost.ttsCredits + cost.sttCredits));
ok("combined cost sums TTS+STT+Claude+Google usd correctly", approx(cost.totalUsd, cost.ttsUsd + cost.sttUsd + cost.claudeUsd + cost.googleUsd));
ok("no Claude usage given -> claudeUsd is 0", cost.claudeUsd === 0);
ok("no Google usage given -> googleUsd is 0", cost.googleUsd === 0);

// Google usage contributes to totalUsd but NEVER to totalCredits (it isn't
// billed against the ElevenLabs allowance at all) — the whole point of the
// hybrid architecture.
const hybridCost = computeExamCost({ ttsCharacters: 0, sttMinutes: 0, googleTtsCharacters: 16000, googleSttMinutes: 9 });
ok("Google usage adds real $ cost", hybridCost.googleUsd > 0);
ok("Google usage contributes ZERO ElevenLabs credits", hybridCost.totalCredits === 0);

// Exams-per-allowance
ok("2000 credits/exam -> 30 exams from 60,000", examsPerAllowance(2000) === 30);
ok("0 credits/exam -> Infinity (guard against div-by-zero)", examsPerAllowance(0) === Infinity);

console.log("\nAll cost-accounting math tests completed.");
