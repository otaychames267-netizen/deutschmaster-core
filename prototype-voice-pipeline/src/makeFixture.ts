/**
 * makeFixture.ts — one-off script that bootstraps fixtures/sample-candidate-
 * utterance.wav by synthesizing a short, original (non-copyrighted, not
 * reproducing real telc material), B2-level scripted candidate answer via
 * Gemini's own (non-Live) TTS endpoint. Uses GEMINI_API_KEY, which is
 * already available — needs no new prerequisite.
 *
 * Adds a deliberate trailing-silence tail so Deepgram's UtteranceEnd has
 * real silence to detect against once this fixture is streamed at real
 * wall-clock pace by harness.ts.
 *
 * NOT yet run against the real Gemini TTS endpoint in this session (would
 * consume real API quota) — the model name/response shape below is
 * documented as of this session; verify on first real run.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeWav } from "./wav.js";

// Original text, written for this prototype — a plausible B2-level Teil-1
// presentation opening on the same topic as examState.ts's candidateTopic.
const SCRIPT_TEXT = `Ich möchte heute über digitale Kommunikation im Familienalltag sprechen. Meiner Meinung nach hat sich vieles verändert, seit wir alle Smartphones benutzen. Einerseits ist es praktisch, weil man auch über große Entfernungen in Kontakt bleiben kann, zum Beispiel mit Verwandten im Ausland. Andererseits finde ich, dass manche Familien dadurch weniger persönlich miteinander sprechen, weil jeder auf sein eigenes Gerät schaut. In meiner eigenen Familie versuchen wir deshalb, beim Abendessen die Handys wegzulegen.`;

// Short second clip for the interruption test (harness.ts --interrupt) — a
// candidate breaking in while the AI's reply is still being synthesized.
const INTERRUPT_TEXT = `Entschuldigung, darf ich kurz etwas hinzufügen?`;

async function synthesizeToFile(text: string, outFile: string, trailingSilenceSec: number): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_TTS_MODEL ?? "gemini-3.1-flash-tts-preview";
  const voice = process.env.GEMINI_TTS_VOICE ?? "Kore";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(`Gemini TTS ${res.status}: ${JSON.stringify(json).slice(0, 500)}`);

  const part = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error(`No inline audio data in response: ${JSON.stringify(json).slice(0, 500)}`);

  const rateMatch = /rate=(\d+)/.exec(part.mimeType ?? "");
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  const speechPcm = Buffer.from(part.data, "base64");

  // Trailing silence so UtteranceEnd (utterance_end_ms=1000 in
  // deepgramStt.ts) has real silence to key off once streamed.
  const silenceSamples = Math.round(sampleRate * trailingSilenceSec);
  const silence = Buffer.alloc(silenceSamples * 2); // PCM16 mono, zeroed = silence
  const pcm = Buffer.concat([speechPcm, silence]);

  const outPath = join(import.meta.dirname, "..", "fixtures", outFile);
  writeFileSync(outPath, writeWav({ sampleRate, channels: 1, pcm }));
  console.log(`SUCCESS: wrote ${outPath} (${(pcm.length / 2 / sampleRate).toFixed(1)}s @ ${sampleRate}Hz, incl. ${trailingSilenceSec}s trailing silence)`);
  console.log(`Scripted text: ${text}`);
}

// Shorter utterance for the large-N (30-50 turn) benchmark — a real
// back-and-forth exam turn is typically much shorter than a full Teil-1
// opening presentation; using the long fixture for every one of 30-50 runs
// would make the benchmark take 30+ minutes purely on Deepgram's real-time
// audio streaming, unrelated to what's being measured.
const SHORT_SCRIPT_TEXT = `Ja, zum Beispiel schreiben wir jetzt öfter Nachrichten, auch wenn wir im selben Haus sind.`;

async function main() {
  await synthesizeToFile(SCRIPT_TEXT, "sample-candidate-utterance.wav", 1.5);
  await synthesizeToFile(INTERRUPT_TEXT, "interruption-clip.wav", 0.5);
  await synthesizeToFile(SHORT_SCRIPT_TEXT, "short-utterance.wav", 1.2);
}

main().catch((e) => { console.log("ERR", String(e).slice(0, 300)); process.exit(1); });
