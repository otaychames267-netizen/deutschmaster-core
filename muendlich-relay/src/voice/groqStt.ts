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
import { openBufferedStt } from "./whisperStt.js";

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MAX_ATTEMPTS = 3;

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

async function groqTranscribe(pcm: Buffer): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const model = process.env.GROQ_STT_MODEL ?? "whisper-large-v3-turbo";
  const wav = pcm16ToWav(pcm);

  let lastErr = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(wav)], { type: "audio/wav" }), "utterance.wav");
    form.append("model", model);
    form.append("language", "de");
    form.append("response_format", "verbose_json");
    form.append("temperature", "0");
    const res = await fetch(GROQ_URL, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    if (res.ok) return cleanTranscript(await res.json());

    const body = await res.text().catch(() => "");
    lastErr = `groq ${res.status}: ${body.slice(0, 200)}`;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    const retryAfterS = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfterS) && retryAfterS > 0 ? Math.min(retryAfterS, 8) * 1000 : 800 * attempt;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error(lastErr);
}

export function openGroqStt(callbacks: SttCallbacks): Promise<SttSession> {
  if (!process.env.GROQ_API_KEY) return Promise.reject(new Error("GROQ_API_KEY not set"));
  return Promise.resolve(openBufferedStt(groqTranscribe, callbacks));
}
