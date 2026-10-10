/**
 * Shared engine of the HTTP-based live TTS providers (Azure, Inworld, DeepInfra): text arrives in word-sized pieces from the LLM stream, completed
 * sentences are queued and synthesized, the tail goes out on the final call. A provider only supplies `speak()` — one HTTP request that pushes raw PCM16
 * mono 24 kHz buffers into `emit`. The handle has the same shape as the ElevenLabs ones (appendText / cancel / done + onFirstAudio / onAudioChunk / onDone /
 * onVoiceError), so tutorVoiceSession.ts does not care which provider it talks to.
 *
 * Latency (owner 2026-10-10: the first audio of a Qwen request takes ~2 s, which is the largest single piece of the pause after the student stops talking):
 *  - EARLY FIRST CHUNK: the first piece of an utterance is cut at its first clause boundary (, ; : — –) once at least TTS_EARLY_CLAUSE_MIN_CHARS (default 35,
 *    0 = off) characters have arrived, instead of waiting for the end of the whole sentence — the request starts ~0.5-1 s earlier.
 *  - PREFETCH (opt-in: `maxParallel`, default 1 = strictly one request after the other; DeepInfra uses 2): up to maxParallel requests run at the same time; audio is still emitted strictly in order (a later piece is buffered until the pieces
 *    before it have been emitted), so the next piece is usually ready before the previous one has finished playing — no gap between the pieces.
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

/** First clause of a not-yet-finished sentence: everything up to the first , ; : — – that follows at least `minChars` characters (and is followed by a space).
 * Exported for tests. Returns null when there is no such boundary (yet). */
export function splitEarlyClause(buffer: string, minChars: number): { first: string; rest: string } | null {
  if (minChars <= 0 || buffer.length < minChars + 2) return null;
  const re = /[,;:—–]\s/g;
  for (let m = re.exec(buffer); m; m = re.exec(buffer)) {
    const end = m.index + 1; // include the punctuation mark
    if (end >= minChars) return { first: buffer.slice(0, end).trim(), rest: buffer.slice(end).trimStart() };
  }
  return null;
}

function earlyClauseMinChars(): number {
  const v = Number(process.env.TTS_EARLY_CLAUSE_MIN_CHARS);
  return process.env.TTS_EARLY_CLAUSE_MIN_CHARS !== undefined && process.env.TTS_EARLY_CLAUSE_MIN_CHARS !== "" && Number.isFinite(v) && v >= 0 ? v : 35;
}

/** One utterance: must push PCM16 mono 24 kHz buffers into `emit` as they arrive, and stop promptly when `signal` aborts. */
export type SpeakFn = (text: string, signal: AbortSignal, emit: (pcm: Buffer) => void) => Promise<void>;

interface Job { text: string; held: Buffer[]; done: boolean; error: unknown; failed: boolean; carry: Buffer | null }

export interface SentenceSynthesisOptions { /** Requests in flight at the same time (audio is always emitted in order). Default 1. */ maxParallel?: number }

export function startSentenceSynthesis(speak: SpeakFn, callbacks: StreamingSynthesisCallbacks, opts?: SentenceSynthesisOptions): StreamingSynthesisHandle {
  const maxParallel = Math.max(1, opts?.maxParallel ?? 1);
  const t0 = Date.now();
  const abort = new AbortController();
  const pending: string[] = [];   // pieces not started yet
  const jobs: Job[] = [];         // started pieces, in speaking order; jobs[0] is the one being emitted
  let buffer = "";
  let finished = false, cancelled = false, failed = false, firstAudio = false, doneFired = false, emittedPieces = 0, queuedPieces = 0;
  let resolveDone!: () => void, rejectDone!: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  /** Emit one aligned PCM chunk of the job at the head of the line. */
  function emitNow(chunk: Buffer) {
    if (cancelled || failed || chunk.length === 0) return;
    if (!firstAudio) { firstAudio = true; callbacks.onFirstAudio?.(Date.now() - t0); }
    callbacks.onAudioChunk?.(chunk.toString("base64"));
  }

  /** Keep PCM16 samples whole (a network chunk may end in the middle of a 2-byte sample), then emit or hold depending on the job's place in the line. */
  function onPcm(job: Job, pcm: Buffer) {
    if (cancelled || failed) return; // barge-in / failure: stop emitting audio at once
    let chunk: Buffer = job.carry ? Buffer.concat([job.carry, pcm]) : pcm;
    job.carry = null;
    if (chunk.length % 2 === 1) { job.carry = chunk.subarray(chunk.length - 1); chunk = chunk.subarray(0, chunk.length - 1); }
    if (chunk.length === 0) return;
    if (jobs[0] === job) emitNow(chunk); else job.held.push(chunk);
  }

  function settle() {
    if (cancelled || failed || doneFired) return;
    // retire finished jobs from the head; the next job's held audio is released the moment it becomes the head
    while (jobs.length > 0 && jobs[0].done) {
      const head = jobs.shift()!;
      if (head.failed) { failed = true; callbacks.onVoiceError?.(String(head.error)); rejectDone(head.error); return; }
      emittedPieces++;
      const next = jobs[0];
      if (next) { for (const c of next.held) emitNow(c); next.held = []; }
    }
    launch();
    if (jobs.length === 0 && pending.length === 0 && finished) { doneFired = true; callbacks.onDone?.(Date.now() - t0); resolveDone(); }
  }

  function launch() {
    while (!cancelled && !failed && pending.length > 0 && jobs.filter((j) => !j.done).length < maxParallel) {
      const job: Job = { text: pending.shift()!, held: [], done: false, error: null, failed: false, carry: null };
      jobs.push(job);
      speak(job.text, abort.signal, (pcm) => onPcm(job, pcm))
        .then(() => { job.done = true; })
        .catch((e) => { job.done = true; if (!cancelled) { job.failed = true; job.error = e; } })
        .finally(() => settle());
    }
  }

  function queue(piece: string) {
    if (!piece) return;
    pending.push(piece);
    queuedPieces++;
  }

  return {
    appendText(text: string, isFinal: boolean) {
      if (cancelled || finished || failed) return;
      buffer += text;
      const { sentences, rest } = splitSentences(buffer);
      buffer = rest;
      for (const s of sentences) queue(s);
      // very first piece of the utterance: don't wait for the end of the sentence if a clause is already complete
      if (queuedPieces === 0 && !isFinal) {
        const early = splitEarlyClause(buffer, earlyClauseMinChars());
        if (early) { queue(early.first); buffer = early.rest; }
      }
      if (isFinal) {
        finished = true;
        if (buffer.trim()) queue(buffer.trim());
        buffer = "";
      }
      launch();
      if (jobs.length === 0 && pending.length === 0 && finished) settle(); // nothing to say at all
    },
    cancel() {
      cancelled = true;
      abort.abort();
      resolveDone();
    },
    done,
  };
}
