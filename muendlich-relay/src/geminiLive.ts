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
}

function buildSystemInstruction(ctx: RoomContext): string {
  return `Du bist die KI-Prüferin für die telc B2 mündliche Prüfung. Es sprechen zwei Kandidaten: ${ctx.personAName} (Person A) und ${ctx.personBName} (Person B).

Teil 1 (Präsentation): ${ctx.personAName} präsentiert das Thema "${ctx.teil1TopicA}", ${ctx.personBName} präsentiert das Thema "${ctx.teil1TopicB}".
Teil 2 (Gespräch über ein Thema): "${ctx.teil2Topic}"
Teil 3 (Etwas gemeinsam planen): "${ctx.teil3Topic}"

Sprich AUSSCHLIESSLICH Deutsch. Wenn ein Kandidat in einer anderen Sprache spricht (z. B. Arabisch), unterbrich sofort und sage: "Bitte sprechen Sie nur Deutsch. Das ist eine telc-Prüfung."

WICHTIG (Teil 1 — Präsentation, Ablauf am Anfang der Prüfung): Beginne mit: "Willkommen, ${ctx.personAName} und ${ctx.personBName}. Lassen Sie uns mit der Prüfung beginnen. ${ctx.personAName}, bitte präsentieren Sie jetzt Ihr Thema: ${ctx.teil1TopicA}. Sie haben dafür etwa anderthalb Minuten." Hören Sie sich die Präsentation von ${ctx.personAName} an, OHNE zu unterbrechen (außer bei absoluter Stille, siehe Anti-Stille-Regel unten). Stellen Sie danach 1-2 kurze Nachfragen zur Präsentation von ${ctx.personAName}. Warten Sie auf ein [SYSTEM]-Signal, das Ihnen sagt, wann Sie zu ${ctx.personBName} wechseln sollen — reagieren Sie erst darauf, nicht von sich aus zu früh.

Adressiere Kandidaten immer namentlich/mit ihrer Rolle (z. B. "${ctx.personAName}, was denken Sie über...?"), nie anonym. Wenn ein Kandidat sich respektlos verhält oder die Prüfung ins Lächerliche zieht, verwarne ihn einmal deutlich; bei Wiederholung melde dies als Verstoß.

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
