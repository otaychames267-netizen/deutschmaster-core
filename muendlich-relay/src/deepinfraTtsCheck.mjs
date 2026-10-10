// Live check of the DeepInfra (Qwen3-TTS) provider through the relay's real switches (openLiveConnection + openExamConnection):
//   npx tsx src/deepinfraTtsCheck.mjs <outDir> [voice[,voice...]]      (DEEPINFRA_API_KEY from the environment or muendlich-relay/.env; needs balance)
// voice = a built-in name (Vivian, Serena, ...) or a cloned voice id. Prints the time to the first audio and the audio length per voice (a 2-sentence reply,
// like the tutor's) — a 2-sentence German line is ~9-11 s at normal pace, so a wrong sample-rate assumption (PCM is read as 24 kHz) shows as odd length.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) for (const l of readFileSync(envFile, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const { openLiveConnection, startLiveSynthesis, openExamConnection, startExamSynthesis } = await import("./voice/elevenLabsTts.ts");
if (!process.env.DEEPINFRA_API_KEY) { console.log("DEEPINFRA_API_KEY is not set."); process.exit(0); }

const OUT = process.argv[2] ?? "voice-auditions/deepinfra-live"; mkdirSync(OUT, { recursive: true });
const voices = (process.argv[3] ?? "Vivian").split(",").map((v) => (v.startsWith("deepinfra:") ? v : `deepinfra:${v}`));
const TEXT = "Amira, welche Nachteile könnte es haben, wenn Kinder zu früh ein Smartphone bekommen? Und wie unterscheidet sich das von Ihrer eigenen Kindheit?";
const wav = (pcm) => { const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); };

for (const [label, open, start] of [["tutor", openLiveConnection, startLiveSynthesis], ["exam ", openExamConnection, startExamSynthesis]]) {
  for (const voiceId of voices) {
    const chunks = []; let first = null, err = null;
    try {
      const conn = await open(voiceId);
      const h = start(conn, { onFirstAudio: (ms) => { first = ms; }, onAudioChunk: (b64) => chunks.push(Buffer.from(b64, "base64")), onVoiceError: (m) => { err = m; } });
      for (let i = 0; i < TEXT.length; i += 12) h.appendText(TEXT.slice(i, i + 12), false); // word-sized pieces like the Claude stream
      h.appendText("", true);
      await h.done; conn.close();
    } catch (e) { err = err ?? String(e); }
    const pcm = Buffer.concat(chunks);
    if (pcm.length > 0 && !err) {
      if (label === "tutor") writeFileSync(`${OUT}/${voiceId.replace(/[^A-Za-z0-9._-]/g, "_")}.wav`, wav(pcm));
      console.log(`ok   ${label} ${voiceId.padEnd(26)} first audio ${String(first).padStart(5)} ms | ${(pcm.length / 48000).toFixed(1)} s audio (24 kHz assumed) | even samples: ${pcm.length % 2 === 0}`);
    } else console.log(`FAIL ${label} ${voiceId}: ${String(err).slice(0, 200)}`);
  }
}
