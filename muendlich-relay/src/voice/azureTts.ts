/**
 * Azure AI Speech (neural / DragonHD) as a live TTS provider for the 1:1 tutor — owner 2026-10-09 (cost: ~15-30 USD per 1M characters against
 * ElevenLabs' 40; DragonHD answers in < 300 ms and has German GA voices, see voices.config.ts).
 *
 * One HTTP request per sentence: POST SSML to {region}.tts.speech.microsoft.com, the body streams back as raw 24 kHz PCM16 mono — the exact wire
 * format the client already plays, so no transcoding. The handle has the same shape as the ElevenLabs ones (appendText / cancel / done +
 * onFirstAudio / onAudioChunk / onDone / onVoiceError), so tutorVoiceSession.ts does not care which provider it talks to.
 *
 * Env: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (e.g. "westeurope"), optional AZURE_HD_TEMPERATURE (DragonHD randomness 0..1, default 0.7).
 * NOT yet run against the real service when this file was written (no key at hand) — azureTtsCheck.mjs is the live check.
 */
import type { StreamingSynthesisCallbacks, StreamingSynthesisHandle } from "./elevenLabsTts.js";

export interface AzureConnection {
  kind: "azure";
  voiceId: string; // the Azure voice name, e.g. "de-DE-Seraphina:DragonHDLatestNeural"
  close(): void;
}

/** Azure voice names look like "de-DE-KatjaNeural" or "de-DE-Seraphina:DragonHDLatestNeural"; ElevenLabs ids are 20 alphanumeric characters. */
export function isAzureVoice(voiceId: string): boolean {
  return /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+/.test(voiceId);
}

export function azureConfigured(): boolean {
  return !!process.env.AZURE_SPEECH_KEY && !!process.env.AZURE_SPEECH_REGION;
}

export function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** SSML for one utterance. DragonHD voices accept a `temperature` (lower = steadier delivery); other neural voices do not take `parameters`. */
export function buildAzureSsml(voiceName: string, text: string): string {
  const lang = /^([a-z]{2,3}-[A-Z]{2})-/.exec(voiceName)?.[1] ?? "de-DE";
  const temperature = Number(process.env.AZURE_HD_TEMPERATURE ?? 0.7);
  const params = voiceName.includes(":DragonHD") && temperature >= 0 && temperature <= 1 ? ` parameters="temperature=${temperature}"` : "";
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voiceName}"${params}>${escapeXml(text)}</voice></speak>`;
}

function endpoint(): { url: string; headers: Record<string, string> } {
  const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set");
  return {
    url: `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "raw-24khz-16bit-mono-pcm", "User-Agent": "aura-lingovia-relay" },
  };
}

/** One-shot synthesis (whole utterance as a Buffer of PCM16@24 kHz) — for the offline clip library and the live check. */
export async function synthesizeAzureOnce(voiceName: string, text: string): Promise<Buffer> {
  const { url, headers } = endpoint();
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { method: "POST", headers, body: buildAzureSsml(voiceName, text) });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    throw new Error(`Azure TTS ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  throw new Error("Azure TTS: gave up after 4 attempts");
}

export function openAzureConnection(voiceId: string): Promise<AzureConnection> {
  if (!azureConfigured()) return Promise.reject(new Error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set"));
  return Promise.resolve({ kind: "azure", voiceId, close() {} }); // HTTP: nothing to hold open
}

const SENTENCE = /^([\s\S]*?[.!?…]["”)]?)\s+([\s\S]*)$/;

/** Splits streamed text into completed sentences (queued for synthesis) and a pending tail. Exported for tests. */
export function splitSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let rest = buffer;
  for (let m = SENTENCE.exec(rest); m; m = SENTENCE.exec(rest)) { sentences.push(m[1].trim()); rest = m[2]; }
  return { sentences, rest };
}

/** Sentence-by-sentence synthesis in order: each completed sentence is sent as soon as it is complete, the tail on the final call. */
export function startAzureSynthesis(conn: AzureConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  const t0 = Date.now();
  const abort = new AbortController();
  const queue: string[] = [];
  let buffer = "";
  let finished = false, cancelled = false, running = false, firstAudio = false;
  let resolveDone!: () => void, rejectDone!: (e: unknown) => void;
  const done = new Promise<void>((res, rej) => { resolveDone = res; rejectDone = rej; });

  async function speak(text: string): Promise<void> {
    const { url, headers } = endpoint();
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(url, { method: "POST", headers, body: buildAzureSsml(conn.voiceId, text), signal: abort.signal });
      if (res.ok || (res.status !== 429 && res.status < 500)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!res || !res.ok || !res.body) throw new Error(`Azure TTS ${res?.status}: ${(await res?.text().catch(() => ""))?.slice(0, 300)}`);
    const reader = res.body.getReader();
    let carry: Buffer | null = null; // keep PCM16 samples whole: an HTTP chunk may end in the middle of a 2-byte sample
    for (;;) {
      if (cancelled) { void reader.cancel().catch(() => {}); return; } // barge-in: stop emitting audio at once
      const { done: eof, value } = await reader.read();
      if (eof || cancelled) { if (cancelled) void reader.cancel().catch(() => {}); break; }
      let chunk: Buffer = carry ? Buffer.concat([carry, Buffer.from(value)]) : Buffer.from(value);
      carry = null;
      if (chunk.length % 2 === 1) { carry = chunk.subarray(chunk.length - 1); chunk = chunk.subarray(0, chunk.length - 1); }
      if (chunk.length === 0) continue;
      if (!firstAudio) { firstAudio = true; callbacks.onFirstAudio?.(Date.now() - t0); }
      callbacks.onAudioChunk?.(chunk.toString("base64"));
    }
  }

  async function pump(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0 && !cancelled) await speak(queue.shift()!);
    } catch (e) {
      running = false;
      if (cancelled) return;
      callbacks.onVoiceError?.(String(e));
      rejectDone(e);
      return;
    }
    running = false;
    if (cancelled) return;
    if (queue.length > 0) return void pump(); // text arrived while the last chunk was draining
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
