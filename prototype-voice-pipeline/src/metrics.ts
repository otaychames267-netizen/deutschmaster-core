/** Timestamp capture + report generation for one harness run. Mirrors the
 * plain console-report style already used in scripts/muendlich-e2e.ts and
 * scripts/verify-claude.ts (ok(name, cond) console logging), rather than
 * inventing a new format. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface RunTimestamps {
  t0_audioStreamStart?: number;
  t1_firstInterim?: number;
  t2_lastFinalSegment?: number;
  t3_utteranceEnd?: number;
  t4_claudeRequestStart?: number;
  t5_claudeReplyReceived?: number;
  t6_cartesiaRequestStart?: number;
  t7_cartesiaFirstAudio?: number;
  t8_cartesiaDone?: number;
  t9_outputWritten?: number;
}

export interface RunResult {
  runId: string;
  ok: boolean;
  error?: string;
  /** The one Cartesia voice picked for this session (see voicePool.ts) —
   * recorded for reproducibility, since it's chosen randomly per session. */
  sessionVoice: { id: string; name: string; gender: string };
  timestamps: RunTimestamps;
  transcript: {
    recognizedText: string;
    scriptedText: string;
    confidence: number | null;
    claudeReply: string;
    claudeInputTokens: number;
    claudeOutputTokens: number;
  };
  derived: Record<string, number | null>;
}

function ms(a?: number, b?: number): number | null {
  if (a == null || b == null) return null;
  return b - a;
}

export function deriveMetrics(t: RunTimestamps): Record<string, number | null> {
  return {
    "1a_deepgram_first_interim_ms": ms(t.t0_audioStreamStart, t.t1_firstInterim),
    "1b_deepgram_finalization_ms": ms(t.t2_lastFinalSegment, t.t3_utteranceEnd),
    "2_claude_processing_ms": ms(t.t4_claudeRequestStart, t.t5_claudeReplyReceived),
    "3a_cartesia_time_to_first_audio_ms": ms(t.t6_cartesiaRequestStart, t.t7_cartesiaFirstAudio),
    "3b_cartesia_total_synthesis_ms": ms(t.t6_cartesiaRequestStart, t.t8_cartesiaDone),
    "4a_end_to_end_to_first_audio_ms": ms(t.t3_utteranceEnd, t.t7_cartesiaFirstAudio),
    "4b_end_to_end_full_reply_ms": ms(t.t3_utteranceEnd, t.t8_cartesiaDone),
  };
}

export function writeRunReport(outDir: string, result: RunResult): void {
  writeFileSync(join(outDir, `${result.runId}-metrics.json`), JSON.stringify(result, null, 2), "utf8");
  const lines = [
    `Run ${result.runId} — Teil-1 prototype pipeline`,
    `Session voice : ${result.sessionVoice.name} (${result.sessionVoice.id}, ${result.sessionVoice.gender})`,
    `Scripted text : ${result.transcript.scriptedText}`,
    `Recognized    : ${result.transcript.recognizedText} (confidence=${result.transcript.confidence ?? "n/a"})`,
    `Claude reply  : ${result.transcript.claudeReply}`,
    `Claude tokens : in=${result.transcript.claudeInputTokens} out=${result.transcript.claudeOutputTokens}`,
    "",
    "Metric (ms):",
    ...Object.entries(result.derived).map(([k, v]) => `  ${k.padEnd(38)} ${v ?? "n/a"}`),
  ];
  writeFileSync(join(outDir, `${result.runId}-transcript.txt`), lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
}

export function ok(name: string, cond: boolean): void {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}`);
}
