/**
 * speculativeHarness.ts — investigates calling Claude BEFORE Deepgram's
 * UtteranceEnd fires, using a "stable partial transcript" heuristic instead
 * of waiting for the server's own end-of-speech confirmation.
 *
 * Mechanism: track consecutive Deepgram interim transcripts. Once the same
 * (normalized) text has appeared STABLE_COUNT times in a row (and is long
 * enough to be worth acting on), treat it as a speculative "the candidate
 * has probably finished this thought" signal and fire Claude immediately
 * with an AbortController, WITHOUT waiting for UtteranceEnd.
 *
 * When UtteranceEnd eventually fires for real, compare the final
 * transcript against what was sent speculatively:
 *   - MATCH (final === speculative prefix, i.e. the candidate really did
 *     stop there): the head start was valid, keep the in-flight response,
 *     no restart needed.
 *   - MISMATCH (final has more content the speculative call never saw):
 *     abort the in-flight Claude call and restart fresh with the correct
 *     final text — this is the "reconciliation cost" the plan explicitly
 *     asked to measure, not assume away.
 *
 * This is an honest experiment, not a foregone conclusion — the fixture
 * audio here is a single short scripted sentence, which may not give
 * Deepgram's interim results much room to "stabilize" before the utterance
 * is basically already over. Reported findings reflect what was actually
 * observed, not what the architecture theoretically promises.
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

const ROOT = join(import.meta.dirname, "..");
const FIXTURES_DIR = join(ROOT, "fixtures");
const OUT_DIR = join(ROOT, "out");
const DEEPGRAM_SAMPLE_RATE = 16000;
const FRAME_MS = 20;
const STABLE_COUNT = 2; // consecutive identical interims before triggering
const MIN_SPECULATIVE_LEN = 20; // chars — avoid triggering on "Ja" etc.

function loadFixtureAt16k(filename: string): PcmAudio {
  const path = join(FIXTURES_DIR, filename);
  if (!existsSync(path)) throw new Error(`Missing fixture ${path}`);
  const audio = readWav(readFileSync(path));
  const pcm16k = resamplePcm16(audio.pcm, audio.sampleRate, DEEPGRAM_SAMPLE_RATE);
  return { sampleRate: DEEPGRAM_SAMPLE_RATE, channels: 1, pcm: pcm16k };
}

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
      if (framesSent >= totalFrames) { clearInterval(timer); session.finish(); resolve(); }
    }, FRAME_MS);
  });
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?]+$/, "");
}

export interface SpeculativeTurnResult {
  ok: boolean;
  error?: string;
  speculativeTriggered: boolean;
  speculativeText: string;
  finalText: string;
  matched: boolean; // speculative prefix === final (no restart needed)
  restarted: boolean;
  speechStartAt: number; // when audio streaming began, for reference
  speculativeTriggerAt: number; // when the stable-interim signal fired (0 if never)
  utteranceEndAt: number; // real Deepgram UtteranceEnd
  claudeRequestAt: number;
  claudeFirstTokenAt: number;
  cartesiaFirstAudioAt: number;
  // The two metrics the plan explicitly requires kept separate:
  speechEndToFirstAudioMs: number; // TRUE metric, anchored to the REAL UtteranceEnd (fair, apples-to-apples vs the non-speculative benchmark)
  speculativeHeadStartMs: number; // how much earlier than UtteranceEnd the speculative call actually started (0 if never triggered or if it had to restart)
}

export async function runSpeculativeTurn(runId: string): Promise<SpeculativeTurnResult> {
  const state = makeInitialExamState();
  const fixture = loadFixtureAt16k(process.env.BENCHMARK_FIXTURE ?? "short-utterance.wav");
  const sessionVoice = pickSessionVoice();

  let speculativeTriggerAt = 0;
  let utteranceEndAt = 0;
  let speculativeText = "";
  let finalText = "";
  let lastInterim = "";
  let stableCount = 0;
  let claudeAbort: AbortController | null = null;
  let claudeRequestAt = 0;
  let claudeFirstTokenAt = 0;
  let cartesiaFirstAudioAt = 0;
  let restarted = false;
  const speechStartAt = Date.now();

  const cartesiaConn = await openCartesiaConnection();
  const audioChunks: Buffer[] = [];
  // Guards against the same class of unhandled-rejection crash fixed in
  // pipelinedHarness.ts — a genuine transient Cartesia error caught live
  // there. ttsStream is reassigned on restart (below), so this is a shared
  // slot both creation sites write into rather than a per-call local.
  let ttsError: unknown = null;
  let ttsStream = startStreamingSynthesis(cartesiaConn, sessionVoice.id, {
    onFirstChunk(atMs) { if (!cartesiaFirstAudioAt) cartesiaFirstAudioAt = atMs; },
    onChunk(pcm) { audioChunks.push(pcm); },
  });
  ttsStream.done.catch((e) => { ttsError = e; });

  async function startClaude(text: string, isSpeculative: boolean) {
    claudeAbort = new AbortController();
    const myAbort = claudeAbort;
    claudeRequestAt = Date.now();
    claudeFirstTokenAt = 0;
    try {
      await getExaminerReplyStreaming(state, text, {
        onFirstToken(atMs) { if (!claudeFirstTokenAt) claudeFirstTokenAt = atMs; },
        onChunk(chunk) { ttsStream.appendText(chunk, false); },
        onDone() { /* handled by caller awaiting this promise */ },
      }, myAbort.signal); // real cancellation — actually tears down the fetch, not just an ignored-output flag
    } catch (e) {
      if (!(e instanceof ClaudeAbortedError)) throw e; // a genuine intentional cancellation is expected, not an error
    }
    void isSpeculative;
  }

  let claudeDonePromise: Promise<void> | null = null;
  let speculativeError: unknown = null;

  const dgDone = new Promise<void>((resolveDg) => {
    (async () => {
      const dg = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
        onInterim(text) {
          const norm = normalize(text);
          if (norm && norm === normalize(lastInterim)) stableCount++; else stableCount = 1;
          lastInterim = text;
          if (!speculativeTriggerAt && stableCount >= STABLE_COUNT && text.trim().length >= MIN_SPECULATIVE_LEN) {
            speculativeTriggerAt = Date.now();
            speculativeText = text.trim();
            // Fired detached from the main await chain (the whole point is
            // to start BEFORE UtteranceEnd) — a real transient network
            // error here (caught live: a genuine ConnectTimeoutError from
            // Anthropic) would otherwise become an unhandled promise
            // rejection and crash the process before the later `await
            // claudeDonePromise` gets a chance to attach a handler. This is
            // a real reliability property of speculative execution worth
            // noting on its own: a detached "start early" call needs its
            // own error containment, not just the caller's eventual await.
            claudeDonePromise = startClaude(speculativeText, true).catch((e) => { speculativeError = e; });
          }
        },
        onFinal(text) { finalText = finalText ? `${finalText} ${text}` : text; },
        onUtteranceEnd(atMs) {
          if (!utteranceEndAt) { utteranceEndAt = atMs; dg.close(); resolveDg(); }
        },
      });
      const sendDone = streamRealTime(dg, fixture.pcm);
      await Promise.race([
        new Promise<void>((res) => { const iv = setInterval(() => { if (utteranceEndAt) { clearInterval(iv); res(); } }, 30); }),
        sendDone.then(() => new Promise((res) => setTimeout(res, 1500))),
      ]);
      if (!utteranceEndAt) resolveDg();
    })();
  });

  try {
    await dgDone;
    if (!utteranceEndAt) throw new Error("Deepgram never fired UtteranceEnd");

    let matched = speculativeTriggerAt > 0 && normalize(finalText) === normalize(speculativeText);
    if (speculativeError) matched = false; // a transient failure during the speculative call forces the same fresh-restart path as a genuine mismatch

    if (speculativeTriggerAt && !matched) {
      // Reconciliation: the candidate said more after the speculative
      // trigger point. Abort the in-flight (now-stale) Claude call and
      // restart fresh with the real final transcript — measuring exactly
      // this cost is the point of the experiment, not skipping it.
      (claudeAbort as AbortController | null)?.abort();
      restarted = true;
      ttsStream = startStreamingSynthesis(cartesiaConn, sessionVoice.id, {
        onFirstChunk(atMs) { cartesiaFirstAudioAt = atMs; }, // overwrite — the restarted response is the real one
        onChunk(pcm) { audioChunks.push(pcm); },
      });
      ttsStream.done.catch((e) => { ttsError = e; });
      await startClaude(finalText || "(keine Transkription empfangen)", false);
    } else if (!speculativeTriggerAt) {
      // Never stabilized before UtteranceEnd — fall back to the normal path.
      await startClaude(finalText || "(keine Transkription empfangen)", false);
    } else {
      // Speculation was correct — just let the already-in-flight call finish.
      await claudeDonePromise;
    }

    ttsStream.appendText(" ", true); // close out the Cartesia context
    await ttsStream.done.catch(() => {});
    closeCartesiaConnection(cartesiaConn);
    if (ttsError) throw ttsError;
    writeFileSync(join(OUT_DIR, `${runId}-reply.wav`), writeWav({ sampleRate: CARTESIA_OUTPUT_SAMPLE_RATE, channels: 1, pcm: Buffer.concat(audioChunks) }));

    return {
      ok: true, speculativeTriggered: speculativeTriggerAt > 0, speculativeText, finalText, matched, restarted,
      speechStartAt, speculativeTriggerAt, utteranceEndAt, claudeRequestAt, claudeFirstTokenAt, cartesiaFirstAudioAt,
      speechEndToFirstAudioMs: cartesiaFirstAudioAt - utteranceEndAt,
      speculativeHeadStartMs: speculativeTriggerAt && !restarted ? utteranceEndAt - speculativeTriggerAt : 0,
    };
  } catch (e) {
    closeCartesiaConnection(cartesiaConn);
    return {
      ok: false, error: e instanceof Error ? e.message : String(e),
      speculativeTriggered: speculativeTriggerAt > 0, speculativeText, finalText, matched: false, restarted,
      speechStartAt, speculativeTriggerAt, utteranceEndAt, claudeRequestAt, claudeFirstTokenAt, cartesiaFirstAudioAt,
      speechEndToFirstAudioMs: 0, speculativeHeadStartMs: 0,
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 10);

  const results: SpeculativeTurnResult[] = [];
  for (let i = 0; i < runs; i++) {
    const r = await runSpeculativeTurn(`spec${Date.now()}-${i}`);
    results.push(r);
    if (r.ok) {
      console.log(`[${i + 1}/${runs}] triggered=${r.speculativeTriggered}  matched=${r.matched}  restarted=${r.restarted}  headStart=${r.speculativeHeadStartMs}ms  first-audio=${r.speechEndToFirstAudioMs}ms`);
    } else {
      console.log(`[${i + 1}/${runs}] FAILED: ${r.error}`);
    }
  }

  writeFileSync(join(OUT_DIR, `speculative-benchmark-${Date.now()}.json`), JSON.stringify(results, null, 2), "utf8");

  const ok = results.filter((r) => r.ok);
  const triggered = ok.filter((r) => r.speculativeTriggered);
  const matched = triggered.filter((r) => r.matched);
  console.log(`\n${ok.length}/${results.length} turns succeeded`);
  console.log(`Speculative trigger fired: ${triggered.length}/${ok.length} turns`);
  console.log(`Of those, speculation was CORRECT (no restart needed): ${matched.length}/${triggered.length}`);
  if (matched.length) {
    const heads = matched.map((r) => r.speculativeHeadStartMs).sort((a, b) => a - b);
    const avg = heads.reduce((a, b) => a + b, 0) / heads.length;
    console.log(`Head-start when correct: avg=${avg.toFixed(0)}ms median=${percentile(heads, 50)}ms max=${heads[heads.length - 1]}ms`);
  }
  const firstAudio = ok.map((r) => r.speechEndToFirstAudioMs).sort((a, b) => a - b);
  const avgFA = firstAudio.reduce((a, b) => a + b, 0) / firstAudio.length;
  console.log(`speech-end -> first-audio (TRUE, anchored to real UtteranceEnd): avg=${avgFA.toFixed(0)}ms median=${percentile(firstAudio, 50)}ms p95=${percentile(firstAudio, 95)}ms min=${firstAudio[0]}ms max=${firstAudio[firstAudio.length - 1]}ms`);
  process.exit(ok.length === results.length ? 0 : 1);
}

main();
