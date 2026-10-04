/**
 * Measured per-exam cost record (table muendlich_exam_costs). Called once when
 * a room ends. Everything stored is MEASURED usage — ElevenLabs characters
 * actually sent to TTS, Groq requests/billed seconds actually made, Claude
 * tokens straight from Anthropic's usage blocks for the examiner and for the
 * evaluation — priced at the vendors' published rates. So "what does an exam
 * really cost" becomes a SELECT over real exams instead of a simulation.
 *
 * Failure to write is logged and swallowed: a cost record must never affect an
 * exam.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamUsage } from "./costAccounting.js";
import { ttsCharactersToUsd, sttMinutesToUsd, groqSttMinutesToUsd, CLAUDE_CACHE_READ_MULTIPLIER, CLAUDE_CACHE_WRITE_MULTIPLIER } from "./costAccounting.js";

export interface TokenUsage { inputTokens: number; outputTokens: number; cacheCreationInputTokens: number; cacheReadInputTokens: number }
export const ZERO_TOKENS: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };

/** Published Anthropic API prices, USD per million tokens (input / output).
 * Cache write = 1.25x input, cache read = 0.1x input (costAccounting.ts). */
function claudeRatesPerMTok(model: string): { input: number; output: number } {
  if (/haiku/i.test(model)) return { input: 1, output: 5 }; // Claude Haiku 4.5
  if (/opus/i.test(model)) return { input: 5, output: 25 };
  return { input: 2, output: 10 }; // Claude Sonnet 5 (the repo's CLAUDE_USD_PER_MILLION_* constants)
}

export function tokensToUsd(t: TokenUsage, model: string): number {
  const r = claudeRatesPerMTok(model);
  const inRate = r.input / 1_000_000;
  return t.inputTokens * inRate + t.cacheCreationInputTokens * inRate * CLAUDE_CACHE_WRITE_MULTIPLIER + t.cacheReadInputTokens * inRate * CLAUDE_CACHE_READ_MULTIPLIER + t.outputTokens * (r.output / 1_000_000);
}

export function addTokens(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens, cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  };
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

export async function recordExamCost(admin: SupabaseClient, p: {
  sessionId: string; roomId: string; endReason: string; durationSeconds: number | null;
  usage: ExamUsage; examinerModel: string; evaluatorModel: string; evaluatorUsage: TokenUsage;
}): Promise<void> {
  const u = p.usage;
  const examiner: TokenUsage = {
    inputTokens: u.claudeInputTokens ?? 0, outputTokens: u.claudeOutputTokens ?? 0,
    cacheCreationInputTokens: u.claudeCacheCreationInputTokens ?? 0, cacheReadInputTokens: u.claudeCacheReadInputTokens ?? 0,
  };
  const backend = process.env.MUENDLICH_STT_BACKEND ?? "elevenlabs";
  const elevenLabsSttMinutes = u.sttMinutes ?? 0;
  const sttProvider = backend === "groq" ? (elevenLabsSttMinutes > 0 ? "groq+elevenlabs_failover" : "groq") : backend;

  const usdTts = ttsCharactersToUsd(u.ttsCharacters ?? 0);
  const usdStt = sttMinutesToUsd(elevenLabsSttMinutes) + groqSttMinutesToUsd(u.groqSttMinutes ?? 0);
  const usdExaminer = tokensToUsd(examiner, p.examinerModel);
  const usdEvaluator = tokensToUsd(p.evaluatorUsage, p.evaluatorModel);
  const usdTotal = usdTts + usdStt + usdExaminer + usdEvaluator;

  console.log(
    `[exam-cost] session=${p.sessionId} total=$${usdTotal.toFixed(4)} tts=$${usdTts.toFixed(4)}(${u.ttsCharacters ?? 0} chars) stt=$${usdStt.toFixed(4)}(${sttProvider}, groq ${u.groqRequests ?? 0} req / ${((u.groqSttMinutes ?? 0) * 60).toFixed(0)}s billed, forwarded ${(u.forwardedSttMinutes ?? 0).toFixed(1)} min) examiner=$${usdExaminer.toFixed(4)}(${p.examinerModel}) evaluator=$${usdEvaluator.toFixed(4)}`,
  );

  const { error } = await admin.from("muendlich_exam_costs").upsert({
    session_id: p.sessionId, room_id: p.roomId, end_reason: p.endReason, duration_seconds: p.durationSeconds,
    tts_characters: u.ttsCharacters ?? 0,
    stt_provider: sttProvider, stt_forwarded_minutes: u.forwardedSttMinutes ?? null,
    groq_requests: u.groqRequests ?? null, groq_billed_seconds: u.groqSttMinutes !== undefined ? Math.round((u.groqSttMinutes ?? 0) * 600) / 10 : null,
    elevenlabs_stt_minutes: elevenLabsSttMinutes,
    examiner_model: p.examinerModel,
    examiner_input_tokens: examiner.inputTokens, examiner_output_tokens: examiner.outputTokens,
    examiner_cache_write_tokens: examiner.cacheCreationInputTokens, examiner_cache_read_tokens: examiner.cacheReadInputTokens,
    evaluator_model: p.evaluatorModel,
    evaluator_input_tokens: p.evaluatorUsage.inputTokens, evaluator_output_tokens: p.evaluatorUsage.outputTokens,
    evaluator_cache_write_tokens: p.evaluatorUsage.cacheCreationInputTokens, evaluator_cache_read_tokens: p.evaluatorUsage.cacheReadInputTokens,
    usd_tts: round5(usdTts), usd_stt: round5(usdStt), usd_examiner: round5(usdExaminer), usd_evaluator: round5(usdEvaluator), usd_total: round5(usdTotal),
  }, { onConflict: "session_id" });
  if (error) console.error(`[exam-cost] failed to persist for session ${p.sessionId}:`, error.message);
}
