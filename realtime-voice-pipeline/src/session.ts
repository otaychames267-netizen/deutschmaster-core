/**
 * session.ts — persistent bidirectional Gemini Live session wrapper.
 *
 * This is the actual "realtime/live architecture" under test: ONE
 * continuous WebSocket session for the whole exam, streaming candidate
 * audio in and examiner audio out concurrently, with the model's own
 * internal turn-detection deciding when to respond — no separate STT
 * finalize -> LLM request -> TTS request round-trips (that's
 * prototype-voice-pipeline's decomposed architecture, the thing this is
 * being compared against).
 *
 * Same Teil-1-scoped system prompt used in the earlier single-turn
 * geminiLiveBaseline.ts test, extended slightly to instruct the model to
 * keep responses to one short reaction/follow-up per turn (matching the
 * decomposed pipeline's Claude prompt, for a fair comparison).
 */
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";

function buildSystemInstruction(): string {
  return `Du bist die KI-Prüferin für die telc B2 mündliche Prüfung, Teil 1 (Präsentation). Die Kandidatin heißt Julia und präsentiert das Thema "Digitale Kommunikation im Familienalltag".

Sprich AUSSCHLIESSLICH Deutsch.

WICHTIG (kurz bleiben): Dies ist eine mündliche Prüfung, kein Unterricht. Halten Sie jeden eigenen Redebeitrag kurz und knapp — eine kurze Reaktion oder eine kurze Nachfrage, nicht mehr.

WICHTIG (keine Hilfestellung): Sie dürfen NIEMALS Argumente vorschlagen, Vokabeln anbieten, einen angefangenen Satz vervollständigen oder Grammatikfehler korrigieren.

WICHTIG (Nachfragen an die tatsächliche Antwort anpassen): Ihre Reaktion oder Nachfrage muss sich konkret auf etwas beziehen, das Julia gerade wirklich gesagt hat.

Hören Sie sich jede Äußerung an, ohne zu unterbrechen, und antworten Sie danach mit GENAU EINER kurzen Reaktion oder Nachfrage.`;
}

export interface LiveCallbacks {
  onOpen?: () => void;
  onAudioChunk?: (base64Pcm: string, atMs: number) => void;
  onOutputTranscript?: (text: string) => void;
  onInputTranscript?: (text: string) => void;
  onTurnComplete?: (atMs: number) => void;
  /** serverContent.interrupted — the SDK's own authoritative "the model's
   * response was cut off by new client input" signal (real barge-in
   * detection), not an inferred/guessed one. */
  onInterrupted?: (atMs: number) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface LiveSessionHandle {
  sendPcm16Base64(chunk: string): void;
  close(): void;
}

export function openLiveSession(callbacks: LiveCallbacks): Promise<LiveSessionHandle> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Promise.reject(new Error("GEMINI_API_KEY not set"));
  const ai = new GoogleGenAI({ apiKey: key });

  // Declared before connect() and assigned after — onopen/onmessage can fire
  // before the `await` below returns, so a `const session = await connect()`
  // referenced inside its own callbacks hits a real temporal-dead-zone
  // ReferenceError (caught live earlier this session in the exact same
  // pattern). Assign after, reference via this outer `let`.
  let session: Session | null = null;

  return new Promise((resolve, reject) => {
    (async () => {
      try {
        session = await ai.live.connect({
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: buildSystemInstruction(),
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            // Explicit end-of-speech silence window, matching Deepgram's
            // utterance_end_ms=1000 in the decomposed pipeline for a fair
            // comparison. Without this the SDK's undocumented default was
            // measured live to add SEVERAL SECONDS of extra latency before
            // the server even committed end-of-speech — see harness.ts's
            // header comment / the session's own investigation notes.
            realtimeInputConfig: {
              automaticActivityDetection: {
                silenceDurationMs: Number(process.env.GEMINI_SILENCE_DURATION_MS ?? 1000),
              },
            },
          },
          callbacks: {
            onopen: () => {
              callbacks.onOpen?.();
              resolve({
                sendPcm16Base64(chunk: string) {
                  session?.sendRealtimeInput({ audio: { data: chunk, mimeType: "audio/pcm;rate=16000" } });
                },
                close() { session?.close(); },
              });
            },
            onmessage: (msg: LiveServerMessage) => {
              const now = Date.now();
              const audioPart = msg.serverContent?.modelTurn?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("audio/"));
              if (audioPart?.inlineData?.data) callbacks.onAudioChunk?.(audioPart.inlineData.data, now);
              const outText = msg.serverContent?.outputTranscription?.text;
              if (outText) callbacks.onOutputTranscript?.(outText);
              const inText = msg.serverContent?.inputTranscription?.text;
              if (inText) callbacks.onInputTranscript?.(inText);
              if (msg.serverContent?.turnComplete) callbacks.onTurnComplete?.(now);
              if (msg.serverContent?.interrupted) callbacks.onInterrupted?.(now);
            },
            onerror: (e: any) => { callbacks.onError?.(e?.message ?? String(e)); },
            onclose: () => callbacks.onClose?.(),
          },
        });
      } catch (e) {
        reject(e);
      }
    })();
  });
}
