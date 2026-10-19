// usage: ELEVENLABS_API_KEY=... npx tsx src/ttsStreamCheck.mjs <voiceId> <modelId>   — drives the relay's REAL streaming TTS path (/stream-input) and reports time-to-first-audio.
process.env.ELEVENLABS_DYNAMIC_TTS_MODEL = process.argv[3];
const { openStreamingConnection, startStreamingSynthesis } = await import("./voice/elevenLabsTts.ts");
const texts = [
  "Amira, Sie haben erwähnt, dass die Reise teuer war. Was hat am meisten gekostet?",
  "Amira, Sie haben gesagt, dass Sie Ihr Spanisch verbessern konnten — in welchen Situationen hat das besonders gut geklappt, und was möchten Sie als Nächstes üben?",
  "Kommen wir jetzt zu unserem neuen Thema: Kinder und Handys. Amira, was denken Sie: Ab welchem Alter sollte ein Kind ein eigenes Handy besitzen, und welche Regeln wären Ihrer Meinung nach sinnvoll, damit Eltern und Schule gemeinsam Verantwortung übernehmen können?",
];
for (const text of texts) {
  const t0 = Date.now(); let first = null, bytes = 0, err = null;
  try {
    const conn = await openStreamingConnection(process.argv[2]); const tConn = Date.now() - t0;
    const h = startStreamingSynthesis(conn, { onFirstAudio: () => { first = Date.now() - t0; }, onAudioChunk: (b64) => { bytes += Buffer.byteLength(b64, "base64"); }, onVoiceError: (m) => { err = m; } });
    h.appendText(text, false); h.appendText("", true);
    await Promise.race([h.done, new Promise((_, rj) => setTimeout(() => rj(new Error("timeout 20s")), 20000))]);
    const secs = bytes / 48000;
    console.log(`${process.argv[3].padEnd(18)} chars=${String(text.length).padStart(3)} connect=${tConn}ms firstAudio=${first}ms audio=${secs.toFixed(1)}s total=${Date.now() - t0}ms ${err ? "ERR " + err : "ok"}`);
    try { conn.close(); } catch {}
  } catch (e) { console.log(`${process.argv[3]} chars=${text.length} FAILED:`, e.message, err ?? ""); }
}
process.exit(0);
