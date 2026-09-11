/**
 * pipelinedHarness.ts — the genuinely pipelined architecture:
 *
 *   Deepgram UtteranceEnd
 *     -> Claude streaming (SSE), first token as soon as it arrives
 *       -> as soon as a sentence-level chunk is ready, immediately
 *          appendText() to an already-open Cartesia streaming context
 *       -> Cartesia starts speaking chunk 1 while Claude is still
 *          generating chunk 2+
 *
 * Compare against harness.ts's runOnce(), which is the ORIGINAL sequential
 * architecture (Deepgram complete -> wait -> Claude complete -> wait ->
 * Cartesia complete) — this file exists specifically to measure the actual,
 * not theoretical, improvement from pipelining.
 *
 * Usage:
 *   npm run pipelined                  one turn
 *   npm run pipelined -- --runs=40     the real benchmark (report requires 30-50)
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readWav, resamplePcm16, writeWav, type PcmAudio } from "./wav.js";
import { openDeepgramStream } from "./deepgramStt.js";
import { getExaminerReplyStreaming } from "./claudeExaminerBrain.js";
import { openCartesiaConnection, closeCartesiaConnection, startStreamingSynthesis, CARTESIA_OUTPUT_SAMPLE_RATE } from "./cartesiaTts.js";
import { pickSessionVoice } from "./voicePool.js";
import { makeInitialExamState } from "./examState.js";

const ROOT = join(import.meta.dirname, "..");
const FIXTURES_DIR = join(ROOT, "fixtures");
const OUT_DIR = join(ROOT, "out");
const DEEPGRAM_SAMPLE_RATE = 16000;
const FRAME_MS = 20;

function loadFixtureAt16k(filename: string): PcmAudio {
  const path = join(FIXTURES_DIR, filename);
  if (!existsSync(path)) throw new Error(`Missing fixture ${path} — run "npm run make-fixture" first`);
  const audio = readWav(readFileSync(path));
  const pcm16k = resamplePcm16(audio.pcm, audio.sampleRate, DEEPGRAM_SAMPLE_RATE);
  return { sampleRate: DEEPGRAM_SAMPLE_RATE, channels: 1, pcm: pcm16k };
}

/** Elapsed-time-based catch-up pacing — same fix applied to the realtime
 * prototype after a naive per-tick loop was found to drift badly under
 * real per-call overhead (see realtime-voice-pipeline/src/harness.ts's
 * header comment for the full diagnostic). */
function streamRealTime(session: { sendPcm16(c: Buffer): void; finish(): void }, pcm: Buffer): Promise<void> {
  const frameBytes = Math.round(DEEPGRAM_SAMPLE_RATE * (FRAME_MS / 1000)) * 2;
  const totalFrames = Math.ceil(pcm.length / frameBytes);
  const t0 = Date.now();
  return new Promise((resolve) => {
    let framesSent = 0;
    const timer = setInterval(() => {
      const elapsed = Date.now() - t0;
      const framesDue = Math.min(totalFrames, Math.floor(elapsed / FRAME_MS) + 1);
      while (framesSent < framesDue) {
        session.sendPcm16(pcm.subarray(framesSent * frameBytes, (framesSent + 1) * frameBytes));
        framesSent++;
      }
      if (framesSent >= totalFrames) {
        clearInterval(timer);
        session.finish();
        resolve();
      }
    }, FRAME_MS);
  });
}

interface StageTimestamps {
  speechEndAt: number;        // Deepgram UtteranceEnd — "user speech end"
  claudeRequestAt: number;
  claudeFirstTokenAt: number;
  claudeFirstChunkReadyAt: number; // first sentence-level chunk complete
  cartesiaFirstChunkSentAt: number;
  cartesiaFirstAudioAt: number;
  cartesiaDoneAt: number;
  claudeDoneAt: number;
  fillerFirstAudioAt: number; // UX-masking filler leg, if enabled — NOT the same thing as true model TTFA
}

/** Backchannel filler phrases — short, natural, content-free, safe to say
 * before Claude has even been asked anything (never risks pre-empting or
 * contradicting the real answer). This is PERCEIVED-latency masking, not a
 * reduction in true model TTFA — reported as a clearly separate number,
 * never folded into or presented as the real Claude/Cartesia latency. */
const FILLER_PHRASES = ["Mhm.", "Ich verstehe.", "Okay."];

export interface PipelinedTurnResult {
  runId: string;
  ok: boolean;
  error?: string;
  sessionVoice: { id: string; name: string; gender: string };
  recognizedText: string;
  claudeReply: string;
  claudeInputTokens: number;
  claudeOutputTokens: number;
  stages: {
    speechEndToDeepgramTranscriptMs: number; // ~0 by construction (UtteranceEnd IS the transcript-ready signal); kept for the report's exact requested breakdown
    deepgramTranscriptToClaudeFirstTokenMs: number;
    claudeFirstTokenToCartesiaFirstAudioMs: number;
    claudeFirstChunkToCartesiaFirstAudioMs: number; // the more precise version: from the actual text handed to Cartesia, not from the raw first token
    totalSpeechEndToFirstAudioMs: number;
    totalSpeechEndToCompleteMs: number;
    /** UX-masking only — null unless useFiller is passed. This is PERCEIVED
     * latency (a backchannel sound playing while Claude is still thinking),
     * never the true model TTFA. Reported as its own field specifically so
     * it can never be confused with or silently substituted for the real
     * totalSpeechEndToFirstAudioMs number above. */
    speechEndToFillerAudioMs: number | null;
  };
}

export async function runPipelinedTurn(runId: string, useFiller = false): Promise<PipelinedTurnResult> {
  const state = makeInitialExamState();
  const fixture = loadFixtureAt16k(process.env.BENCHMARK_FIXTURE ?? "short-utterance.wav");
  const sessionVoice = pickSessionVoice();

  const t: Partial<StageTimestamps> = {};
  let recognizedText = "";

  // OPTIMIZATION 1: start the Cartesia connection handshake (~800ms,
  // measured) CONCURRENTLY with Deepgram listening, instead of after
  // UtteranceEnd fires. These are genuinely independent operations — Cartesia
  // doesn't need any recognized text to open a socket, only to actually
  // synthesize. Previously this was fully sequential (open connection, THEN
  // start Claude), wasting the connection's own setup time on the critical
  // path every single turn even though it overlaps for free with the several
  // seconds the candidate spends actually talking.
  const cartesiaConnPromise = openCartesiaConnection();

  // OPTIMIZATION 4 (the single biggest win found): trigger on Deepgram's own
  // per-segment `speech_final` signal instead of waiting for the separate
  // UtteranceEnd event. Measured live: speech_final fires 950ms-5.9s EARLIER
  // than UtteranceEnd (the gap scales with utterance length, since
  // UtteranceEnd always adds the full utterance_end_ms=1000 window on top
  // of whatever speech_final already decided). Verified NOT to fire
  // prematurely on natural mid-sentence pauses in the long multi-sentence
  // fixture (fired exactly once, at the true end) — a real, validated
  // signal, not the same class of false-positive-prone heuristic as the
  // failed speculative-execution experiment. UtteranceEnd is kept as a
  // fallback in case speech_final never fires for some utterance.
  const utteranceEndPromise = new Promise<void>((resolve) => {
    (async () => {
      const dg = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
        onFinal(text) { recognizedText = recognizedText ? `${recognizedText} ${text}` : text; },
        onSpeechFinal(_text, atMs) {
          // onFinal (above) already fired for this same Results message
          // and appended its text to recognizedText before speech_final is
          // checked (see deepgramStt.ts) — nothing further to accumulate here.
          if (!t.speechEndAt) { t.speechEndAt = atMs; dg.close(); resolve(); }
        },
        onUtteranceEnd(atMs) { if (!t.speechEndAt) { t.speechEndAt = atMs; dg.close(); resolve(); } }, // fallback only
      });
      const sendDone = streamRealTime(dg, fixture.pcm);
      await Promise.race([
        new Promise<void>((res) => { const iv = setInterval(() => { if (t.speechEndAt) { clearInterval(iv); res(); } }, 30); }),
        sendDone.then(() => new Promise((res) => setTimeout(res, 1500))),
      ]);
      if (!t.speechEndAt) resolve(); // fallthrough — caller checks and reports failure
    })();
  });

  try {
    await utteranceEndPromise;
    if (!t.speechEndAt) throw new Error("Deepgram never fired UtteranceEnd");

    const cartesiaConn = await cartesiaConnPromise; // already open (or nearly) by now — see OPTIMIZATION 1 above
    const audioChunks: Buffer[] = [];
    const ttsStream = startStreamingSynthesis(cartesiaConn, sessionVoice.id, {
      onFirstChunk(atMs) { t.cartesiaFirstAudioAt = atMs; if (useFiller && !t.fillerFirstAudioAt) t.fillerFirstAudioAt = atMs; },
      onChunk(pcm) { audioChunks.push(pcm); },
      onDone(atMs) { t.cartesiaDoneAt = atMs; },
    });
    // RELIABILITY FIX: a genuine transient Cartesia error (caught live —
    // crashed the whole process with "Error: Cartesia synthesis error")
    // was going unhandled because ttsStream.done can reject at any time
    // (event-driven, tied to when the WS receives an error message) but
    // wasn't actually awaited until much later in this function, after the
    // full Claude call. Node flags a promise as an unhandled rejection the
    // moment it rejects with no handler attached yet — attaching .catch()
    // here immediately, at creation, closes that window regardless of when
    // the code later reaches `await ttsStream.done`.
    let ttsError: unknown = null;
    ttsStream.done.catch((e) => { ttsError = e; });

    // UX-masking filler (perceived latency only — see FILLER_PHRASES's own
    // comment). Sent into the SAME Cartesia context as continue:true, so it
    // flows into the real reply as one natural utterance rather than a
    // separate clip with a gap. Fired BEFORE the Claude call even starts.
    if (useFiller) {
      const filler = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
      ttsStream.appendText(filler, false);
    }

    t.claudeRequestAt = Date.now();
    let firstChunkSent = false;
    const claudeResult = await getExaminerReplyStreaming(state, recognizedText || "(keine Transkription empfangen)", {
      onFirstToken(atMs) { t.claudeFirstTokenAt = atMs; },
      onChunk(text, atMs) {
        if (!t.claudeFirstChunkReadyAt) t.claudeFirstChunkReadyAt = atMs;
        if (!firstChunkSent) { firstChunkSent = true; t.cartesiaFirstChunkSentAt = Date.now(); }
        ttsStream.appendText(text, false);
      },
      onDone(atMs) {
        t.claudeDoneAt = atMs;
        // Flush a trailing space as the final (continue:false) message if
        // no chunk closed it already — extractReadyChunks(..., true) inside
        // getExaminerReplyStreaming already emits any leftover text as a
        // final onChunk call before onDone fires, so this just closes the
        // Cartesia context if somehow nothing was ever sent.
        if (!firstChunkSent) { firstChunkSent = true; ttsStream.appendText(" ", true); }
      },
    });
    await ttsStream.done.catch(() => {}); // real error (if any) already captured in ttsError above; re-thrown below
    closeCartesiaConnection(cartesiaConn);
    if (ttsError) throw ttsError;
    writeFileSync(join(OUT_DIR, `${runId}-reply.wav`), writeWav({ sampleRate: CARTESIA_OUTPUT_SAMPLE_RATE, channels: 1, pcm: Buffer.concat(audioChunks) }));

    const speechEndAt = t.speechEndAt!;
    const firstAudioAt = t.cartesiaFirstAudioAt!;
    const stages = {
      speechEndToDeepgramTranscriptMs: 0,
      deepgramTranscriptToClaudeFirstTokenMs: (t.claudeFirstTokenAt ?? t.claudeRequestAt!) - speechEndAt,
      claudeFirstTokenToCartesiaFirstAudioMs: firstAudioAt - (t.claudeFirstTokenAt ?? t.claudeRequestAt!),
      claudeFirstChunkToCartesiaFirstAudioMs: firstAudioAt - (t.claudeFirstChunkReadyAt ?? t.claudeRequestAt!),
      totalSpeechEndToFirstAudioMs: firstAudioAt - speechEndAt,
      totalSpeechEndToCompleteMs: Math.max(t.cartesiaDoneAt ?? 0, t.claudeDoneAt ?? 0) - speechEndAt,
      speechEndToFillerAudioMs: useFiller && t.fillerFirstAudioAt ? t.fillerFirstAudioAt - speechEndAt : null,
    };

    return {
      runId, ok: true, sessionVoice, recognizedText,
      claudeReply: claudeResult.reply, claudeInputTokens: claudeResult.inputTokens, claudeOutputTokens: claudeResult.outputTokens,
      stages,
    };
  } catch (e) {
    return {
      runId, ok: false, error: e instanceof Error ? e.message : String(e), sessionVoice, recognizedText,
      claudeReply: "", claudeInputTokens: 0, claudeOutputTokens: 0,
      stages: { speechEndToDeepgramTranscriptMs: 0, deepgramTranscriptToClaudeFirstTokenMs: 0, claudeFirstTokenToCartesiaFirstAudioMs: 0, claudeFirstChunkToCartesiaFirstAudioMs: 0, totalSpeechEndToFirstAudioMs: 0, totalSpeechEndToCompleteMs: 0, speechEndToFillerAudioMs: null },
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function summarize(label: string, values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const median = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  console.log(`${label.padEnd(45)} avg=${avg.toFixed(0)}ms  median=${median}ms  p95=${p95}ms  min=${sorted[0]}ms  max=${sorted[sorted.length - 1]}ms`);
  return { avg, median, p95, min: sorted[0], max: sorted[sorted.length - 1] };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const runs = Number(args.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 1);
  const useFiller = args.includes("--filler");

  const missing = ["DEEPGRAM_API_KEY", "CARTESIA_API_KEY", "ANTHROPIC_API_KEY"].filter((k) => !process.env[k]);
  if (missing.length) { console.log(`FAIL: missing env vars: ${missing.join(", ")}`); process.exit(1); }

  const results: PipelinedTurnResult[] = [];
  for (let i = 0; i < runs; i++) {
    const r = await runPipelinedTurn(`pturn${Date.now()}-${i}`, useFiller);
    results.push(r);
    if (r.ok) {
      const fillerNote = r.stages.speechEndToFillerAudioMs != null ? `  [filler-audio=${r.stages.speechEndToFillerAudioMs}ms]` : "";
      console.log(`[${i + 1}/${runs}] first-audio=${r.stages.totalSpeechEndToFirstAudioMs}ms  complete=${r.stages.totalSpeechEndToCompleteMs}ms${fillerNote}  reply="${r.claudeReply.slice(0, 60)}"`);
    } else {
      console.log(`[${i + 1}/${runs}] FAILED: ${r.error}`);
    }
  }

  writeFileSync(join(OUT_DIR, `pipelined-benchmark-${Date.now()}.json`), JSON.stringify(results, null, 2), "utf8");

  const ok = results.filter((r) => r.ok);
  console.log(`\n${ok.length}/${results.length} turns succeeded\n`);
  if (ok.length) {
    summarize("2. Deepgram transcript -> Claude first token", ok.map((r) => r.stages.deepgramTranscriptToClaudeFirstTokenMs));
    summarize("3. Claude first token -> Cartesia first audio", ok.map((r) => r.stages.claudeFirstTokenToCartesiaFirstAudioMs));
    summarize("3b. Claude first CHUNK -> Cartesia first audio", ok.map((r) => r.stages.claudeFirstChunkToCartesiaFirstAudioMs));
    summarize("5. TOTAL speech-end -> first audible response", ok.map((r) => r.stages.totalSpeechEndToFirstAudioMs));
    summarize("6. TOTAL speech-end -> complete response", ok.map((r) => r.stages.totalSpeechEndToCompleteMs));
  }
  process.exit(ok.length === results.length ? 0 : 1);
}

main();
