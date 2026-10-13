// Live check of the Inworld TTS provider through the relay's real live switch (openLiveConnection / startLiveSynthesis), for every configured Inworld voice:
//   npx tsx src/inworldTtsCheck.mjs [outDir]       (INWORLD_API_KEY from the environment or muendlich-relay/.env)
// Prints the time to the first audio and the audio length per voice (a 2-sentence reply, like the tutor's), saves one WAV per voice.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
const envFile = new URL("../.env", import.meta.url);
if (existsSync(envFile)) for (const l of readFileSync(envFile, "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const { openLiveConnection, startLiveSynthesis } = await import("./voice/elevenLabsTts.ts");
const { VOICES } = await import("./voice/voices.config.ts");
if (!process.env.INWORLD_API_KEY) { console.log("INWORLD_API_KEY is not set."); process.exit(0); }

const OUT = process.argv[2] ?? "voice-auditions/inworld-live"; mkdirSync(OUT, { recursive: true });
const TEXT = "Amira, welche Nachteile könnte es haben, wenn Kinder zu früh ein Smartphone bekommen? Und wie unterscheidet sich das von Ihrer eigenen Kindheit?";
const wav = (pcm) => { const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); };

let ok = 0; const firsts = [];
for (const v of VOICES.filter((x) => x.enabled && x.voiceId.startsWith("inworld:"))) {
  const chunks = []; let first = null, err = null;
  try {
    const conn = await openLiveConnection(v.voiceId);
    const h = startLiveSynthesis(conn, { onFirstAudio: (ms) => { first = ms; }, onAudioChunk: (b64) => chunks.push(Buffer.from(b64, "base64")), onVoiceError: (m) => { err = m; } });
    // word-sized pieces like the Claude stream
    for (let i = 0; i < TEXT.length; i += 12) h.appendText(TEXT.slice(i, i + 12), false);
    h.appendText("", true);
    await h.done; conn.close();
  } catch (e) { err = err ?? String(e); }
  const pcm = Buffer.concat(chunks);
  if (pcm.length > 0 && !err) {
    writeFileSync(`${OUT}/${v.voiceId.replace(/[^A-Za-z0-9._-]/g, "_")}.wav`, wav(pcm)); ok++; firsts.push(first);
    console.log(`ok   ${v.name.padEnd(22)} [${(v.pools ?? []).join(",")}]  first audio ${String(first).padStart(5)} ms | ${(pcm.length / 48000).toFixed(1)} s audio | even samples: ${pcm.length % 2 === 0}`);
  } else console.log(`FAIL ${v.name}: ${String(err).slice(0, 160)}`);
}
console.log(`\n${ok} voices ok, first audio avg ${Math.round(firsts.reduce((a, b) => a + b, 0) / Math.max(1, firsts.length))} ms (the first sentence waits for the end of the sentence, like in the tutor)`);
