// Probe: can the Gemini Live (native-audio) API act as a LOW-LATENCY text-to-speech voice? Sends one text turn, measures first-audio time,
// total audio and whether the spoken transcript equals the text. usage: node src/geminiLiveTtsProbe.mjs <model> <voice>
import { readFileSync } from "node:fs";
import { GoogleGenAI, Modality } from "@google/genai";
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const [model, voice = "Kore"] = process.argv.slice(2);
const texts = ["Amira, warum war die Architektur in Barcelona für Sie besonders beeindruckend?", "Kommen wir nun zu unserem eigentlichen Thema. Amira, ab welchem Alter sollten Kinder Ihrer Meinung nach ein eigenes Handy haben?"];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
for (const text of texts) {
  let t0 = 0, first = null, bytes = 0, tr = "", usage = null, done;
  const finished = new Promise((r) => (done = r));
  const t00 = Date.now();
  const session = await ai.live.connect({ model, config: { responseModalities: [Modality.AUDIO], outputAudioTranscription: {}, speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      systemInstruction: "Du bist nur eine Sprechstimme (Text-to-Speech). Sprich den Text des Nutzers WORTWÖRTLICH und vollständig laut aus, mit natürlicher deutscher Betonung. Füge nichts hinzu, ändere nichts, antworte nicht darauf." },
    callbacks: { onopen: () => {}, onmessage: (m) => { const a = m.serverContent?.modelTurn?.parts?.find((p) => p.inlineData?.mimeType?.startsWith("audio/")); if (a?.inlineData?.data) { if (first === null) first = Date.now() - t0; bytes += Buffer.byteLength(a.inlineData.data, "base64"); } if (m.serverContent?.outputTranscription?.text) tr += m.serverContent.outputTranscription.text; if (m.usageMetadata) usage = m.usageMetadata; if (m.serverContent?.turnComplete) done(); }, onerror: (e) => { console.log("error", e.message); done(); }, onclose: () => done() } });
  const connectMs = Date.now() - t00; t0 = Date.now();
  session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  await Promise.race([finished, new Promise((r) => setTimeout(r, 25000))]);
  console.log(`connect ${connectMs}ms | first audio ${first}ms after text | whole ${Date.now() - t0}ms | audio ${(bytes / 48000).toFixed(1)}s | verbatim: ${tr.trim().toLowerCase().replace(/[^a-zäöüß ]/g, "") === text.toLowerCase().replace(/[^a-zäöüß ]/g, "")} | said: "${tr.trim().slice(0, 140)}" | usage ${usage ? JSON.stringify(usage.responseTokensDetails ?? usage).slice(0, 120) : "n/a"}`);
  try { session.close(); } catch {}
  await new Promise((r) => setTimeout(r, 4000));
}
process.exit(0);
