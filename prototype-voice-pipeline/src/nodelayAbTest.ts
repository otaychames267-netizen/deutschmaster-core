/**
 * nodelayAbTest.ts — Cartesia-independent A/B test for the TCP_NODELAY
 * (Nagle's algorithm) fix just applied to deepgramStt.ts. Toggle via
 * DEEPGRAM_NODELAY_OFF=1 to get the "before" arm without editing source.
 * Measures real speech_final/UtteranceEnd latency on FRESH single-turn
 * connections (deliberately avoids the rejected connection-reuse path —
 * see deepgramMultiTurn.ts's negative result) so noDelay is the only
 * variable being isolated.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readWav, resamplePcm16 } from "./wav.js";
import { openDeepgramStream } from "./deepgramStt.js";

const SAMPLE_RATE = 16000;
const FRAME_MS = 20;
const NODELAY_OFF = process.env.DEEPGRAM_NODELAY_OFF === "1";

function loadFixture(name: string) {
  const audio = readWav(readFileSync(join(import.meta.dirname, "..", "fixtures", name)));
  return resamplePcm16(audio.pcm, audio.sampleRate, SAMPLE_RATE);
}

function streamRealTime(session: { sendPcm16(c: Buffer): void }, pcm: Buffer): Promise<void> {
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

async function measureOnce(): Promise<{ connectMs: number; speechFinalMs: number }> {
  const pcm = loadFixture("short-utterance.wav");
  const connectT0 = Date.now();
  let speechFinalAt = 0;
  let resolveSpeech: (() => void) | null = null;
  const dg = await openDeepgramStream(SAMPLE_RATE, {
    onSpeechFinal() { if (!speechFinalAt) { speechFinalAt = Date.now(); resolveSpeech?.(); } },
    onUtteranceEnd() { if (!speechFinalAt) { speechFinalAt = Date.now(); resolveSpeech?.(); } },
  });
  const connectMs = Date.now() - connectT0;
  const t0 = Date.now();
  const donePromise = new Promise<void>((res) => { resolveSpeech = res; });
  const sendDone = streamRealTime(dg, pcm);
  await Promise.race([donePromise, sendDone.then(() => new Promise((r) => setTimeout(r, 1500)))]);
  dg.close();
  return { connectMs, speechFinalMs: speechFinalAt ? speechFinalAt - t0 : -1 };
}

async function main() {
  console.log(`--- Deepgram noDelay A/B test (arm: ${NODELAY_OFF ? "OFF/Nagle-enabled (before)" : "ON/noDelay (after, current code)"}) — n=5 fresh connections ---`);
  const results: { connectMs: number; speechFinalMs: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await measureOnce();
    console.log(`run ${i}: connect=${r.connectMs}ms speechFinal=${r.speechFinalMs}ms`);
    results.push(r);
    await new Promise((res) => setTimeout(res, 300));
  }
  const validSpeech = results.map((r) => r.speechFinalMs).filter((v) => v > 0);
  const avgConnect = results.reduce((a, b) => a + b.connectMs, 0) / results.length;
  const avgSpeech = validSpeech.reduce((a, b) => a + b, 0) / validSpeech.length;
  console.log(`\navg connect=${avgConnect.toFixed(0)}ms  avg speechFinal=${avgSpeech.toFixed(0)}ms  (n=${validSpeech.length}/5 valid)`);
}
main().catch((e) => console.log("ERR", String(e).slice(0, 300)));
