/**
 * Inworld TTS as a live TTS provider for the 1:1 tutor — owner 2026-10-09 (cost: TTS-1.5 Max 10 USD / Mini 5 USD per 1M characters against ElevenLabs'
 * 40; 17 German voices; streaming first audio measured at 0.26-0.7 s). Azure was tried first but Microsoft refused the account.
 *
 * Streaming: POST https://api.inworld.ai/tts/v1/voice:stream with `Authorization: Basic <the portal's "Basic (Base64)" key>` answers with newline-
 * delimited JSON, one `{"result":{"audioContent":"<base64 WAV chunk>","usage":{...}}}` per chunk; every chunk is a small WAV file (44-byte header +
 * PCM16), the header is stripped here so the client gets the raw 24 kHz PCM16 mono it already plays.
 * (The base64 key must keep its trailing "==" — a copy that lost it is rejected with 403 "Invalid authorization credentials".)
 *
 * Voices are configured as `inworld:<Name>` (e.g. "inworld:Annika") so a voice id is unambiguous next to the 20-character ElevenLabs ids.
 * Env: INWORLD_API_KEY, optional INWORLD_MODEL (default "inworld-tts-1.5-max"; "inworld-tts-1.5-mini" is half the price and a bit faster).
 */
import type { StreamingSynthesisCallbacks, StreamingSynthesisHandle } from "./elevenLabsTts.js";
import { startSentenceSynthesis } from "./sentenceTts.js";

export const INWORLD_PREFIX = "inworld:";

export interface InworldConnection {
  kind: "inworld";
  voiceId: string; // "inworld:Annika"
  close(): void;
}

export function isInworldVoice(voiceId: string): boolean {
  return voiceId.startsWith(INWORLD_PREFIX);
}

export function inworldConfigured(): boolean {
  return !!process.env.INWORLD_API_KEY;
}

function apiName(voiceId: string): string {
  return voiceId.slice(INWORLD_PREFIX.length);
}

function request(voiceId: string, text: string, stream: boolean): { url: string; init: RequestInit } {
  const key = process.env.INWORLD_API_KEY;
  if (!key) throw new Error("INWORLD_API_KEY not set");
  return {
    url: `https://api.inworld.ai/tts/v1/voice${stream ? ":stream" : ""}`,
    init: {
      method: "POST",
      headers: { Authorization: `Basic ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: apiName(voiceId), modelId: process.env.INWORLD_MODEL ?? "inworld-tts-1.5-max", audioConfig: { audioEncoding: "LINEAR16", sampleRateHertz: 24000 } }),
    },
  };
}

/** Raw PCM16 out of a WAV buffer (finds the "data" chunk; a buffer without a RIFF header is returned as is). Exported for tests. */
export function wavToPcm(wav: Buffer): Buffer {
  if (wav.length < 12 || wav.toString("latin1", 0, 4) !== "RIFF") return wav;
  let pos = 12;
  while (pos + 8 <= wav.length) {
    const id = wav.toString("latin1", pos, pos + 4);
    const size = wav.readUInt32LE(pos + 4);
    if (id === "data") return wav.subarray(pos + 8, size === 0 || size === 0xffffffff ? wav.length : Math.min(wav.length, pos + 8 + size));
    pos += 8 + size + (size % 2);
  }
  return Buffer.alloc(0);
}

/** One-shot synthesis (the whole utterance as PCM16@24 kHz) — for the offline clip library and the live check. */
export async function synthesizeInworldOnce(voiceId: string, text: string): Promise<Buffer> {
  const { url, init } = request(voiceId, text, false);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) {
      const j = (await res.json()) as { audioContent?: string };
      if (!j.audioContent) throw new Error("Inworld TTS: response without audioContent");
      return wavToPcm(Buffer.from(j.audioContent, "base64"));
    }
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    throw new Error(`Inworld TTS ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  throw new Error("Inworld TTS: gave up after 4 attempts");
}

export function openInworldConnection(voiceId: string): Promise<InworldConnection> {
  if (!inworldConfigured()) return Promise.reject(new Error("INWORLD_API_KEY not set"));
  return Promise.resolve({ kind: "inworld", voiceId, close() {} }); // HTTP: nothing to hold open
}

export function startInworldSynthesis(conn: InworldConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  return startSentenceSynthesis(async (text, signal, emit) => {
    const { url, init } = request(conn.voiceId, text, true);
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(url, { ...init, signal });
      if (res.ok || (res.status !== 429 && res.status < 500)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!res || !res.ok || !res.body) throw new Error(`Inworld TTS ${res?.status}: ${(await res?.text().catch(() => ""))?.slice(0, 300)}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    const handleLine = (line: string) => {
      if (!line.trim()) return;
      let j: { result?: { audioContent?: string }; error?: { message?: string } };
      try { j = JSON.parse(line); } catch { return; }
      if (j.error) throw new Error(`Inworld TTS stream error: ${j.error.message ?? JSON.stringify(j.error)}`);
      const b64 = j.result?.audioContent;
      if (b64) emit(wavToPcm(Buffer.from(b64, "base64")));
    };
    for (;;) {
      if (signal.aborted) { void reader.cancel().catch(() => {}); return; }
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      let nl = pending.indexOf("\n");
      while (nl >= 0) { handleLine(pending.slice(0, nl)); pending = pending.slice(nl + 1); nl = pending.indexOf("\n"); }
    }
    handleLine(pending);
  }, callbacks);
}
