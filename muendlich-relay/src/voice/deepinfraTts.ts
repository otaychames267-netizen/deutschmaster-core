/**
 * DeepInfra (Qwen3-TTS) as a live TTS provider — owner 2026-10-09 (cost: 20 USD per 1M characters against ElevenLabs' 40-50; owner judged Qwen3-TTS
 * the best-sounding German of everything auditioned). Used by the 1:1 tutor (TUTOR_TTS_PROVIDER=deepinfra) and the 2:1 exam room (EXAM_TTS_PROVIDER=deepinfra).
 *
 * OpenAI-compatible endpoint: POST https://api.deepinfra.com/v1/openai/audio/speech { model, voice, input, response_format: "pcm" } with
 * `Authorization: Bearer <key>`; the answer is a raw audio byte stream. Qwen3-TTS has 9 built-in voices (Vivian, Serena, ... — none of them native
 * German) and takes cloned voices by id; the owner's German voices are cloned from VoiceDesign samples so the timbre is the same in every sentence
 * (a VoiceDesign prompt re-draws the voice on EVERY request).
 *
 * Voices are configured as `deepinfra:<voice>` (e.g. "deepinfra:Vivian" or "deepinfra:<cloned voice id>"); `<voice>` is sent as the API's `voice`.
 * Env: DEEPINFRA_API_KEY, optional DEEPINFRA_TTS_MODEL (default "Qwen/Qwen3-TTS").
 * Assumption to verify with the first live run (needs balance): "pcm" is PCM16 mono at 24 kHz, like OpenAI's — deepinfraTtsCheck.mjs prints the audio
 * length per voice so a wrong rate (too fast / slow audio) shows up at once.
 */
import type { StreamingSynthesisCallbacks, StreamingSynthesisHandle } from "./elevenLabsTts.js";
import { startSentenceSynthesis } from "./sentenceTts.js";

export const DEEPINFRA_PREFIX = "deepinfra:";
const URL = "https://api.deepinfra.com/v1/openai/audio/speech";

export interface DeepInfraConnection {
  kind: "deepinfra";
  voiceId: string; // "deepinfra:Vivian"
  close(): void;
}

export function isDeepInfraVoice(voiceId: string): boolean {
  return voiceId.startsWith(DEEPINFRA_PREFIX);
}

export function deepinfraConfigured(): boolean {
  return !!process.env.DEEPINFRA_API_KEY;
}

function request(voiceId: string, text: string): { url: string; init: RequestInit } {
  const key = process.env.DEEPINFRA_API_KEY;
  if (!key) throw new Error("DEEPINFRA_API_KEY not set");
  return {
    url: URL,
    init: {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.DEEPINFRA_TTS_MODEL ?? "Qwen/Qwen3-TTS", voice: voiceId.slice(DEEPINFRA_PREFIX.length), input: text, response_format: "pcm" }),
    },
  };
}

/** One-shot synthesis (the whole utterance as PCM16@24 kHz) — for the offline clip library and the live check. */
export async function synthesizeDeepInfraOnce(voiceId: string, text: string): Promise<Buffer> {
  const { url, init } = request(voiceId, text);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 1500 * (attempt + 1))); continue; }
    throw new Error(`DeepInfra TTS ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  throw new Error("DeepInfra TTS: gave up after 4 attempts");
}

export function openDeepInfraConnection(voiceId: string): Promise<DeepInfraConnection> {
  if (!deepinfraConfigured()) return Promise.reject(new Error("DEEPINFRA_API_KEY not set"));
  return Promise.resolve({ kind: "deepinfra", voiceId, close() {} }); // HTTP: nothing to hold open
}

export function startDeepInfraSynthesis(conn: DeepInfraConnection, callbacks: StreamingSynthesisCallbacks): StreamingSynthesisHandle {
  return startSentenceSynthesis(async (text, signal, emit) => {
    const { url, init } = request(conn.voiceId, text);
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(url, { ...init, signal });
      if (res.ok || (res.status !== 429 && res.status < 500)) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!res || !res.ok || !res.body) throw new Error(`DeepInfra TTS ${res?.status}: ${(await res?.text().catch(() => ""))?.slice(0, 300)}`);
    const reader = res.body.getReader();
    for (;;) {
      if (signal.aborted) { void reader.cancel().catch(() => {}); return; }
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) emit(Buffer.from(value));
    }
  }, callbacks);
}
