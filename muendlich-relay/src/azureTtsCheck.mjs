// Live check of the Azure TTS provider (needs a key):   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope npx tsx src/azureTtsCheck.mjs [outDir]
// Runs the configured tutor voices AND the candidate "Omni" German voices through the real streaming path (startAzureSynthesis), prints which exist, the
// time to the first audio and the audio length, saves a WAV per working voice, and prints the voices.config.ts lines worth adding.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) for (const l of readFileSync(envFile, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const { openAzureConnection, startAzureSynthesis, azureConfigured } = await import("./voice/azureTts.ts");
const { VOICES } = await import("./voice/voices.config.ts");
if (!azureConfigured()) { console.log("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first."); process.exit(0); }

const OUT = process.argv[2] ?? "voice-auditions/azure"; mkdirSync(OUT, { recursive: true });
const TEXT = "Amira, welche Nachteile könnte es haben, wenn Kinder zu früh ein Smartphone bekommen?";
const names = ["Conrad", "Katja", "Amala", "Killian", "Kasper", "Louisa", "Maja", "Ralf", "Tanja", "Johanna", "Bernd", "Christoph", "Elke", "Gisela", "Kerstin", "Klarissa", "Klaus", "Lena"];
const candidates = [
  ...VOICES.filter((v) => /^[a-z]{2,3}-[A-Z]{2}-/.test(v.voiceId)).map((v) => ({ id: v.voiceId, label: `${v.name} [configured]` })),
  { id: "de-DE-SeraphinaMultilingualNeural", label: "Seraphina Multilingual" }, { id: "de-DE-FlorianMultilingualNeural", label: "Florian Multilingual" },
  ...names.map((n) => ({ id: `de-DE-${n}:DragonHDOmniLatestNeural`, label: `${n} [Omni HD]` })),
];
const wav = (pcm) => { const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); };

const working = [];
for (const c of candidates) {
  const chunks = []; let first = null, err = null;
  try {
    const h = startAzureSynthesis(await openAzureConnection(c.id), { onFirstAudio: (ms) => { first = ms; }, onAudioChunk: (b64) => chunks.push(Buffer.from(b64, "base64")), onVoiceError: (m) => { err = m; } });
    h.appendText(TEXT, true);
    await h.done;
  } catch (e) { err = err ?? String(e); }
  const pcm = Buffer.concat(chunks);
  if (pcm.length > 0 && !err) {
    writeFileSync(`${OUT}/${c.id.replace(/[^A-Za-z0-9._-]/g, "_")}.wav`, wav(pcm));
    working.push(c); console.log(`ok   ${c.label.padEnd(34)} first audio ${String(first).padStart(5)} ms | ${(pcm.length / 48000).toFixed(1)} s audio`);
  } else console.log(`FAIL ${c.label.padEnd(34)} ${String(err).slice(0, 150)}`);
}
console.log(`\n${working.length}/${candidates.length} voices work. WAVs in ${OUT}/`);
const extra = working.filter((c) => !c.label.includes("[configured]"));
if (extra.length) console.log("Not yet in voices.config.ts (candidates for the pools):\n  " + extra.map((c) => c.id).join("\n  "));
