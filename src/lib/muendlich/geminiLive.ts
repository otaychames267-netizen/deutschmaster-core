/**
 * geminiLive.ts — server-side wrapper around the Gemini Live API for the
 * Room 2 AI examiner. MUST run in a persistent server process, never in the
 * browser or a stateless serverless function — the underlying connection is a
 * long-lived, stateful WebSocket held open for the duration of an exam
 * (minutes), which this app's current Vercel serverless deployment cannot
 * host. See project memory for the hosting decision this is blocked on.
 *
 * Verified live against the real API 2026-07-08: connects, streams audio
 * (PCM 24kHz mono) both directions, model `gemini-3.1-flash-live-preview` is
 * what this project's API key actually has access to right now (NOT the
 * `gemini-live-2.5-flash-preview` shown in the SDK's own example docstring —
 * that model returned "not found" for this key/API version; always confirm
 * against a live models.list call rather than trusting a hardcoded name, model
 * availability shifts). Response modality AUDIO requires config to request
 * AUDIO specifically — this model rejects a TEXT-only request outright.
 */
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";

const LIVE_MODEL = process.env.MUENDLICH_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";

export interface RoomContext {
  personAName: string;
  personBName: string;
  teil1TopicA: string; // per-slot locked title+guiding points from Room 1 — A and B usually differ, unlike Teil 2/3
  teil1TopicB: string;
  teil2Topic: string; // locked title from Room 1
  teil3Topic: string; // locked title + body_text from Room 1
}

function buildSystemInstruction(ctx: RoomContext): string {
  return `Du bist die KI-Prüferin für die telc B2 mündliche Prüfung. Es sprechen zwei Kandidaten: ${ctx.personAName} (Person A) und ${ctx.personBName} (Person B).

Teil 1 (Präsentation): ${ctx.personAName} präsentiert das Thema "${ctx.teil1TopicA}", ${ctx.personBName} präsentiert das Thema "${ctx.teil1TopicB}".
Teil 2 (Gespräch über ein Thema): "${ctx.teil2Topic}"
Teil 3 (Etwas gemeinsam planen): "${ctx.teil3Topic}"

Sprich AUSSCHLIESSLICH Deutsch. Wenn ein Kandidat in einer anderen Sprache spricht (z. B. Arabisch), unterbrich sofort und sage: "Bitte sprechen Sie nur Deutsch. Das ist eine telc-Prüfung."

WICHTIG (Teil 1 — Präsentation, Ablauf am Anfang der Prüfung): Beginne mit: "Willkommen, ${ctx.personAName} und ${ctx.personBName}. Lassen Sie uns mit der Prüfung beginnen. ${ctx.personAName}, bitte präsentieren Sie jetzt Ihr Thema: ${ctx.teil1TopicA}. Sie haben dafür etwa anderthalb Minuten." Hören Sie sich die Präsentation von ${ctx.personAName} an, ohne zu unterbrechen. Stellen Sie danach 1-2 kurze Nachfragen zur Präsentation von ${ctx.personAName}. Warten Sie auf ein [SYSTEM]-Signal, das Ihnen sagt, wann Sie zu ${ctx.personBName} wechseln sollen — reagieren Sie erst darauf, nicht von sich aus zu früh.

Adressiere Kandidaten immer namentlich/mit ihrer Rolle (z. B. "${ctx.personAName}, was denken Sie über...?"), nie anonym. Wenn ein Kandidat sich respektlos verhält oder die Prüfung ins Lächerliche zieht, verwarne ihn einmal deutlich; bei Wiederholung melde dies als Verstoß.`;
}

export interface MuendlichLiveSession {
  session: Session;
  sendAudioChunk(pcm16Base64: string): void;
  sendActivityStart(): void;
  sendActivityEnd(): void;
  close(): void;
}

export interface MuendlichLiveCallbacks {
  onOpen?: () => void;
  /** Raw PCM audio (24kHz, mono, base64) from the model — forward to whichever client(s) should hear it. */
  onAudioChunk?: (pcm16Base64: string) => void;
  /** Fires once the model's current turn has fully finished streaming. */
  onTurnComplete?: () => void;
  /** The model's own transcript of what it said (if transcription is enabled) — feed into muendlich_transcript_nodes. */
  onOutputTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onClose?: (reason: string) => void;
}

/**
 * Opens one Live session for one exam room. Audio input uses automatic
 * (server-side) Voice Activity Detection by default — Gemini Live has this
 * built in, so the "4-second silence -> AI takes over" and barge-in logic
 * from the spec should be layered ON TOP of this (via activityStart/End and
 * app-level silence timers), not reimplemented as a custom VAD from scratch.
 */
export async function openMuendlichLiveSession(ctx: RoomContext, callbacks: MuendlichLiveCallbacks): Promise<MuendlichLiveSession> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const ai = new GoogleGenAI({ apiKey: key });

  const session: Session = await ai.live.connect({
    model: LIVE_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: buildSystemInstruction(ctx),
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => callbacks.onOpen?.(),
      onmessage: (msg: LiveServerMessage) => {
        const audioPart = msg.serverContent?.modelTurn?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("audio/"));
        if (audioPart?.inlineData?.data) callbacks.onAudioChunk?.(audioPart.inlineData.data);

        const transcript = msg.serverContent?.outputTranscription?.text;
        if (transcript) callbacks.onOutputTranscript?.(transcript);

        if (msg.serverContent?.turnComplete) callbacks.onTurnComplete?.();
      },
      onerror: (e: ErrorEvent) => callbacks.onError?.(e.message ?? String(e)),
      onclose: (e: CloseEvent) => callbacks.onClose?.(e?.reason ?? ""),
    },
  });

  return {
    session,
    sendAudioChunk(pcm16Base64: string) {
      session.sendRealtimeInput({ audio: { data: pcm16Base64, mimeType: "audio/pcm;rate=16000" } });
    },
    sendActivityStart() {
      session.sendRealtimeInput({ activityStart: {} });
    },
    sendActivityEnd() {
      session.sendRealtimeInput({ activityEnd: {} });
    },
    close() {
      session.close();
    },
  };
}
