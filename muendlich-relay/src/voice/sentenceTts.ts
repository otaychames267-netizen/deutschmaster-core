/**
 * Shared engine of the HTTP-based live TTS providers (Azure, Inworld): text arrives in word-sized pieces from the LLM stream, completed sentences are
 * queued and synthesized ONE AFTER THE OTHER (never in parallel), the tail goes out on the final call. A provider only supplies `speak()` — one HTTP
 * request that pushes raw PCM16 mono 24 kHz buffers into `emit`. The handle has the same shape as the ElevenLabs ones (appendText / cancel / done +
 * onFirstAudio / onAudioChunk / onDone / onVoiceError), so tutorVoiceSession.ts does not care which provider it talks to.
 */
import type { StreamingSynthesisCallbacks, StreamingSynthesisHandle } from "./elevenLabsTts.js";

const SENTENCE = /^([\s\S]*?[.!?…]["”)]?)\s+([\s\S]*)$/;

/** Splits streamed text into completed sentences (queued for synthesis) and a pending tail. */
export function splitSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let rest = buffer;
  for (let m = SENTENCE.exec(rest); m; m = SENTENCE.exec(rest)) { sentences.push(m[1].trim()); rest = m[2]; }
  return { sentences, rest };
}

/** One utterance: must push PCM16 mono 24 kHz buffers into `emit` as they arrive, and stop promptly when `signal` aborts. */
export type SpeakFn = (text: string, signal: AbortSignal, emit: (pcm: Buffer) => void) => Promise<void>;

export function startSentenceSynthesis(speak: SpeakFn, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  const t0 = Date.now();
  const abort = new AbortController();
  const queue: string[] = [];
  let buffer = "";
  let finished = false, cancelled = false, running = false, firstAudio = false;
  let resolveDone!: () => void, rejectDone!: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  async function speakOne(text: string): Promise<void> {
    let carry: Buffer | null = null; // keep PCM16 samples whole: a network chunk may end in the middle of a 2-byte sample
    await speak(text, abort.signal, (pcm) => {
      if (cancelled) return; // barge-in: stop emitting audio at once
      let chunk: Buffer = carry ? Buffer.concat([carry, pcm]) : pcm;
      carry = null;
      if (chunk.length % 2 === 1) { carry = chunk.subarray(chunk.length - 1); chunk = chunk.subarray(0, chunk.length - 1); }
      if (chunk.length === 0) return;
      if (!firstAudio) { firstAudio = true; callbacks.onFirstAudio?.(Date.now() - t0); }
      callbacks.onAudioChunk?.(chunk.toString("base64"));
    });
  }

  async function pump(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0 && !cancelled) await speakOne(queue.shift()!);
    } catch (e) {
      running = false;
      if (cancelled) return;
      callbacks.onVoiceError?.(String(e));
      rejectDone(e);
      return;
    }
    running = false;
    if (cancelled) return;
    if (queue.length > 0) return void pump(); // text arrived while the last sentence was draining
    if (finished) { callbacks.onDone?.(Date.now() - t0); resolveDone(); }
  }

  return {
    appendText(text: string, isFinal: boolean) {
      if (cancelled || finished) return;
      buffer += text;
      const { sentences, rest } = splitSentences(buffer);
      buffer = rest;
      for (const s of sentences) if (s) queue.push(s);
      if (isFinal) {
        finished = true;
        if (buffer.trim()) queue.push(buffer.trim());
        buffer = "";
      }
      if (queue.length > 0) void pump();
      else if (finished && !running) { callbacks.onDone?.(Date.now() - t0); resolveDone(); }
    },
    cancel() {
      cancelled = true;
      abort.abort();
      resolveDone();
    },
    done,
  };
}
