/**
 * ElevenLabs credit/cost accounting — the exact business rule given:
 *   1 character (TTS) = 0.5 ElevenLabs credits
 *   Each user gets a 60,000-credit allowance.
 *
 * STT (Scribe v2 Realtime) has no character count — ElevenLabs bills it by
 * audio duration, not text. Its credit rate isn't governed by the
 * 0.5-credits-per-character rule (that rule is explicitly a TTS rule), so
 * this file computes STT credits from ElevenLabs' own published per-minute
 * rate, kept as a clearly separate constant rather than force-fit into the
 * character formula. Sources (verified via ElevenLabs' own pricing pages,
 * not assumed):
 *   - TTS dollar cost: $0.10 per 1,000 characters (v2/v3) — elevenlabs.io/pricing/api
 *   - STT dollar cost: $0.39/hour for Scribe v2 REALTIME specifically (the
 *     batch/non-realtime tier is cheaper, $0.22/hour — this app only ever
 *     uses realtime, so batch's rate is not the relevant one)
 *   - STT credit rate: ElevenLabs' own credit-plan documentation states
 *     "~330 credits/minute" for standard (batch) Scribe. No separately
 *     published realtime-specific credits/minute figure was found — the
 *     value below scales that by the same ratio realtime's $/hour carries
 *     over batch's ($0.39/$0.22 = 1.773x), which is a reasoned estimate,
 *     not an ElevenLabs-published number. Flagged explicitly wherever it's
 *     used; replace STT_CREDITS_PER_MINUTE the moment ElevenLabs publishes
 *     (or your account dashboard shows) the real realtime figure.
 */

export const TTS_CREDITS_PER_CHARACTER = 0.5; // the exact given business rule
// $/1000-char dollar cost differs by MODEL even though the credit rule above
// is one flat given number — the live dynamic-TTS path defaults to Flash
// v2.5 (half the price of v2/v3), while the fixed-phrase LIBRARY is
// generated once, offline, with v3 (worth the extra quality since it's a
// one-time sunk cost, not a per-exam one — see elevenLabsTts.ts's header).
export const TTS_USD_PER_1000_CHARACTERS_FLASH = 0.05; // ElevenLabs published rate, Flash v2.5/Turbo — the live per-exam path
export const TTS_USD_PER_1000_CHARACTERS_V3 = 0.10; // ElevenLabs published rate, v2/v3 — one-time library generation only
/** @deprecated kept for any caller still expecting one flat TTS $ rate — use
 * the FLASH constant directly for real live-exam cost math. */
export const TTS_USD_PER_1000_CHARACTERS = TTS_USD_PER_1000_CHARACTERS_FLASH;

// Claude Sonnet 5 — real published API pricing (platform.claude.com/docs/en/about-claude/pricing).
export const CLAUDE_USD_PER_MILLION_INPUT_TOKENS = 2.0;
export const CLAUDE_USD_PER_MILLION_OUTPUT_TOKENS = 10.0;
// Prompt caching (5-minute ephemeral, the default — see examinerBrain.ts's
// cache_control usage): a cache WRITE costs 1.25x the base input rate, a
// cache READ costs 0.1x the base input rate — both real Anthropic-published
// multipliers, not estimated.
export const CLAUDE_CACHE_WRITE_MULTIPLIER = 1.25;
export const CLAUDE_CACHE_READ_MULTIPLIER = 0.1;

export const STT_BATCH_CREDITS_PER_MINUTE = 330; // ElevenLabs-published, batch Scribe
// CORRECTED from an earlier scaled/derived estimate (~585 credits/min,
// scaling the batch credit rate by the realtime-vs-batch $/hour ratio).
// Re-checked via ElevenLabs' own pricing/docs pages (elevenlabs.io/pricing,
// elevenlabs.io/pricing/api): the CREDIT-based subscription rate for
// Speech-to-Text is published flatly as 330 credits/minute, with no
// separate higher realtime figure — the $0.39-vs-$0.22-per-hour split only
// applies to pay-as-you-go API dollar billing, not to how credits are
// consumed under a subscription plan. Using the same 330 rate for both
// removes an unnecessary estimate now that clearer evidence exists; if
// ElevenLabs' dashboard ever shows a different real number for this
// account, replace this constant with that instead.
export const STT_REALTIME_CREDITS_PER_MINUTE = STT_BATCH_CREDITS_PER_MINUTE; // 330 — see above
export const STT_USD_PER_HOUR = 0.39; // ElevenLabs published rate, Scribe v2 Realtime

export const USER_CREDIT_ALLOWANCE = 60_000;

// ============================================================================
// Google Cloud (Chirp 3 HD TTS + Speech-to-Text) — real published 2026 rates,
// NOT live-tested (no GCP credentials in this repo — see googleTts.ts/
// googleStt.ts's headers). Neither draws from the ElevenLabs credit pool at
// all; both are billed separately, in real USD, by Google. Superseded as the
// STT recommendation by the self-hosted faster-whisper path below (Google
// STT alone costs more than the entire budget at real student-response STT
// durations — see finalCostModel.mjs) — kept as a lower-complexity fallback
// that's still far cheaper than ElevenLabs STT if standing up self-hosted
// infra isn't wanted yet.
export const GOOGLE_TTS_USD_PER_1000_CHARACTERS = 0.03; // Chirp 3 HD — docs.cloud.google.com/text-to-speech/docs/chirp3-hd
export const GOOGLE_STT_USD_PER_MINUTE = 0.016; // Speech-to-Text v2 streaming, base tier — cloud.google.com/speech-to-text/pricing

export function googleTtsCharactersToUsd(characters: number): number {
  return (characters / 1000) * GOOGLE_TTS_USD_PER_1000_CHARACTERS;
}

export function googleSttMinutesToUsd(minutes: number): number {
  return minutes * GOOGLE_STT_USD_PER_MINUTE;
}

// ============================================================================
// Self-hosted STT (faster-whisper — see ../../../whisper-server/) — THE
// real fix for STT cost at real student-response durations. Real published
// benchmark this session: $0.75/GPU-hour (L40S-class) at ~35x realtime
// audio throughput = $0.75/35 per audio-hour processed. Billed as real
// infra cost (serverless-GPU-style, pay only for actual compute time), not
// ElevenLabs credits — contributes $0 to totalCredits. German WER 2.628%
// (Whisper-large-v3-turbo, German-finetuned CTranslate2 build) — better
// than ElevenLabs Scribe's published 3.1% FLEURS WER.
export const SELF_HOSTED_STT_USD_PER_AUDIO_HOUR = 0.75 / 35;

export function selfHostedSttMinutesToUsd(minutes: number): number {
  return (minutes / 60) * SELF_HOSTED_STT_USD_PER_AUDIO_HOUR;
}

export function ttsCharactersToCredits(characters: number): number {
  return characters * TTS_CREDITS_PER_CHARACTER;
}

export function ttsCharactersToUsd(characters: number): number {
  return (characters / 1000) * TTS_USD_PER_1000_CHARACTERS;
}

export function sttMinutesToCredits(minutes: number): number {
  return minutes * STT_REALTIME_CREDITS_PER_MINUTE;
}

export function sttMinutesToUsd(minutes: number): number {
  return (minutes / 60) * STT_USD_PER_HOUR;
}

export interface ExamUsage {
  ttsCharacters: number;
  sttMinutes: number;
  /** Real Anthropic-reported token counts (examinerBrain.ts's onUsage
   * callback) — optional so every existing ExamUsage literal in this
   * codebase (tests, fallback zero-usage objects) keeps compiling; treated
   * as 0 when absent. Claude cost is tracked for real business-cost
   * reporting but is explicitly NOT part of the ElevenLabs 60,000-credit
   * allowance — that allowance is an ElevenLabs-specific rule the user gave
   * ("1 character = 0.5 credits"), Claude is a separate vendor with its own
   * $/token pricing and no "credit" concept at all. */
  claudeInputTokens?: number;
  claudeOutputTokens?: number;
  claudeCacheCreationInputTokens?: number;
  claudeCacheReadInputTokens?: number;
  /** Real usage on the Google Cloud hybrid path (Architecture C) — separate
   * from ttsCharacters/sttMinutes above, which remain ElevenLabs-specific
   * (they feed ttsCredits/sttCredits, the 60,000-credit-allowance math).
   * These two fields add to totalUsd but contribute ZERO credits, since
   * Google isn't billed against the ElevenLabs allowance at all. */
  googleTtsCharacters?: number;
  googleSttMinutes?: number;
  /** Real usage on the self-hosted STT path (MUENDLICH_STT_BACKEND=whisper)
   * — separate from sttMinutes above (ElevenLabs-specific) so a session
   * that used Whisper doesn't get incorrectly billed ElevenLabs STT
   * credits/dollars for audio ElevenLabs never touched. Contributes to
   * totalUsd at the near-zero self-hosted rate, ZERO ElevenLabs credits. */
  selfHostedSttMinutes?: number;
}

export interface ExamCost {
  ttsCredits: number;
  sttCredits: number;
  totalCredits: number;
  ttsUsd: number;
  sttUsd: number;
  claudeUsd: number;
  /** Google Cloud portion, $0 unless googleTtsCharacters/googleSttMinutes
   * were set on the input ExamUsage — see its doc comment. */
  googleUsd: number;
  /** Self-hosted STT portion, $0 unless selfHostedSttMinutes was set. */
  selfHostedUsd: number;
  /** ttsUsd + sttUsd + claudeUsd + googleUsd + selfHostedUsd — the REAL
   * total AI cost of the exam (what the business pays across every vendor
   * involved), distinct from totalCredits (ElevenLabs' own internal
   * accounting unit, used only for the 60,000-credit allowance, not a
   * dollar figure — Google/self-hosted usage contributes $0 credits by
   * design). */
  totalUsd: number;
}

/** Real Anthropic cache-aware cost: cache-creation tokens are billed at
 * 1.25x the base input rate, cache-read tokens at 0.1x, and any remaining
 * (uncached) input tokens at the full base rate — mirrors exactly how
 * Anthropic itself bills a cached request, not a flat estimate. */
export function claudeUsageToUsd(usage: Pick<ExamUsage, "claudeInputTokens" | "claudeOutputTokens" | "claudeCacheCreationInputTokens" | "claudeCacheReadInputTokens">): number {
  const inputTokens = usage.claudeInputTokens ?? 0;
  const outputTokens = usage.claudeOutputTokens ?? 0;
  const cacheCreation = usage.claudeCacheCreationInputTokens ?? 0;
  const cacheRead = usage.claudeCacheReadInputTokens ?? 0;
  const baseRate = CLAUDE_USD_PER_MILLION_INPUT_TOKENS / 1_000_000;
  const inputUsd = inputTokens * baseRate;
  const cacheCreationUsd = cacheCreation * baseRate * CLAUDE_CACHE_WRITE_MULTIPLIER;
  const cacheReadUsd = cacheRead * baseRate * CLAUDE_CACHE_READ_MULTIPLIER;
  const outputUsd = outputTokens * (CLAUDE_USD_PER_MILLION_OUTPUT_TOKENS / 1_000_000);
  return inputUsd + cacheCreationUsd + cacheReadUsd + outputUsd;
}

export function computeExamCost(usage: ExamUsage): ExamCost {
  const ttsCredits = ttsCharactersToCredits(usage.ttsCharacters);
  const sttCredits = sttMinutesToCredits(usage.sttMinutes);
  const ttsUsd = ttsCharactersToUsd(usage.ttsCharacters);
  const sttUsd = sttMinutesToUsd(usage.sttMinutes);
  const claudeUsd = claudeUsageToUsd(usage);
  const googleUsd = googleTtsCharactersToUsd(usage.googleTtsCharacters ?? 0) + googleSttMinutesToUsd(usage.googleSttMinutes ?? 0);
  const selfHostedUsd = selfHostedSttMinutesToUsd(usage.selfHostedSttMinutes ?? 0);
  return {
    ttsCredits, sttCredits, totalCredits: ttsCredits + sttCredits,
    ttsUsd, sttUsd, claudeUsd, googleUsd, selfHostedUsd,
    totalUsd: ttsUsd + sttUsd + claudeUsd + googleUsd + selfHostedUsd,
  };
}

export function examsPerAllowance(creditsPerExam: number, allowance = USER_CREDIT_ALLOWANCE): number {
  if (creditsPerExam <= 0) return Infinity;
  return Math.floor(allowance / creditsPerExam);
}
