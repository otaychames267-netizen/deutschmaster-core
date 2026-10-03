/**
 * geminiLiveBaseline.ts — report item 10 ("comparison with current Gemini
 * Live implementation"). NOT part of the Deepgram/Claude/Cartesia
 * prototype pipeline itself — a separate, standalone measurement against
 * the REAL, currently-deployed AI core (muendlich-relay/src/geminiLive.ts),
 * reusing its exact ai.live.connect() call shape/config/model so the
 * comparison is fair. Does not touch or import from muendlich-relay/ (kept
 * fully isolated per the plan) — the connection logic below is a faithful,
 * separate copy of openMuendlichLiveSession() for measurement purposes only.
 *
 * Streams the SAME fixture audio used by harness.ts, for a like-for-like
 * comparison, with a comparable (not identical — Gemini Live doesn't expose
 * a distinct "utterance end" event the way Deepgram does) Teil-1 system
 * instruction. Measures: time from "last audio byte sent" to "first
 * response audio chunk" and to "turn complete", the closest fair analogues
 * to the prototype's t3->t7 and t3->t8 numbers.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { readWav, resamplePcm16 } from "./wav.js";

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";
const SAMPLE_RATE = 16000;
const FRAME_MS = 20;

// Same shape as buildSystemInstruction() in muendlich-relay/src/geminiLive.ts,
// trimmed to the single-candidate Teil-1 scenario this comparison uses.
function buildSystemInstruction(): string {
  return `Du bist die KI-Prüferin für die telc B2 mündliche Prüfung, Teil 1 (Präsentation). Die Kandidatin heißt Julia und präsentiert das Thema "Digitale Kommunikation im Familienalltag".

Sprich AUSSCHLIESSLICH Deutsch.

WICHTIG (kurz bleiben): Dies ist eine mündliche Prüfung, kein Unterricht. Halten Sie jeden eigenen Redebeitrag kurz und knapp.

WICHTIG (keine Hilfestellung): Sie dürfen NIEMALS Argumente vorschlagen, Vokabeln anbieten, einen angefangenen Satz vervollständigen oder Grammatikfehler korrigieren.

WICHTIG (Nachfragen an die tatsächliche Antwort anpassen): Ihre Nachfrage muss sich konkret auf etwas beziehen, das Julia gerade wirklich gesagt hat.

Hören Sie sich die Präsentation an, ohne zu unterbrechen. Stellen Sie danach GENAU EINE kurze Nachfrage.`;
}

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.log("FAIL: GEMINI_API_KEY not set"); process.exit(1); }

  const fixturePath = join(import.meta.dirname, "..", "fixtures", "sample-candidate-utterance.wav");
  const fixture = readWav(readFileSync(fixturePath));
  const pcm16k = resamplePcm16(fixture.pcm, fixture.sampleRate, SAMPLE_RATE);

  const ai = new GoogleGenAI({ apiKey: key });

  let tSendComplete: number | null = null;
  let tFirstAudio: number | null = null;
  let tTurnComplete: number | null = null;
  let inputTranscript = "";
  let outputTranscript = "";
  let audioBytes = 0;

  const done = new Promise<void>((resolve) => {
    // Declared before connect() and assigned after — onopen (and, in a race,
    // even onmessage) can fire before the `await` below returns, so a
    // `const session = await ai.live.connect(...)` with `session` referenced
    // inside its own callbacks hits a real temporal-dead-zone ReferenceError
    // (caught live on the first run of this script). The audio-send loop is
    // started explicitly after assignment instead of inside onopen, for the
    // same reason.
    let session: Session | null = null;

    (async () => {
      session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: buildSystemInstruction(),
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => console.log("Gemini Live session open."),
          onmessage: (msg: LiveServerMessage) => {
            const audioPart = msg.serverContent?.modelTurn?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("audio/"));
            if (audioPart?.inlineData?.data) {
              if (!tFirstAudio && tSendComplete) tFirstAudio = Date.now();
              audioBytes += Buffer.from(audioPart.inlineData.data, "base64").length;
            }
            const outText = msg.serverContent?.outputTranscription?.text;
            if (outText) outputTranscript += outText;
            const inText = msg.serverContent?.inputTranscription?.text;
            if (inText) inputTranscript += inText;
            if (msg.serverContent?.turnComplete && tSendComplete && !tTurnComplete) {
              tTurnComplete = Date.now();
              session?.close();
              resolve();
            }
          },
          onerror: (e: any) => { console.error("Gemini Live error:", e?.message ?? String(e)); resolve(); },
          onclose: () => resolve(),
        },
      });

      console.log("Streaming fixture audio in real time...");
      const frameBytes = Math.round(SAMPLE_RATE * (FRAME_MS / 1000)) * 2;
      let offset = 0;
      const timer = setInterval(() => {
        if (offset >= pcm16k.length) {
          clearInterval(timer);
          tSendComplete = Date.now();
          console.log(`Finished sending audio (${(pcm16k.length / 2 / SAMPLE_RATE).toFixed(1)}s of audio sent).`);
          return;
        }
        const chunk = pcm16k.subarray(offset, offset + frameBytes);
        session?.sendRealtimeInput({ audio: { data: chunk.toString("base64"), mimeType: "audio/pcm;rate=16000" } });
        offset += frameBytes;
      }, FRAME_MS);
    })();
  });

  await done;

  console.log("\n--- Gemini Live baseline result ---");
  console.log(`Input transcript (Gemini's own STT) : ${inputTranscript || "(none captured)"}`);
  console.log(`Output transcript (examiner reply)   : ${outputTranscript || "(none captured)"}`);
  console.log(`Response audio bytes received         : ${audioBytes}`);
  if (tSendComplete && tFirstAudio) console.log(`send-complete -> first response audio : ${tFirstAudio - tSendComplete}ms`);
  if (tSendComplete && tTurnComplete) console.log(`send-complete -> turn complete        : ${tTurnComplete - tSendComplete}ms`);
  process.exit(0);
}

main().catch((e) => { console.log("ERR", String(e).slice(0, 400)); process.exit(1); });
