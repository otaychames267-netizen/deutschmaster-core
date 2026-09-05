/**
 * deepgramMultiTurn.ts — tests whether keeping ONE Deepgram connection open
 * across multiple utterances (instead of reconnecting every turn, which is
 * what pipelinedHarness.ts currently does) saves the same kind of
 * connection-setup cost that Cartesia's persistent-connection fix
 * eliminated (~800ms there). Deepgram's own protocol is natively designed
 * for this — one continuous stream, multiple speech_final/UtteranceEnd
 * events over time — the harness just wasn't structured to take advantage
 * of it.
 *
 * Cartesia-independent — runs fine despite the exhausted Cartesia quota.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readWav, resamplePcm16 } from "./wav.js";
import { openDeepgramStream, type DeepgramSession } from "./deepgramStt.js";

const SAMPLE_RATE = 16000;
const FRAME_MS = 20;

function loadFixture(name: string) {
  const audio = readWav(readFileSync(join(import.meta.dirname, "..", "fixtures", name)));
  return resamplePcm16(audio.pcm, audio.sampleRate, SAMPLE_RATE);
}

function streamRealTime(session: DeepgramSession, pcm: Buffer): Promise<void> {
  const frameBytes = Math.round(SAMPLE_RATE * (FRAME_MS / 1000)) * 2;
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
      if (framesSent >= totalFrames) { clearInterval(timer); resolve(); }
    }, FRAME_MS);
  });
}

async function measureConnectTime(): Promise<number> {
  const t0 = Date.now();
  const dg = await openDeepgramStream(SAMPLE_RATE, {});
  const t1 = Date.now();
  dg.close();
  return t1 - t0;
}

async function measureMultiTurnOnOneConnection(turns: number): Promise<number[]> {
  const pcm = loadFixture("short-utterance.wav");
  const results: number[] = [];
  let currentResolve: (() => void) | null = null;
  let speechFinalAt = 0;
  let finalizeResolve: (() => void) | null = null;

  const dg = await openDeepgramStream(SAMPLE_RATE, {
    onSpeechFinal() { if (!speechFinalAt) { speechFinalAt = Date.now(); currentResolve?.(); } },
    onUtteranceEnd() { if (!speechFinalAt) { speechFinalAt = Date.now(); currentResolve?.(); } },
    onFinalizeComplete() { finalizeResolve?.(); },
  });

  for (let i = 0; i < turns; i++) {
    speechFinalAt = 0;
    const t0 = Date.now();
    const donePromise = new Promise<void>((res) => { currentResolve = res; });
    const sendDone = streamRealTime(dg, pcm);
    await Promise.race([donePromise, sendDone.then(() => new Promise((r) => setTimeout(r, 1500)))]);
    results.push(speechFinalAt ? speechFinalAt - t0 : -1);
    // FIX: explicitly reset Deepgram's endpointing state before the next
    // turn's audio starts, so the server doesn't carry over stale buffered
    // state across "utterances" sent back-to-back on the same connection.
    // Critically, WAIT for the flush to actually confirm (from_finalize)
    // before starting the next turn's window — otherwise a delayed flush
    // response can arrive mid-next-turn and get misread as that turn's own
    // speech_final, which is exactly what produced the earlier
    // spuriously-fast/broken numbers (fire-and-forget finalize()).
    const finalizeDone = new Promise<void>((res) => { finalizeResolve = res; });
    dg.finalize();
    await Promise.race([finalizeDone, new Promise((r) => setTimeout(r, 1000))]);
    await new Promise((r) => setTimeout(r, 500)); // realistic gap between turns
  }
  dg.close();
  return results;
}

async function main() {
  console.log("--- Deepgram connection handshake time (3 samples) ---");
  for (let i = 0; i < 3; i++) console.log(`connect ${i}: ${await measureConnectTime()}ms`);

  console.log("\n--- Multi-turn on ONE persistent connection (4 turns) ---");
  const results = await measureMultiTurnOnOneConnection(4);
  results.forEach((r, i) => console.log(`turn ${i}: ${r}ms (includes connect only for turn 0)`));
}
main().catch((e) => console.log("ERR", String(e).slice(0, 300)));
