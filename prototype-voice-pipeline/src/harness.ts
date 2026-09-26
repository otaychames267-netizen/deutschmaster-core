/**
 * harness.ts — orchestration entry point for the isolated prototype.
 *
 * Usage:
 *   npm run harness                  one run
 *   npm run harness -- --runs=5      reliability mode (item 8 of the report)
 *   npm run harness -- --interrupt   interruption-quality mode (item 7)
 *
 * Wires: fixture WAV -> Deepgram (real wall-clock pacing) -> UtteranceEnd ->
 * Claude examiner brain -> Cartesia TTS -> out/<runId>-reply.wav + metrics.
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readWav, resamplePcm16, writeWav, type PcmAudio } from "./wav.js";
import { openDeepgramStream } from "./deepgramStt.js";
import { getExaminerReply } from "./claudeExaminerBrain.js";
import { synthesize, synthesizeOnConnection, openCartesiaConnection, closeCartesiaConnection, CARTESIA_OUTPUT_SAMPLE_RATE } from "./cartesiaTts.js";
import { pickSessionVoice } from "./voicePool.js";
import { makeInitialExamState } from "./examState.js";
import { deriveMetrics, writeRunReport, ok, type RunTimestamps } from "./metrics.js";

const ROOT = join(import.meta.dirname, "..");
const FIXTURES_DIR = join(ROOT, "fixtures");
const OUT_DIR = join(ROOT, "out");
const DEEPGRAM_SAMPLE_RATE = 16000; // matches production's own capture rate (useRelayAudio.ts CAPTURE_SAMPLE_RATE)
const FRAME_MS = 20; // real-time pacing chunk size

function loadFixtureAt16k(filename: string): PcmAudio {
  const path = join(FIXTURES_DIR, filename);
  if (!existsSync(path)) {
    throw new Error(`Missing fixture ${path} — run "npm run make-fixture" first`);
  }
  const audio = readWav(readFileSync(path));
  const pcm16k = resamplePcm16(audio.pcm, audio.sampleRate, DEEPGRAM_SAMPLE_RATE);
  return { sampleRate: DEEPGRAM_SAMPLE_RATE, channels: 1, pcm: pcm16k };
}

/** Streams pcm to the deepgram session in real-time-paced frames; resolves once fully sent. */
function streamRealTime(session: { sendPcm16(c: Buffer): void; finish(): void }, pcm: Buffer): Promise<void> {
  const frameBytes = Math.round(DEEPGRAM_SAMPLE_RATE * (FRAME_MS / 1000)) * 2;
  return new Promise((resolve) => {
    let offset = 0;
    const timer = setInterval(() => {
      if (offset >= pcm.length) {
        clearInterval(timer);
        session.finish();
        resolve();
        return;
      }
      session.sendPcm16(pcm.subarray(offset, offset + frameBytes));
      offset += frameBytes;
    }, FRAME_MS);
  });
}

interface RunOptions {
  runId: string;
  interrupt: boolean;
}

async function runOnce(opts: RunOptions): Promise<boolean> {
  const t: RunTimestamps = {};
  const state = makeInitialExamState();
  const fixture = loadFixtureAt16k("sample-candidate-utterance.wav");
  // One voice per session (this run stands in for one exam session), picked
  // once here and reused for every examiner turn in it — never re-picked
  // per turn. Logged below for reproducibility.
  const sessionVoice = pickSessionVoice();
  console.log(`[${opts.runId}] session voice: ${sessionVoice.name} (${sessionVoice.id}, ${sessionVoice.gender})`);

  let recognizedText = "";
  let lastConfidence: number | null = null;
  let utteranceEndResolve!: () => void;
  const utteranceEndPromise = new Promise<void>((res) => { utteranceEndResolve = res; });

  try {
    const dg = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
      onInterim(text, atMs) { if (!t.t1_firstInterim) t.t1_firstInterim = atMs; },
      onFinal(text, confidence, atMs) {
        recognizedText = recognizedText ? `${recognizedText} ${text}` : text;
        lastConfidence = confidence;
        t.t2_lastFinalSegment = atMs;
      },
      onUtteranceEnd(atMs) {
        if (!t.t3_utteranceEnd) { t.t3_utteranceEnd = atMs; utteranceEndResolve(); }
      },
      onError(err) { console.error(`[${opts.runId}] Deepgram error:`, err.message); },
    });

    t.t0_audioStreamStart = Date.now();
    const sendDone = streamRealTime(dg, fixture.pcm);

    if (opts.interrupt) {
      // Interruption-quality test (report item 7): while the main utterance
      // is still being processed, open a SECOND independent Deepgram
      // connection partway through and stream a short "candidate breaks in"
      // clip — measuring how fast the pipeline would notice new speech
      // arriving concurrently. Logged, not acted upon (v1 scope, see plan).
      setTimeout(async () => {
        const clip = loadFixtureAt16k("interruption-clip.wav");
        const interruptStart = Date.now();
        let alreadyLogged = false;
        const dg2 = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
          onInterim(_text, atMs) {
            if (alreadyLogged) return;
            alreadyLogged = true;
            console.log(`[${opts.runId}] INTERRUPTION first detected ${atMs - interruptStart}ms after the interrupting clip started streaming`);
          },
        });
        await streamRealTime(dg2, clip.pcm);
        dg2.close();
      }, 500);
    }

    await Promise.race([utteranceEndPromise, sendDone.then(() => new Promise((r) => setTimeout(r, 1500)))]);
    dg.close();

    if (!t.t3_utteranceEnd) {
      throw new Error("Deepgram never fired UtteranceEnd for this fixture — check utterance_end_ms / fixture trailing silence");
    }

    t.t4_claudeRequestStart = Date.now();
    const claudeResult = await getExaminerReply(state, recognizedText || "(keine Transkription empfangen)");
    t.t5_claudeReplyReceived = Date.now();

    t.t6_cartesiaRequestStart = Date.now();
    const chunks: Buffer[] = [];
    await synthesize(claudeResult.reply, sessionVoice.id, {
      onFirstChunk(atMs) { t.t7_cartesiaFirstAudio = atMs; },
      onChunk(pcm) { chunks.push(pcm); },
      onDone(atMs) { t.t8_cartesiaDone = atMs; },
    });

    const replyPcm = Buffer.concat(chunks);
    writeFileSync(join(OUT_DIR, `${opts.runId}-reply.wav`), writeWav({ sampleRate: CARTESIA_OUTPUT_SAMPLE_RATE, channels: 1, pcm: replyPcm }));
    t.t9_outputWritten = Date.now();

    writeRunReport(OUT_DIR, {
      runId: opts.runId,
      ok: true,
      sessionVoice,
      timestamps: t,
      transcript: {
        recognizedText,
        scriptedText: "(see fixtures/ script text in makeFixture.ts)",
        confidence: lastConfidence,
        claudeReply: claudeResult.reply,
        claudeInputTokens: claudeResult.inputTokens,
        claudeOutputTokens: claudeResult.outputTokens,
      },
      derived: deriveMetrics(t),
    });
    return true;
  } catch (e) {
    console.error(`[${opts.runId}] FAILED:`, e instanceof Error ? e.message : String(e));
    writeRunReport(OUT_DIR, {
      runId: opts.runId,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      sessionVoice,
      timestamps: t,
      transcript: { recognizedText, scriptedText: "", confidence: lastConfidence, claudeReply: "", claudeInputTokens: 0, claudeOutputTokens: 0 },
      derived: deriveMetrics(t),
    });
    return false;
  }
}

/**
 * Latency-optimization test (report item E): keeps ONE Deepgram connection
 * and ONE Cartesia connection open across N examiner turns, instead of
 * opening/closing per turn (runOnce()'s behavior, correct for the isolated
 * single-turn default but pessimistic for a real multi-turn exam). Measures
 * each turn's Cartesia TTFA separately so turn 1 (cold handshake) can be
 * compared against turn 2+ (reused, already-open connection). Reuses the
 * same fixture audio for every turn — this test is about connection-reuse
 * latency, not conversation content.
 */
async function runSession(turns: number): Promise<void> {
  const state = makeInitialExamState();
  const fixture = loadFixtureAt16k("sample-candidate-utterance.wav");
  const sessionVoice = pickSessionVoice();
  console.log(`session voice: ${sessionVoice.name} (${sessionVoice.id}, ${sessionVoice.gender})`);

  // Deepgram's own connect-time isn't what's under test here (each turn
  // needs a fresh set of callbacks bound at creation anyway, since
  // openDeepgramStream binds them once); Cartesia is the one kept open and
  // reused across every turn — that's the specific gap under test (measured
  // TTFA ~1.1s vs. Cartesia's own advertised ~90ms strongly suggested
  // per-call connection setup, not the model itself).
  const cartesiaConn = await openCartesiaConnection();
  console.log(`Cartesia connection established in ${cartesiaConn.connectMs}ms (one-time cost for the whole session)`);

  const results: { turn: number; claudeMs: number; cartesiaTtfaMs: number; cartesiaTotalMs: number }[] = [];

  for (let turn = 0; turn < turns; turn++) {
    let recognizedText = "";
    let ended = false;

    const dgTurn = await openDeepgramStream(DEEPGRAM_SAMPLE_RATE, {
      onFinal(text) { recognizedText = recognizedText ? `${recognizedText} ${text}` : text; },
      onUtteranceEnd() { ended = true; },
    });
    const sendDone = streamRealTime(dgTurn, fixture.pcm);
    await Promise.race([
      new Promise<void>((resolve) => { const iv = setInterval(() => { if (ended) { clearInterval(iv); resolve(); } }, 50); }),
      sendDone.then(() => new Promise((r) => setTimeout(r, 1500))),
    ]);
    dgTurn.close();
    if (!ended) { console.log(`turn ${turn}: UtteranceEnd never fired, skipping`); continue; }

    const t4 = Date.now();
    const claudeResult = await getExaminerReply(state, recognizedText || "(keine Transkription empfangen)");
    const t5 = Date.now();

    const t6 = Date.now();
    let t7 = 0, t8 = 0;
    await synthesizeOnConnection(cartesiaConn, claudeResult.reply, sessionVoice.id, {
      onFirstChunk(atMs) { t7 = atMs; },
      onDone(atMs) { t8 = atMs; },
    });

    results.push({
      turn,
      claudeMs: t5 - t4,
      cartesiaTtfaMs: t7 - t6,
      cartesiaTotalMs: t8 - t6,
    });
    console.log(`turn ${turn}: claude=${t5 - t4}ms  cartesiaTTFA=${t7 - t6}ms  cartesiaTotal=${t8 - t6}ms`);

    state.history.push({ speaker: "candidate", text: recognizedText });
    state.history.push({ speaker: "examiner", text: claudeResult.reply });
    state.followUpsAsked++;
  }

  closeCartesiaConnection(cartesiaConn);

  console.log("\n--- Session summary (connection-reuse test) ---");
  console.log(`Turn 0 (cold Cartesia connection just opened): TTFA=${results[0]?.cartesiaTtfaMs}ms`);
  const warmTurns = results.slice(1);
  if (warmTurns.length) {
    const avgWarmTtfa = warmTurns.reduce((a, r) => a + r.cartesiaTtfaMs, 0) / warmTurns.length;
    console.log(`Turns 1+ (reused connection) avg TTFA: ${avgWarmTtfa.toFixed(0)}ms across ${warmTurns.length} turns`);
    console.log(`Improvement: ${(results[0].cartesiaTtfaMs - avgWarmTtfa).toFixed(0)}ms faster once the connection is warm`);
  }
  writeFileSync(join(OUT_DIR, `session-latency-${Date.now()}.json`), JSON.stringify(results, null, 2), "utf8");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const runsArg = args.find((a) => a.startsWith("--runs="));
  const runs = runsArg ? Number(runsArg.split("=")[1]) : 1;
  const interrupt = args.includes("--interrupt");
  const sessionArg = args.find((a) => a.startsWith("--session-turns="));

  const missing = ["DEEPGRAM_API_KEY", "CARTESIA_API_KEY", "ANTHROPIC_API_KEY"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.log(`FAIL: missing required env vars: ${missing.join(", ")} — copy .env.example to .env and fill them in`);
    process.exit(1);
  }

  if (sessionArg) {
    await runSession(Number(sessionArg.split("=")[1]));
    process.exit(0);
  }

  let passCount = 0;
  for (let i = 0; i < runs; i++) {
    const runId = `run${Date.now()}-${i}`;
    const success = await runOnce({ runId, interrupt: interrupt && i === 0 });
    if (success) passCount++;
  }
  ok(`reliability: ${passCount}/${runs} runs succeeded`, passCount === runs);
  process.exit(passCount === runs ? 0 : 1);
}

main();
