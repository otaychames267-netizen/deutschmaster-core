// usage: ELEVENLABS_API_KEY=... ELEVENLABS_TTS_PATH=dialogue ELEVENLABS_DIALOGUE_MODEL=eleven_v4_turbo npx tsx src/ttsLiveCheck.mjs <voiceId> <texts.json>
// Drives the relay's real live-TTS switch (openLiveConnection/startLiveSynthesis) with real tutor replies; chunks the text like Claude's stream does.
import { readFileSync } from "node:fs";
const { openLiveConnection, startLiveSynthesis, liveTtsPath, liveTtsModel } = await import("./voice/elevenLabsTts.ts");
const { welcome, replies } = JSON.parse(readFileSync(process.argv[3], "utf8")); const texts = [welcome, ...replies].slice(0, Number(process.env.N ?? 6));
console.log("path:", liveTtsPath(), "| model:", liveTtsModel());
let chars = 0, secs = 0, ok = 0; const firsts = [], totals = [];
for (const text of texts) {
  const t0 = Date.now(); let first = null, bytes = 0, err = null;
  try {
    const conn = await openLiveConnection(process.argv[2]);
    const h = startLiveSynthesis(conn, { onFirstAudio: () => { first = Date.now() - t0; }, onAudioChunk: (b64) => { bytes += Buffer.byteLength(b64, "base64"); }, onVoiceError: (m) => { err = m; } });
    for (let i = 0; i < text.length; i += 12) h.appendText(text.slice(i, i + 12), false); // word-sized fragments, like the Claude stream
    h.appendText("", true);
    await Promise.race([h.done, new Promise((_, rj) => setTimeout(() => rj(new Error("timeout 20s")), 20000))]);
    try { conn.close(); } catch {}
    chars += text.length; secs += bytes / 48000; ok++; firsts.push(first); totals.push(Date.now() - t0);
    if (err) console.log("voice error:", err);
  } catch (e) { console.log(`FAILED (${text.length} chars): ${e.message} ${err ?? ""}`); }
}
console.log(`ok ${ok}/${texts.length} | chars ${chars} | audio ${secs.toFixed(0)}s | first audio avg ${Math.round(firsts.reduce((a, b) => a + b, 0) / Math.max(firsts.length, 1))}ms (min ${Math.min(...firsts)} max ${Math.max(...firsts)}) | whole utterance avg ${Math.round(totals.reduce((a, b) => a + b, 0) / Math.max(totals.length, 1))}ms`);
process.exit(0);
