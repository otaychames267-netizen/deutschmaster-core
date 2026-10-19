// usage: ELEVENLABS_API_KEY=... npx tsx src/warmUpCheck.mjs <voiceId>   — times warmUpLiveVoice(), then the first audio of a real line right after it.
const { warmUpLiveVoice, openLiveConnection, startLiveSynthesis } = await import("./voice/elevenLabsTts.ts");
const id = process.argv[2]; let t0 = Date.now();
await warmUpLiveVoice(id); console.log("warm-up finished in", Date.now() - t0, "ms");
t0 = Date.now(); let first = null; const conn = await openLiveConnection(id);
const h = startLiveSynthesis(conn, { onFirstAudio: () => { first = Date.now() - t0; } });
h.appendText("Amira, welche Nachteile könnte es haben, wenn Kinder zu früh ein Smartphone bekommen?", true);
await Promise.race([h.done, new Promise((r) => setTimeout(r, 15000))]); conn.close();
console.log("first audio of the real line after warm-up:", first, "ms");
process.exit(0);
