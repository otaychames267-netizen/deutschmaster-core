/**
 * Automatic TTS failover (owner 2026-10-11): when DeepInfra (Qwen3-TTS) is unusable — balance at 0 (HTTP 402), key problem (401/403), 5xx, network down —
 * the sentence is spoken by ElevenLabs instead of the exam/tutor dying with a silent examiner.
 *
 * - Per SENTENCE, and only if the failed DeepInfra request had not emitted any audio yet (never duplicates half a sentence).
 * - CIRCUIT BREAKER: after a failure the next sentences go straight to ElevenLabs for a while (120 s for account errors, 30 s for 5xx/network, 10 s for
 *   429) instead of paying a failed round trip every time; when the hold expires the next sentence probes DeepInfra again and recovery is automatic.
 * - The ElevenLabs voice is matched to the DeepInfra voice by gender and role (examiner vs partner), so the examiner keeps sounding like a woman/man and
 *   the partner stays a different voice.
 * - Cached clips (audio-library) stay in the DeepInfra voice; only the live remainder switches voice during an outage — audible, but the exam goes on.
 * - ElevenLabs needs credits too: with both accounts empty the original DeepInfra error surfaces as before (onVoiceError). Switch off: TTS_FAILOVER=off.
 * - Cost: failover characters are priced as ElevenLabs by the provider but the session cost row still prices the whole session at the DeepInfra rate, so
 *   an outage under-counts at most 2.5x on the failover characters; `getTtsFailoverStats()` / GET /health/tts expose the counters.
 */
import { VOICES } from "./voices.config.js";

/** An HTTP failure of the primary provider, with the status so the breaker can tell "account problem" from "bad input". */
export class TtsHttpError extends Error {
  constructor(public readonly status: number | null, message: string) { super(message); this.name = "TtsHttpError"; }
}

export function failoverEnabled(): boolean {
  return process.env.TTS_FAILOVER !== "off" && !!process.env.ELEVENLABS_API_KEY;
}

/** How long to route straight to the fallback after a failure with this status; 0 = this failure must NOT fail over (e.g. HTTP 400/422: our text, not the provider). */
export function holdMsFor(status: number | null): number {
  if (status === null) return 30_000;                                   // network error / timeout
  if (status === 401 || status === 402 || status === 403) return 120_000; // balance / key — will not fix itself in seconds
  if (status === 429) return 10_000;
  if (status >= 500) return 30_000;
  return 0;
}

const FALLBACK_VOICES = {
  examiner: { female: "uvysWDLbKpA4XvpD3GI6" /* Leonie */, male: "KDqku3FJfbImX6HKQdWA" /* Daniel */ },
  partner: { female: "dCnu06FiOZma2KVNUoPZ" /* Mila Winter */, male: "IWm8DnJ4NGjFI7QAM5lM" /* Stephan */ },
};

/** ElevenLabs voice id that replaces this DeepInfra voice (same gender, same role), or null when unknown. */
export function fallbackVoiceFor(deepinfraVoiceId: string): string | null {
  const v = VOICES.find((x) => x.voiceId === deepinfraVoiceId);
  const gender = v?.gender === "male" ? "male" : "female"; // unknown voices: the examiner is more often a woman; better a voice than silence
  const role = v?.pools?.includes("tutor_partner") ? "partner" : "examiner";
  return FALLBACK_VOICES[role][gender];
}

let downUntil = 0, lastReason = "", trips = 0, failoverSentences = 0, failoverChars = 0, openedAt = 0;

export function breakerOpen(now = Date.now()): boolean { return now < downUntil; }

/** Records a primary-provider failure. Returns the hold applied (0 = no failover for this failure). */
export function tripBreaker(status: number | null, detail: string, now = Date.now()): number {
  const hold = holdMsFor(status);
  if (hold === 0) return 0;
  if (now >= downUntil) { trips++; openedAt = now; console.warn(`[tts-failover] DeepInfra failed (${status ?? "network"}: ${detail.slice(0, 120)}) — speaking with ElevenLabs for the next ${Math.round(hold / 1000)} s`); }
  downUntil = Math.max(downUntil, now + hold);
  lastReason = `${status ?? "network"}: ${detail.slice(0, 200)}`;
  return hold;
}

/** The primary provider answered fine: if the breaker had been tripped, say it recovered. */
export function noteDeepinfraOk(): void {
  if (openedAt) { console.warn(`[tts-failover] DeepInfra is back (outage ${Math.round((Date.now() - openedAt) / 1000)} s, ${failoverSentences} sentences / ${failoverChars} characters were spoken by ElevenLabs so far)`); openedAt = 0; downUntil = 0; }
}

export function getTtsFailoverStats() {
  return { enabled: failoverEnabled(), breakerOpen: breakerOpen(), downForMs: Math.max(0, downUntil - Date.now()), lastReason, trips, failoverSentences, failoverChars };
}

/** Test hook. */
export function resetTtsFailover(): void { downUntil = 0; lastReason = ""; trips = 0; failoverSentences = 0; failoverChars = 0; openedAt = 0; }

/** One sentence through ElevenLabs' HTTP streaming endpoint: raw PCM16 mono 24 kHz pushed into `emit` as it arrives. */
export async function speakWithFallback(deepinfraVoiceId: string, text: string, signal: AbortSignal, emit: (pcm: Buffer) => void): Promise<void> {
  const voice = fallbackVoiceFor(deepinfraVoiceId);
  const key = process.env.ELEVENLABS_API_KEY;
  if (!voice || !key) throw new Error("TTS failover unavailable");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=pcm_24000`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: process.env.TTS_FAILOVER_MODEL ?? "eleven_flash_v2_5", language_code: "de" }),
    signal,
  });
  if (!res.ok || !res.body) throw new TtsHttpError(res.status, `ElevenLabs failover TTS ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  failoverSentences++; failoverChars += text.length;
  const reader = res.body.getReader();
  for (;;) {
    if (signal.aborted) { void reader.cancel().catch(() => {}); return; }
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) emit(Buffer.from(value));
  }
}
