/**
 * makeFixture.ts — bootstraps multiple short, original (non-copyrighted, not
 * reproducing real telc material) German candidate turns via Gemini's own
 * (non-Live) TTS endpoint, for a genuine multi-turn conversation test (not
 * the same clip replayed) — matching the request to measure persistent-
 * session performance across a complete exchange, not one isolated turn.
 *
 * Each fixture gets a sidecar <name>.meta.json recording speechEndMs — the
 * exact playback timestamp where spoken content ends and trailing silence
 * begins. This is what lets harness.ts measure latency from the TRUE
 * moment the candidate stopped talking, not from "when my script finished
 * streaming the whole buffer including padding" (a methodology gap in the
 * first, single-turn Gemini Live baseline run earlier this session — that
 * run's "send-complete" mark included ~1.5s of already-sent trailing
 * silence, so its 75ms number likely measured the tail of an already-
 * starting response, not a true reaction time. Fixed here.)
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeWav } from "./wav.js";

const TURNS: { name: string; text: string }[] = [
  {
    name: "turn1-opening",
    text: "Ich möchte heute über digitale Kommunikation im Familienalltag sprechen. Meiner Meinung nach hat sich vieles verändert, seit wir alle Smartphones benutzen.",
  },
  {
    name: "turn2-followup",
    text: "Ja, zum Beispiel telefonieren wir jetzt viel seltener. Stattdessen schreiben wir Nachrichten, auch wenn wir im selben Haus wohnen.",
  },
  {
    name: "turn3-followup",
    text: "Ich glaube, das größte Problem ist, dass man bei einer Nachricht den Tonfall nicht hört. Deshalb kommt es öfter zu Missverständnissen.",
  },
];

const INTERRUPT_TEXT = "Entschuldigung, darf ich kurz etwas hinzufügen?";

async function synthesizeToFile(text: string, name: string, trailingSilenceSec: number): Promise<void> {
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
  if (!part?.data) throw new Error(`No inline audio data: ${JSON.stringify(json).slice(0, 500)}`);

  const rateMatch = /rate=(\d+)/.exec(part.mimeType ?? "");
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  const speechPcm = Buffer.from(part.data, "base64");
  const speechEndMs = Math.round((speechPcm.length / 2 / sampleRate) * 1000);

  const silenceSamples = Math.round(sampleRate * trailingSilenceSec);
  const silence = Buffer.alloc(silenceSamples * 2);
  const pcm = Buffer.concat([speechPcm, silence]);

  const outPath = join(import.meta.dirname, "..", "fixtures", `${name}.wav`);
  writeFileSync(outPath, writeWav({ sampleRate, channels: 1, pcm }));
  writeFileSync(join(import.meta.dirname, "..", "fixtures", `${name}.meta.json`), JSON.stringify({ text, sampleRate, speechEndMs, totalMs: Math.round((pcm.length / 2 / sampleRate) * 1000) }, null, 2));
  console.log(`SUCCESS: ${name}.wav — speech=${speechEndMs}ms + ${trailingSilenceSec}s silence @ ${sampleRate}Hz`);
}

async function main() {
  for (const t of TURNS) await synthesizeToFile(t.text, t.name, 1.5);
  await synthesizeToFile(INTERRUPT_TEXT, "interrupt-clip", 0.5);
}
main().catch((e) => { console.log("ERR", String(e).slice(0, 300)); process.exit(1); });
