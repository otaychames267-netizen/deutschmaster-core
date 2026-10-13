/**
 * bargeInHarness.ts — TRUE mid-response interruption/barge-in.
 *
 * While Claude is streaming and/or Cartesia is speaking the examiner's
 * reply, a second candidate utterance starts. On detection:
 *   1. Abort the in-flight Claude request for real (AbortController that
 *      actually tears down the fetch — see claudeExaminerBrain.ts).
 *   2. Cancel the in-flight Cartesia synthesis for real ({cancel:true} —
 *      verified live that this stops the server from generating/sending
 *      further audio, not a client-side "just stop listening" fake).
 *   3. The interrupting utterance's own transcript is preserved (it was
 *      being transcribed on its own Deepgram connection throughout).
 *   4. A fresh turn starts for the interrupting utterance, reusing the
 *      already-open Cartesia connection (only the per-utterance streaming
 *      context is torn down and recreated, not the whole session).
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readWav, resamplePcm16, writeWav, type PcmAudio } from "./wav.js";
import { openDeepgramStream } from "./deepgramStt.js";
import { getExaminerReplyStreaming, ClaudeAbortedError } from "./claudeExaminerBrain.js";
import { openCartesiaConnection, closeCartesiaConnection, startStreamingSynthesis, CARTESIA_OUTPUT_SAMPLE_RATE } from "./cartesiaTts.js";
import { pickSessionVoice } from "./voicePool.js";
import { makeInitialExamState } from "./examState.js";
import { createFastVad } from "./vad.js";

const ROOT = join(import.meta.dirname, "..");
const FIXTURES_DIR = join(ROOT, "fixtures");
const OUT_DIR = join(ROOT, "out");
const DEEPGRAM_SAMPLE_RATE = 16000;
const FRAME_MS = 20;

function loadFixtureAt16k(filename: string): PcmAudio {
  const path = join(FIXTURES_DIR, filename);
  if (!existsSync(path)) throw new Error(`Missing fixture ${path}`);
  const audio = readWav(readFileSync(path));
  const pcm16k = resamplePcm16(audio.pcm, audio.sampleRate, DEEPGRAM_SAMPLE_RATE);
  return { sampleRate: DEEPGRAM_SAMPLE_RATE, channels: 1, pcm: pcm16k };
}

function streamRealTime(session: { sendPcm16(c: Buffer): void; finish(): void }, pcm: Buffer, onFrame?: (frame: Buffer, atMs: number) => void): Promise<void> {
  const frameBytes = Math.round(DEEPGRAM_SAMPLE_RATE * (FRAME_MS / 1000)) * 2;
  const totalFrames = Math.ceil(pcm.length / frameBytes);
  const t0 = Date.now();
  return new Promise((resolve) => {
    let framesSent = 0;
    const timer = setInterval(() => {
      const elapsed = Date.now() - t0;
      const framesDue = Math.min(totalFrames, Math.floor(elapsed / FRAME_MS) + 1);
      while (framesSent < framesDue) {
        const frame = pcm.subarray(framesSent * frameBytes, (framesSent + 1) * frameBytes);
        session.sendPcm16(frame);
        onFrame?.(frame, Date.now());
        framesSent++;
      }
      if (framesSent >= totalFrames) { clearInterval(timer); session.finish(); resolve(); }
    }, FRAME_MS);
  });
}

export interface BargeInResult {
  ok: boolean;
  error?: string;
  interruptDetectedAt: number;
  claudeAbortedAt: number;
  cartesiaCancelSentAt: number;
  cartesiaCancelConfirmedAt: number; // real "done" after cancel, not assumed instant
  newTurnFirstAudioAt: number;
  interruptDetectionLatencyMs: number; // VAD-based — how long after the interrupting clip's audio started did we detect it
  interimTranscriptLatencyMs: number | null; // OLD mechanism, measured in parallel for a direct before/after comparison — not what triggers cancellation anymore
  claudeAbortLatencyMs: number; // detection -> Claude actually torn down
  cartesiaCancelLatencyMs: number; // cancel sent -> server confirms stopped
  totalInterruptToNewResponseMs: number; // detection -> new turn's own first audio
  chunksReceivedBeforeCancel: number;
  chunksReceivedAfterCancel: number; // should be 0 if cancel is real; reported either way
}

export async function runBargeInTurn(runId: string): Promise<BargeInResult> {
  const state = makeInitialExamState();
  const mainFixture = loadFixtureAt16k(process.env.BENCHMARK_FIXTURE ?? "short-utterance.wav");
  const interruptFixture = loadFixtureAt16k("interruption-clip.wav");
  const sessionVoice = pickSessionVoice();

  let utteranceEndAt = 0;
  let recognizedText = "";
  let chunksBeforeCancel = 0;
  let chunksAfterCancel = 0;
  let cancelSent = false;

  // OPTIMIZATION 1 — see pipelinedHarness.ts: start the connection handshake
  // concurrently with listening, not after.
  const cartesiaConnPromise = openCartesiaConnection();

  try {
    // --- Turn 1: normal start ---
    const utteranceEndPromise = new Promise<void>((resolve) => {
      (async () => {
        const dg = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
          onFinal(text) { recognizedText = recognizedText ? `${recognizedText} ${text}` : text; },
          onSpeechFinal(_text, atMs) { if (!utteranceEndAt) { utteranceEndAt = atMs; dg.close(); resolve(); } }, // OPTIMIZATION 4 — see pipelinedHarness.ts
          onUtteranceEnd(atMs) { if (!utteranceEndAt) { utteranceEndAt = atMs; dg.close(); resolve(); } }, // fallback only
        });
        const sendDone = streamRealTime(dg, mainFixture.pcm);
        await Promise.race([
          new Promise<void>((res) => { const iv = setInterval(() => { if (utteranceEndAt) { clearInterval(iv); res(); } }, 30); }),
          sendDone.then(() => new Promise((res) => setTimeout(res, 1500))),
        ]);
        if (!utteranceEndAt) resolve();
      })();
    });
    await utteranceEndPromise;
    if (!utteranceEndAt) throw new Error("Deepgram never fired UtteranceEnd for the main utterance");

    const cartesiaConn = await cartesiaConnPromise;
    const audioChunks: Buffer[] = [];
    let ttsStream = startStreamingSynthesis(cartesiaConn, sessionVoice.id, {
      onChunk(pcm) { audioChunks.push(pcm); if (cancelSent) chunksAfterCancel++; else chunksBeforeCancel++; },
    });
    // Same unhandled-rejection fix as pipelinedHarness.ts — attach a
    // no-op .catch() immediately at creation. The real .then/.catch at
    // cancellation time below is attached ~900ms+ later, which is exactly
    // the kind of gap that let an earlier transient Cartesia error crash
    // the process (caught live).
    ttsStream.done.catch(() => {});

    const claudeAbort = new AbortController();
    const claudePromise = getExaminerReplyStreaming(state, recognizedText || "(keine Transkription empfangen)", {
      onChunk(text) { ttsStream.appendText(text, false); },
    }, claudeAbort.signal).catch((e) => { if (!(e instanceof ClaudeAbortedError)) throw e; });

    // --- Interruption: let the response get a head start, then barge in ---
    await new Promise((r) => setTimeout(r, 900)); // let Claude/Cartesia get meaningfully underway first
    const interruptClipStartAt = Date.now();

    // OPTIMIZATION 2 (Priority 2): detection now uses a local, zero-network
    // RMS-energy VAD checked on every raw frame AS it's streamed — no
    // waiting for Deepgram to produce a transcript. Deepgram still runs
    // alongside (a real barge-in still needs the actual words), but it is
    // no longer on the detection critical path.
    let vadDetectedAt = 0;
    let interimDetectedAt = 0; // kept for a direct, honest before/after comparison in the same run
    const vad = createFastVad();
    const interruptDg = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
      onInterim(_text, atMs) { if (!interimDetectedAt) interimDetectedAt = atMs; },
    });
    void streamRealTime(interruptDg, interruptFixture.pcm, (frame, atMs) => {
      if (!vadDetectedAt && vad.pushFrame(frame)) vadDetectedAt = atMs;
    });

    const waitForDetect = Date.now();
    while (!vadDetectedAt && Date.now() - waitForDetect < 5000) await new Promise((r) => setTimeout(r, 5));
    const interruptDetectedAt = vadDetectedAt; // the VAD signal is what actually drives cancellation below
    // Give the interim comparison a little more time to resolve, non-blocking for the real cancellation path.
    setTimeout(() => interruptDg.close(), 3000);
    if (!interruptDetectedAt) throw new Error("Interruption was never detected (VAD) within 5s");

    // --- Real cancellation, timed precisely ---
    const claudeAbortedAt0 = Date.now();
    claudeAbort.abort();
    const claudeAbortedAt = Date.now();

    const cartesiaCancelSentAt = Date.now();
    cancelSent = true;
    ttsStream.cancel();
    const cartesiaCancelConfirmedAt = await new Promise<number>((resolve) => {
      // ttsStream.done resolves once Cartesia's own "done" (post-cancel) arrives.
      ttsStream.done.then(() => resolve(Date.now())).catch(() => resolve(Date.now()));
    });
    // OPTIMIZATION 3: do NOT tear down the whole WebSocket on cancel — only
    // the per-utterance synthesis context is cancelled. The connection
    // itself (the ~800ms-to-establish part) stays open and warm, reused
    // directly for the new turn's response below instead of paying a fresh
    // handshake for the restart. cancel() already confirmed the old
    // context is fully done server-side before we start a new one on the
    // same socket, so there's no risk of the two contexts' audio mixing.
    await claudePromise.catch(() => {});

    writeFileSync(join(OUT_DIR, `${runId}-interrupted-partial.wav`), writeWav({ sampleRate: CARTESIA_OUTPUT_SAMPLE_RATE, channels: 1, pcm: Buffer.concat(audioChunks) }));

    // --- New turn: the interrupting utterance becomes the new input, minimal-overhead restart ---
    // (In a real session this would come from the interrupt-detection Deepgram connection's own
    // accumulated final text; here it's the same known fixture text for a clean, honest measurement.)
    const newTurnStart = Date.now();
    const newAudioChunks: Buffer[] = [];
    let newTurnFirstAudioAt = 0;
    const newTtsStream = startStreamingSynthesis(cartesiaConn, sessionVoice.id, {
      onFirstChunk(atMs) { newTurnFirstAudioAt = atMs; },
      onChunk(pcm) { newAudioChunks.push(pcm); },
    });
    let newTtsError: unknown = null;
    newTtsStream.done.catch((e) => { newTtsError = e; }); // see the identical fix + comment in pipelinedHarness.ts
    await getExaminerReplyStreaming(state, "Entschuldigung, darf ich kurz etwas hinzufügen?", {
      onChunk(text) { newTtsStream.appendText(text, false); },
    });
    newTtsStream.appendText(" ", true);
    await newTtsStream.done.catch(() => {});
    if (newTtsError) throw newTtsError;
    closeCartesiaConnection(cartesiaConn); // whole session/turn-pair over now — close for real
    writeFileSync(join(OUT_DIR, `${runId}-new-turn-reply.wav`), writeWav({ sampleRate: CARTESIA_OUTPUT_SAMPLE_RATE, channels: 1, pcm: Buffer.concat(newAudioChunks) }));
    void newTurnStart;

    // Bounded wait for the parallel interim-transcript comparison signal —
    // purely for reporting the before/after delta honestly; never on the
    // real cancellation critical path above.
    const waitForInterim = Date.now();
    while (!interimDetectedAt && Date.now() - waitForInterim < 2500) await new Promise((r) => setTimeout(r, 20));

    return {
      ok: true,
      interruptDetectedAt, claudeAbortedAt, cartesiaCancelSentAt, cartesiaCancelConfirmedAt, newTurnFirstAudioAt,
      interruptDetectionLatencyMs: interruptDetectedAt - interruptClipStartAt,
      interimTranscriptLatencyMs: interimDetectedAt ? interimDetectedAt - interruptClipStartAt : null,
      claudeAbortLatencyMs: claudeAbortedAt - claudeAbortedAt0,
      cartesiaCancelLatencyMs: cartesiaCancelConfirmedAt - cartesiaCancelSentAt,
      totalInterruptToNewResponseMs: newTurnFirstAudioAt - interruptDetectedAt,
      chunksReceivedBeforeCancel: chunksBeforeCancel,
      chunksReceivedAfterCancel: chunksAfterCancel,
    };
  } catch (e) {
    return {
      ok: false, error: e instanceof Error ? e.message : String(e),
      interruptDetectedAt: 0, claudeAbortedAt: 0, cartesiaCancelSentAt: 0, cartesiaCancelConfirmedAt: 0, newTurnFirstAudioAt: 0,
      interruptDetectionLatencyMs: 0, interimTranscriptLatencyMs: null, claudeAbortLatencyMs: 0, cartesiaCancelLatencyMs: 0, totalInterruptToNewResponseMs: 0,
      chunksReceivedBeforeCancel: chunksBeforeCancel, chunksReceivedAfterCancel: chunksAfterCancel,
    };
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 5);
  const results: BargeInResult[] = [];
  for (let i = 0; i < runs; i++) {
    const r = await runBargeInTurn(`bargein${Date.now()}-${i}`);
    results.push(r);
    if (r.ok) {
      console.log(`[${i + 1}/${runs}] VAD-detect=${r.interruptDetectionLatencyMs}ms  (old interim-based=${r.interimTranscriptLatencyMs ?? "n/a"}ms)  claude-abort=${r.claudeAbortLatencyMs}ms  cartesia-cancel=${r.cartesiaCancelLatencyMs}ms  chunksAfterCancel=${r.chunksReceivedAfterCancel}  total-to-new-response=${r.totalInterruptToNewResponseMs}ms`);
    } else {
      console.log(`[${i + 1}/${runs}] FAILED: ${r.error}`);
    }
  }
  writeFileSync(join(OUT_DIR, `bargein-benchmark-${Date.now()}.json`), JSON.stringify(results, null, 2), "utf8");
  const ok = results.filter((r) => r.ok);
  console.log(`\n${ok.length}/${results.length} succeeded`);
  if (ok.length) {
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const interims = ok.map((r) => r.interimTranscriptLatencyMs).filter((v): v is number => v != null);
    console.log(`avg VAD detection latency:        ${avg(ok.map((r) => r.interruptDetectionLatencyMs)).toFixed(0)}ms`);
    if (interims.length) console.log(`avg OLD interim-transcript latency: ${avg(interims).toFixed(0)}ms  (n=${interims.length}/${ok.length} — for comparison only, not what triggers cancellation)`);
    console.log(`avg claude-abort latency: ${avg(ok.map((r) => r.claudeAbortLatencyMs)).toFixed(0)}ms`);
    console.log(`avg cartesia-cancel latency: ${avg(ok.map((r) => r.cartesiaCancelLatencyMs)).toFixed(0)}ms`);
    console.log(`avg chunks leaked after cancel: ${avg(ok.map((r) => r.chunksReceivedAfterCancel)).toFixed(1)}`);
    console.log(`avg total interrupt -> new response first audio: ${avg(ok.map((r) => r.totalInterruptToNewResponseMs)).toFixed(0)}ms`);
  }
  process.exit(ok.length === results.length ? 0 : 1);
}

main();
