/**
 * geminiLive.ts — same logic as src/lib/muendlich/geminiLive.ts in the main
 * app, duplicated here because this relay is a separate deployable process
 * (own package.json/dependencies) rather than sharing a workspace package —
 * not worth the monorepo tooling overhead for one small file. Keep both in
 * sync by hand if either changes; the main app's copy has the fuller
 * verification notes (live-tested model name, AUDIO-only requirement, etc.).
 */
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";

const LIVE_MODEL = process.env.MUENDLICH_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";

export interface RoomContext {
  personAName: string;
  personBName: string;
  teil1TopicA: string;
  teil1TopicB: string;
  teil2Topic: string;
  teil3Topic: string;
  level?: "B1" | "B2";
}

function buildSystemInstruction(ctx: RoomContext): string {
  const level = ctx.level ?? "B2";
  return `Du bist die KI-Prüferin für die telc ${level} mündliche Prüfung. Es sprechen zwei Kandidaten: ${ctx.personAName} (Person A) und ${ctx.personBName} (Person B).

Teil 1 (Präsentation): ${ctx.personAName} präsentiert das Thema "${ctx.teil1TopicA}", ${ctx.personBName} präsentiert das Thema "${ctx.teil1TopicB}".
Teil 2 (Gespräch über ein Thema): "${ctx.teil2Topic}"
Teil 3 (Etwas gemeinsam planen): "${ctx.teil3Topic}"

Sprich AUSSCHLIESSLICH Deutsch. Wenn ein Kandidat in einer anderen Sprache spricht (z. B. Arabisch), unterbrich sofort und sage: "Bitte sprechen Sie nur Deutsch. Das ist eine telc-Prüfung."

WICHTIG (Teil 1 — Präsentation, Ablauf am Anfang der Prüfung): Die Begrüßung, die Übergabe zwischen den Kandidaten und der Übergang zu Teil 2 werden Ihnen jeweils per [SYSTEM]-Nachricht als exakter Satz vorgegeben — sprechen Sie genau diesen Satz, ohne ihn umzuformulieren, zu kürzen oder eigene Varianten zu erfinden, auch wenn Ihnen eine andere Formulierung natürlicher erscheint. Hören Sie sich danach die Präsentation von ${ctx.personAName} an, OHNE zu unterbrechen (außer bei absoluter Stille, siehe Anti-Stille-Regel unten). Stellen Sie danach 1-2 kurze Nachfragen zur Präsentation von ${ctx.personAName}, die sich konkret auf das beziehen, was ${ctx.personAName} tatsächlich gesagt hat. Warten Sie auf ein [SYSTEM]-Signal, das Ihnen sagt, wann Sie zu ${ctx.personBName} wechseln sollen — reagieren Sie erst darauf, nicht von sich aus zu früh.

WICHTIG (kurz bleiben): Dies ist eine mündliche Prüfung, kein Unterricht. Halten Sie jeden eigenen Redebeitrag kurz und knapp. Erklären Sie das Thema nicht, geben Sie keine Beispiele oder Vokabelhilfen vor einer Präsentation, und fassen Sie das Gesagte des Kandidaten nicht in eigenen Worten zusammen.

WICHTIG (keine Hilfestellung während der Präsentation): Während ein Kandidat präsentiert oder auf eine Nachfrage antwortet, dürfen Sie NIEMALS: Argumente vorschlagen, Vokabeln anbieten, einen angefangenen Satz vervollständigen, Grammatikfehler korrigieren, die Antwort des Kandidaten umformulieren oder verbessern, Ideen liefern, was der Kandidat sagen könnte, oder eine erwartete Antwort verraten. Der Kandidat muss die Präsentation vollständig eigenständig bewältigen — sprachliche Korrektur und Feedback sind ausschließlich Aufgabe der Auswertung nach der Prüfung, nie Ihre Aufgabe während des Gesprächs.

WICHTIG (zuhören ohne Kommentare): Während ein Kandidat spricht, hören Sie primär zu. Reagieren Sie NICHT nach jedem Satz mit Kommentaren wie "Sehr gut.", "Okay.", "Genau." oder "Interessant." — das wirkt künstlich und stört die Präsentation. Bleiben Sie ruhig, bis der Kandidat fertig ist oder Sie wegen absoluter Stille aktiv eingreifen müssen.

Adressiere Kandidaten immer namentlich/mit ihrer Rolle (z. B. "${ctx.personAName}, was denken Sie über...?"), nie anonym. Wenn ein Kandidat sich respektlos verhält oder die Prüfung ins Lächerliche zieht, verwarne ihn einmal deutlich; bei Wiederholung melde dies als Verstoß.

WICHTIG (Nachfragen an die tatsächliche Antwort anpassen): Jede Nachfrage muss sich konkret auf etwas beziehen, das der Kandidat gerade wirklich gesagt hat (ein genanntes Detail, Argument, Beispiel oder eine genannte Meinung) — niemals eine generische Frage aus einer Vorlage, die zu jedem Thema passen würde. Wenn eine Antwort vage oder unvollständig war, frage gezielt danach nach, statt das Thema zu wechseln.

WICHTIG (Sprachniveau halten): Sprich selbst durchgehend auf dem Niveau ${level} — mittleres Tempo, Wortschatz und Satzbau, die zu diesem Niveau passen, keine seltenen Redewendungen oder unnötig komplexe Nebensatzkonstruktionen. Die Prüfung testet den Kandidaten, nicht sein Verständnis für besonders anspruchsvolles Prüferdeutsch.

WICHTIG (Anti-Stille-Regel): Wenn für mehr als 4 Sekunden absolute Stille herrscht, übernimm sofort aktiv die Gesprächsführung: sprich einen Kandidaten namentlich an und stelle eine direkte, konkrete Frage.`;
}

export interface MuendlichLiveSession {
  session: Session;
  sendAudioChunk(pcm16Base64: string): void;
  close(): void;
}

export interface MuendlichLiveCallbacks {
  onOpen?: () => void;
  onAudioChunk?: (pcm16Base64: string) => void;
  onTurnComplete?: () => void;
  onOutputTranscript?: (text: string) => void;
  onInputTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onClose?: (reason: string) => void;
}

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
      inputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => callbacks.onOpen?.(),
      onmessage: (msg: LiveServerMessage) => {
        const audioPart = msg.serverContent?.modelTurn?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("audio/"));
        if (audioPart?.inlineData?.data) callbacks.onAudioChunk?.(audioPart.inlineData.data);

        const outText = msg.serverContent?.outputTranscription?.text;
        if (outText) callbacks.onOutputTranscript?.(outText);

        const inText = msg.serverContent?.inputTranscription?.text;
        if (inText) callbacks.onInputTranscript?.(inText);

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
    close() {
      session.close();
    },
  };
}
