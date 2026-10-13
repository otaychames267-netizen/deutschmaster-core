/**
 * Groq-hosted Whisper STT (whisper-large-v3-turbo, $0.04/hour published —
 * see whisperStt.ts for why a non-ElevenLabs STT exists at all). Plugs into
 * the shared utterance-buffering client; this file only knows how to turn one
 * PCM16@16kHz buffer into text via Groq's OpenAI-compatible
 * /audio/transcriptions endpoint.
 *
 * Free-tier limits (published): 20 requests/min, 7,200 audio-seconds/hour,
 * 2,000 requests/day, every request billed/counted at a 10s minimum — enough
 * for early traffic; a 429 is retried with backoff (Retry-After honoured)
 * before surfacing as an STT error.
 *
 * Whisper-specific guards:
 *  - verbose_json + per-segment filter (no_speech_prob > 0.6 AND avg_logprob
 *    < -1.0 → dropped): Whisper hallucinates stock phrases on noise/silence
 *    ("Untertitel der Amara.org-Community", "Vielen Dank fürs Zuschauen").
 *  - A small stock-phrase blocklist as a second net for the same failure.
 *  - NO `prompt` parameter on purpose: a conditioning prompt can be echoed
 *    back as the "transcript" of near-silent audio.
 *  - temperature 0: deterministic, verbatim-leaning (candidate errors must
 *    survive into the transcript — the evaluation grades them).
 */
import type { SttCallbacks, SttSession } from "./elevenLabsStt.js";
import { openBufferedStt, type BufferedSttOptions } from "./whisperStt.js";
import { PERMANENT_MARKER } from "./failoverStt.js";
import { GROQ_STT_USD_PER_HOUR } from "./costAccounting.js";

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

/** Two hosted Whisper providers speak the same OpenAI-compatible /audio/transcriptions API (verified 2026-10-13 on the same audio: identical verbose_json shape with segments + no_speech_prob,
 * same word accuracy, median request latency 1.36 s DeepInfra vs 1.30 s Groq). DeepInfra is pay-as-you-go ($0.00020/min = $0.012/h, no free-tier ceiling, billed on the audio actually sent);
 * Groq's account is on the FREE tier (2,000 requests/day, 7,200 audio-s/hour) and bills every request for at least 10 s. */
export type HostedWhisperProvider = "groq" | "deepinfra";
interface ProviderConfig { label: HostedWhisperProvider; url: string; keyEnv: string; model: () => string; minBilledSeconds: number; usdPerHour: () => number; paymentRequiredIsPermanent: boolean }
const PROVIDERS: Record<HostedWhisperProvider, ProviderConfig> = {
  groq: { label: "groq", url: GROQ_URL, keyEnv: "GROQ_API_KEY", model: () => process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo", minBilledSeconds: 10, usdPerHour: () => GROQ_STT_USD_PER_HOUR, paymentRequiredIsPermanent: false },
  deepinfra: { label: "deepinfra", url: "https://api.deepinfra.com/v1/openai/audio/transcriptions", keyEnv: "DEEPINFRA_API_KEY", model: () => process.env.DEEPINFRA_STT_MODEL ?? "openai/whisper-large-v3-turbo", minBilledSeconds: 0, usdPerHour: () => Number(process.env.DEEPINFRA_STT_USD_PER_HOUR ?? 0.012), paymentRequiredIsPermanent: true },
};
const MAX_ATTEMPTS = 3;
// 7 s (was 15 s, 2026-10-10): a normal request answers in 0.5-1.5 s; in a full real-candidate run two 15 s timeouts + retries put a 34 s hole into one tutor turn.
// A request that is still silent after 7 s is abandoned and retried (the retry usually answers at once), and 2 failed requests in a row switch the stream to ElevenLabs.
const REQUEST_TIMEOUT_MS = Number(process.env.GROQ_REQUEST_TIMEOUT_MS ?? 7_000);

const STOCK_HALLUCINATIONS = [
  /untertitel(ung)?\s+(der|von|im auftrag)/i,
  /amara\.org/i,
  /vielen dank f(ü|ue)r(s| das)?\s+(zuschauen|zuh(ö|oe)ren|ihre aufmerksamkeit)/i,
  /^\s*(tschüss|bis zum nächsten mal)[.!\s]*$/i,
];

function pcm16ToWav(pcm: Buffer, sampleRate = 16_000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function cleanTranscript(data: any): string {
  const segments: any[] = Array.isArray(data?.segments) ? data.segments : [];
  const kept = segments.length
    ? segments.filter((s) => !(Number(s.no_speech_prob) > 0.6 && Number(s.avg_logprob) < -1.0)).map((s) => String(s.text ?? ""))
    : [String(data?.text ?? "")];
  const text = kept.join(" ").replace(/\s+/g, " ").trim();
  return STOCK_HALLUCINATIONS.some((re) => re.test(text)) ? "" : text;
}

async function hostedTranscribe(pcm: Buffer, cfg: ProviderConfig, onBilled?: (seconds: number) => void): Promise<string> {
  const key = process.env[cfg.keyEnv];
  if (!key) throw new Error(`${cfg.keyEnv} not set`);
  const model = cfg.model();
  const wav = pcm16ToWav(pcm);

  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "utterance.wav");
    form.append("model", model);
    form.append("language", "de");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    let res: Response;
    try {
      // Per-request timeout: segments are transcribed through ONE ordered
      // chain (whisperStt.ts), so a single hung request would otherwise block
      // every later segment for the rest of the exam. Network errors (seen
      // live: "fetch failed" on 1 of 8 sequential calls) are retried like a 5xx.
      res = await fetch(cfg.url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    } catch (e) {
      lastErr = `${cfg.label} request failed: ${e instanceof Error ? e.message : String(e)}`;
      if (attempt === MAX_ATTEMPTS) break;
      console.warn(`[hostedStt] ${lastErr} (attempt ${attempt}/${MAX_ATTEMPTS}), retrying`);
      await new Promise((r) => setTimeout(r, 400 * attempt));
      continue;
    }
    if (res.ok) {
      onBilled?.(Math.max(cfg.minBilledSeconds, pcm.length / 2 / 16_000));
      return cleanTranscript(await res.json());
    }

    const body = await res.text().catch(() => "");
    lastErr = `${cfg.label} ${res.status}: ${body.slice(0, 200)}`;
    const retryAfterS = Number(res.headers.get("retry-after"));
    // Errors retrying cannot fix are flagged so failoverStt.ts switches this
    // stream to the fallback backend IMMEDIATELY instead of after several
    // doomed, slow attempts: a bad/revoked key, or a 429 that is the DAILY
    // quota (Retry-After of minutes/hours, or a "per day" message) — not a
    // momentary per-minute burst.
    const dailyQuota = res.status === 429 && (retryAfterS > 10 || /per day|\b(RPD|TPD|ASD)\b/.test(body));
    // 402 = DeepInfra balance used up: retrying cannot help, hand the stream to the backup provider at once
    if (res.status === 401 || res.status === 403 || dailyQuota || (cfg.paymentRequiredIsPermanent && res.status === 402)) throw new Error(`${PERMANENT_MARKER} ${lastErr}`);
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    const waitMs = Number.isFinite(retryAfterS) && retryAfterS > 0 ? Math.min(retryAfterS, 8) * 1000 : 800 * attempt;
    console.warn(`[hostedStt] ${cfg.label} ${res.status} on attempt ${attempt}/${MAX_ATTEMPTS}, retrying in ${waitMs}ms`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error(lastErr);
}

export function openHostedWhisperStt(provider: HostedWhisperProvider, callbacks: SttCallbacks, opts?: BufferedSttOptions): Promise<SttSession> {
  const cfg = PROVIDERS[provider];
  if (!process.env[cfg.keyEnv]) return Promise.reject(new Error(`${cfg.keyEnv} not set`));
  let requests = 0, billedSeconds = 0;
  const session = openBufferedStt((pcm) => hostedTranscribe(pcm, cfg, (s) => { requests++; billedSeconds += s; }), callbacks, opts);
  return Promise.resolve(Object.assign(session, {
    billing: () => ({ requests, billedSeconds }),
    costUsd: () => (billedSeconds / 3600) * cfg.usdPerHour(),
    providerLabel: () => cfg.label,
  }));
}

export function openGroqStt(callbacks: SttCallbacks, opts?: BufferedSttOptions): Promise<SttSession> {
  return openHostedWhisperStt("groq", callbacks, opts);
}
