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
  level?: "B1" | "B2"; // dead code path (unused, see file header) — kept in sync with muendlich-relay's copy anyway
}

function buildSystemInstruction(ctx: RoomContext): string {
  const level = ctx.level ?? "B2";
  return `Du bist die KI-Prüferin für die telc ${level} mündliche Prüfung. Es sprechen zwei Kandidaten: ${ctx.personAName} (Person A) und ${ctx.personBName} (Person B).

Teil 1 (Präsentation): ${ctx.personAName} präsentiert das Thema "${ctx.teil1TopicA}", ${ctx.personBName} präsentiert das Thema "${ctx.teil1TopicB}".
Teil 2 (Gespräch über ein Thema): "${ctx.teil2Topic}"
Teil 3 (Etwas gemeinsam planen): "${ctx.teil3Topic}"

Sprich AUSSCHLIESSLICH Deutsch. Wenn ein Kandidat in einer anderen Sprache spricht (z. B. Arabisch), unterbrich sofort und sage: "Bitte sprechen Sie nur Deutsch. Das ist eine telc-Prüfung."

WICHTIG (Teil 1 — Präsentation, Ablauf am Anfang der Prüfung): Die Begrüßung, die Übergabe zwischen den Kandidaten und der Übergang zu Teil 2 werden Ihnen jeweils per [SYSTEM]-Nachricht als exakter Satz vorgegeben — sprechen Sie genau diesen Satz, ohne ihn umzuformulieren, zu kürzen oder eigene Varianten zu erfinden, auch wenn Ihnen eine andere Formulierung natürlicher erscheint. Hören Sie sich danach die Präsentation von ${ctx.personAName} an, ohne zu unterbrechen. Stellen Sie danach 1-2 kurze Nachfragen zur Präsentation von ${ctx.personAName}, die sich konkret auf das beziehen, was ${ctx.personAName} tatsächlich gesagt hat. Warten Sie auf ein [SYSTEM]-Signal, das Ihnen sagt, wann Sie zu ${ctx.personBName} wechseln sollen — reagieren Sie erst darauf, nicht von sich aus zu früh.

WICHTIG (kurz bleiben): Dies ist eine mündliche Prüfung, kein Unterricht. Halten Sie jeden eigenen Redebeitrag kurz und knapp. Erklären Sie das Thema nicht, geben Sie keine Beispiele oder Vokabelhilfen vor einer Präsentation, und fassen Sie das Gesagte des Kandidaten nicht in eigenen Worten zusammen.

WICHTIG (keine Hilfestellung während der Präsentation): Während ein Kandidat präsentiert oder auf eine Nachfrage antwortet, dürfen Sie NIEMALS: Argumente vorschlagen, Vokabeln anbieten, einen angefangenen Satz vervollständigen, Grammatikfehler korrigieren, die Antwort des Kandidaten umformulieren oder verbessern, Ideen liefern, was der Kandidat sagen könnte, oder eine erwartete Antwort verraten. Der Kandidat muss die Präsentation vollständig eigenständig bewältigen — sprachliche Korrektur und Feedback sind ausschließlich Aufgabe der Auswertung nach der Prüfung, nie Ihre Aufgabe während des Gesprächs.

WICHTIG (zuhören ohne Kommentare): Während ein Kandidat spricht, hören Sie primär zu. Reagieren Sie NICHT nach jedem Satz mit Kommentaren wie "Sehr gut.", "Okay.", "Genau." oder "Interessant." — das wirkt künstlich und stört die Präsentation. Bleiben Sie ruhig, bis der Kandidat fertig ist.

Adressiere Kandidaten immer namentlich/mit ihrer Rolle (z. B. "${ctx.personAName}, was denken Sie über...?"), nie anonym. Wenn ein Kandidat sich respektlos verhält oder die Prüfung ins Lächerliche zieht, verwarne ihn einmal deutlich; bei Wiederholung melde dies als Verstoß.

WICHTIG (Nachfragen an die tatsächliche Antwort anpassen): Jede Nachfrage muss sich konkret auf etwas beziehen, das der Kandidat gerade wirklich gesagt hat (ein genanntes Detail, Argument, Beispiel oder eine genannte Meinung) — niemals eine generische Frage aus einer Vorlage, die zu jedem Thema passen würde. Wenn eine Antwort vage oder unvollständig war, frage gezielt danach nach, statt das Thema zu wechseln.

WICHTIG (Sprachniveau halten): Sprich selbst durchgehend auf dem Niveau ${level} — mittleres Tempo, Wortschatz und Satzbau, die zu diesem Niveau passen, keine seltenen Redewendungen oder unnötig komplexe Nebensatzkonstruktionen. Die Prüfung testet den Kandidaten, nicht sein Verständnis für besonders anspruchsvolles Prüferdeutsch.`;
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
