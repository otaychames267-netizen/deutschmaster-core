/**
 * harness.ts — realtime-architecture prototype orchestration.
 *
 * Usage:
 *   npm run harness                    one multi-turn session (default 3 turns)
 *   npm run harness -- --turns=5       explicit turn count
 *   npm run harness -- --runs=5        reliability mode: N full sessions
 *   npm run harness -- --interrupt     interruption-quality mode
 *
 * Measures true time-to-first-audio from the moment SPEECH content ends
 * (not from when the whole buffer, including trailing silence, finished
 * sending) — see makeFixture.ts's header comment for why the earlier
 * single-turn baseline's 75ms number needed this correction to be a fair,
 * defensible measurement.
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readWav, resamplePcm16, writeWav, type PcmAudio } from "./wav.js";
import { openLiveSession, type LiveSessionHandle } from "./session.js";

const ROOT = join(import.meta.dirname, "..");
const FIXTURES_DIR = join(ROOT, "fixtures");
const OUT_DIR = join(ROOT, "out");
const SEND_SAMPLE_RATE = 16000; // Gemini Live's documented input rate (audio/pcm;rate=16000)
const FRAME_MS = 20;

interface FixtureMeta { text: string; sampleRate: number; speechEndMs: number; totalMs: number }

function loadFixture(name: string): { pcm16k: Buffer; meta: FixtureMeta } {
  const wavPath = join(FIXTURES_DIR, `${name}.wav`);
  const metaPath = join(FIXTURES_DIR, `${name}.meta.json`);
  if (!existsSync(wavPath) || !existsSync(metaPath)) throw new Error(`Missing fixture ${name} — run "npm run make-fixture" first`);
  const audio = readWav(readFileSync(wavPath));
  const pcm16k = resamplePcm16(audio.pcm, audio.sampleRate, SEND_SAMPLE_RATE);
  const meta: FixtureMeta = JSON.parse(readFileSync(metaPath, "utf8"));
  return { pcm16k, meta };
}

/**
 * Streams pcm in real-time-paced base64 frames; resolves once fully sent.
 * Calls onSpeechEnd once elapsed real time crosses speechEndMs.
 *
 * CRITICAL FIX: a naive "one FRAME_MS-sized chunk per setInterval tick"
 * loop silently assumes each tick fires exactly on schedule. It doesn't —
 * measured live, sendRealtimeInput()'s real per-call overhead (JSON
 * serialization + base64 + the SDK's own internal work) pushed actual
 * tick spacing to ~33ms against a nominal 20ms, and across ~550 frames for
 * an 11s clip that drift compounded to ~7.4s of REAL wall-clock lag behind
 * the audio's nominal duration — meaning the server received "spoken"
 * content 7+ seconds slower than real-time, and its own end-of-speech
 * detection (correctly) waited for content that hadn't arrived yet. That
 * produced an entirely spurious ~7.3s "latency" measurement that was
 * actually measuring MY OWN pacing bug, not the model.
 *
 * Fixed with elapsed-time-based catch-up scheduling: each tick computes
 * how many frames SHOULD have been sent by now (from real elapsed time)
 * and sends all of them, so content delivery rate tracks real time
 * regardless of individual send-call overhead.
 */
function streamRealTime(session: LiveSessionHandle, pcm16k: Buffer, meta: FixtureMeta, onSpeechEnd: (atMs: number) => void): Promise<void> {
  const frameBytes = Math.round(SEND_SAMPLE_RATE * (FRAME_MS / 1000)) * 2;
  const totalFrames = Math.ceil(pcm16k.length / frameBytes);
  const t0 = Date.now();
  let speechEndFired = false;
  return new Promise((resolve) => {
    let framesSent = 0;
    const timer = setInterval(() => {
      const elapsed = Date.now() - t0;
      const framesDue = Math.min(totalFrames, Math.floor(elapsed / FRAME_MS) + 1);
      while (framesSent < framesDue) {
        const offset = framesSent * frameBytes;
        const chunk = pcm16k.subarray(offset, offset + frameBytes);
        session.sendPcm16Base64(chunk.toString("base64"));
        framesSent++;
      }
      if (!speechEndFired && elapsed >= meta.speechEndMs) { speechEndFired = true; onSpeechEnd(Date.now()); }
      if (framesSent >= totalFrames) {
        clearInterval(timer);
        resolve();
      }
    }, FRAME_MS);
  });
}

interface TurnResult {
  turn: number;
  fixture: string;
  speechToFirstAudioMs: number;
  speechToTurnCompleteMs: number;
  outputTranscript: string;
  inputTranscript: string;
  audioOutputMs: number; // approximate duration of examiner speech this turn, from token/byte count
}

async function runSession(opts: { turns: number; interrupt: boolean; runId: string }): Promise<{ ok: boolean; results: TurnResult[] }> {
  const turnFixtures = ["turn1-opening", "turn2-followup", "turn3-followup"].slice(0, opts.turns);
  const results: TurnResult[] = [];

  let speechEndAt = 0;
  let firstAudioAt = 0;
  let turnCompleteAt = 0;
  let outputTranscript = "";
  let inputTranscript = "";
  let audioBytesThisTurn = 0;
  let expectingResponse = false;
  let sessionErrored = false;
  let interruptedAt = 0;

  const session = await openLiveSession({
    onError(message) { sessionErrored = true; console.error(`[${opts.runId}] Gemini Live error:`, message); },
    onAudioChunk(base64, atMs) {
      if (!expectingResponse) return;
      if (!firstAudioAt) firstAudioAt = atMs;
      audioBytesThisTurn += Buffer.from(base64, "base64").length;
    },
    onOutputTranscript(text) { if (expectingResponse) outputTranscript += text; },
    onInputTranscript(text) { if (expectingResponse) inputTranscript += text; },
    onTurnComplete(atMs) { if (expectingResponse && !turnCompleteAt) turnCompleteAt = atMs; },
    onInterrupted(atMs) { if (expectingResponse && !interruptedAt) interruptedAt = atMs; },
  });

  for (let i = 0; i < turnFixtures.length; i++) {
    const { pcm16k, meta } = loadFixture(turnFixtures[i]);
    speechEndAt = 0; firstAudioAt = 0; turnCompleteAt = 0; outputTranscript = ""; inputTranscript = ""; audioBytesThisTurn = 0; interruptedAt = 0;
    expectingResponse = false;

    const sendDone = streamRealTime(session, pcm16k, meta, (atMs) => { speechEndAt = atMs; expectingResponse = true; });
    await sendDone;

    // Real barge-in test (report item 7): once the AI has actually started
    // speaking (firstAudioAt set), inject a second candidate utterance
    // WHILE its response is in flight and watch for the SDK's own
    // authoritative serverContent.interrupted signal — this tests
    // interrupting the AI's response, not just two voices overlapping
    // during the candidate's own turn (a different, less representative
    // scenario the first version of this test accidentally measured).
    if (opts.interrupt && i === 0) {
      const waitForAudioStart = Date.now();
      while (!firstAudioAt && Date.now() - waitForAudioStart < 5000) await new Promise((r) => setTimeout(r, 20));
      if (firstAudioAt) {
        const interruptClipStart = Date.now();
        const clip = loadFixture("interrupt-clip");
        console.log(`[${opts.runId}] AI response in flight (${Date.now() - firstAudioAt}ms in) — injecting barge-in clip now...`);
        await streamRealTime(session, clip.pcm16k, clip.meta, () => {});
        const waitForInterrupt = Date.now();
        while (!interruptedAt && Date.now() - waitForInterrupt < 5000) await new Promise((r) => setTimeout(r, 20));
        console.log(interruptedAt
          ? `[${opts.runId}] barge-in detected (serverContent.interrupted) ${interruptedAt - interruptClipStart}ms after the interrupting clip started streaming`
          : `[${opts.runId}] barge-in NOT detected within 5s of injecting the interrupting clip`);
      }
    }
    // Wait for turnComplete (or a generous timeout) before moving to the next turn.
    const waitStart = Date.now();
    while (!turnCompleteAt && Date.now() - waitStart < 15000) {
      await new Promise((r) => setTimeout(r, 50));
    }

    if (!speechEndAt || !firstAudioAt) {
      console.log(`[${opts.runId}] turn ${i}: incomplete (speechEndAt=${speechEndAt} firstAudioAt=${firstAudioAt}) — skipping metric`);
      continue;
    }
    const result: TurnResult = {
      turn: i,
      fixture: turnFixtures[i],
      speechToFirstAudioMs: firstAudioAt - speechEndAt,
      speechToTurnCompleteMs: (turnCompleteAt || firstAudioAt) - speechEndAt,
      outputTranscript,
      inputTranscript,
      audioOutputMs: Math.round((audioBytesThisTurn / 2 / 24000) * 1000), // Gemini Live outputs 24kHz PCM16 mono
    };
    results.push(result);
    console.log(`[${opts.runId}] turn ${i}: speech-end->first-audio=${result.speechToFirstAudioMs}ms  ->turn-complete=${result.speechToTurnCompleteMs}ms  reply="${outputTranscript.trim()}"`);
  }

  session.close();
  return { ok: results.length === turnFixtures.length && !sessionErrored, results };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const turns = Number(args.find((a) => a.startsWith("--turns="))?.split("=")[1] ?? 3);
  const runs = Number(args.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 1);
  const interrupt = args.includes("--interrupt");

  if (!process.env.GEMINI_API_KEY) {
    console.log("FAIL: GEMINI_API_KEY not set");
    process.exit(1);
  }

  let passCount = 0;
  const allResults: TurnResult[][] = [];
  for (let i = 0; i < runs; i++) {
    const runId = `session${Date.now()}-${i}`;
    const { ok, results } = await runSession({ turns, interrupt: interrupt && i === 0, runId });
    if (ok) passCount++;
    allResults.push(results);
    writeFileSync(join(OUT_DIR, `${runId}.json`), JSON.stringify(results, null, 2), "utf8");
  }

  console.log(`\nreliability: ${passCount}/${runs} sessions completed all turns cleanly`);

  const flat = allResults.flat();
  if (flat.length) {
    const avgFirstAudio = flat.reduce((a, r) => a + r.speechToFirstAudioMs, 0) / flat.length;
    const avgTurnComplete = flat.reduce((a, r) => a + r.speechToTurnCompleteMs, 0) / flat.length;
    console.log(`avg speech-end -> first-audio across ${flat.length} turns: ${avgFirstAudio.toFixed(0)}ms`);
    console.log(`avg speech-end -> turn-complete across ${flat.length} turns: ${avgTurnComplete.toFixed(0)}ms`);
  }

  process.exit(passCount === runs ? 0 : 1);
}

main();
