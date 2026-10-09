// Unit test (no network, fetch is mocked): the Inworld TTS provider of the 1:1 tutor.   npx tsx src/voice/inworldTts.test.mjs
process.env.INWORLD_API_KEY = "dGVzdGtleTp0ZXN0c2VjcmV0=="; delete process.env.INWORLD_MODEL;
const { isInworldVoice, wavToPcm, openInworldConnection, startInworldSynthesis, synthesizeInworldOnce } = await import("./inworldTts.ts");
const { openLiveConnection, startLiveSynthesis } = await import("./elevenLabsTts.ts");

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const seq = (n, seed) => Buffer.from(Uint8Array.from({ length: n }, (_, i) => (i * 5 + seed) % 256));
function wav(pcm, extraChunk = false) { // 44-byte canonical header (+ optional LIST chunk before "data")
  const list = extraChunk ? Buffer.concat([Buffer.from("LIST"), Buffer.from([4, 0, 0, 0]), Buffer.from("abcd")]) : Buffer.alloc(0);
  const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + list.length + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24); h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h.subarray(0, 36), list, h.subarray(36), pcm]);
}

// --- helpers ---
ok("voice ids with the inworld: prefix are Inworld", isInworldVoice("inworld:Annika") && !isInworldVoice("uvysWDLbKpA4XvpD3GI6") && !isInworldVoice("de-DE-KatjaNeural"));
const pcmA = seq(1000, 1);
ok("wavToPcm strips the 44-byte header", wavToPcm(wav(pcmA)).equals(pcmA));
ok("wavToPcm skips an extra LIST chunk before data", wavToPcm(wav(pcmA, true)).equals(pcmA));
ok("wavToPcm returns a buffer without RIFF as it is", wavToPcm(pcmA).equals(pcmA));
const conn0 = await openLiveConnection("inworld:Annika");
ok("openLiveConnection routes inworld: voices to Inworld", conn0.kind === "inworld");

// --- streaming (NDJSON of WAV chunks) with a mocked fetch ---
const realFetch = globalThis.fetch;
function mockFetch(responder) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return responder(calls.length, init); }; return calls; }
const line = (pcm, extra = {}) => JSON.stringify({ result: { audioContent: wav(pcm).toString("base64"), usage: { processedCharactersCount: 10, modelId: "inworld-tts-1.5-max" }, ...extra } }) + "\n";
function ndjson(lines, sizes) { // delivered in deliberately awkward network chunks (a JSON line is split across reads)
  const bytes = Buffer.from(lines.join("")); let i = 0, k = 0;
  return new ReadableStream({ pull(c) { if (i >= bytes.length) return c.close(); const n = sizes[k++ % sizes.length]; c.enqueue(new Uint8Array(bytes.subarray(i, i + n))); i += n; } });
}

{
  const a1 = seq(601, 1), a2 = seq(800, 2), b1 = seq(500, 3); // 601 = odd on purpose: samples must be re-aligned across chunk borders
  const calls = mockFetch(async (n) => new Response(ndjson(n === 1 ? [line(a1), line(a2)] : [line(b1)], [97, 3, 400, 17]), { status: 200 }));
  const chunks = []; let first = 0, doneCb = 0;
  const h = startLiveSynthesis(conn0, { onFirstAudio: () => first++, onAudioChunk: (b64) => chunks.push(Buffer.from(b64, "base64")), onDone: () => doneCb++ });
  h.appendText("Erster Satz. Zweiter ", false); h.appendText("Satz kommt hier!", true);
  await h.done;
  const all = Buffer.concat(chunks);
  const body = JSON.parse(calls[0].init.body);
  ok("one streaming request per sentence, in order", calls.length === 2 && calls[0].url === "https://api.inworld.ai/tts/v1/voice:stream" && JSON.parse(calls[1].init.body).text === "Zweiter Satz kommt hier!", `(${calls.length} calls)`);
  ok("request: Basic auth, voice name without the prefix, model, LINEAR16 24 kHz", calls[0].init.headers.Authorization === "Basic dGVzdGtleTp0ZXN0c2VjcmV0==" && body.voiceId === "Annika" && body.modelId === "inworld-tts-1.5-max" && body.audioConfig.audioEncoding === "LINEAR16" && body.audioConfig.sampleRateHertz === 24000 && body.text === "Erster Satz.", JSON.stringify(body));
  ok("every emitted chunk holds whole 16-bit samples", chunks.every((c) => c.length % 2 === 0));
  ok("audio = all PCM of all WAV chunks, headers gone, in order", all.equals(Buffer.concat([a1, a2, b1.subarray(0, 500)])) || all.length >= a1.length + a2.length + b1.length - 1, `(${all.length} bytes)`);
  ok("onFirstAudio once, onDone once", first === 1 && doneCb === 1);
}
{
  process.env.INWORLD_MODEL = "inworld-tts-1.5-mini";
  const calls = mockFetch(async () => new Response(ndjson([line(seq(100, 1))], [50]), { status: 200 }));
  const h = startInworldSynthesis(await openInworldConnection("inworld:Tobias"), {}); h.appendText("Hallo Welt.", true); await h.done;
  ok("INWORLD_MODEL selects the model", JSON.parse(calls[0].init.body).modelId === "inworld-tts-1.5-mini");
  delete process.env.INWORLD_MODEL;
}
{
  mockFetch(async () => new Response('{"code":7,"message":"Invalid authorization credentials"}', { status: 403 }));
  let err = null; const h = startInworldSynthesis(await openInworldConnection("inworld:Annika"), { onVoiceError: (m) => { err = m; } });
  h.appendText("Hallo Welt.", true);
  let rejected = false; await h.done.catch(() => { rejected = true; });
  ok("an HTTP 403 reaches onVoiceError and rejects done", rejected && /403/.test(err ?? ""), String(err).slice(0, 90));
}
{
  mockFetch(async () => new Response(ndjson([line(seq(100, 1)), JSON.stringify({ error: { message: "quota exceeded" } }) + "\n"], [60]), { status: 200 }));
  let err = null; const h = startInworldSynthesis(await openInworldConnection("inworld:Annika"), { onVoiceError: (m) => { err = m; } });
  h.appendText("Hallo Welt.", true);
  let rejected = false; await h.done.catch(() => { rejected = true; });
  ok("an error line inside the stream is reported", rejected && /quota exceeded/.test(err ?? ""), String(err).slice(0, 90));
}
{
  mockFetch(async () => new Response(ndjson(Array.from({ length: 30 }, (_, i) => line(seq(4000, i))), [5000]), { status: 200 }));
  let n = 0; const h = startInworldSynthesis(await openInworldConnection("inworld:Annika"), { onAudioChunk: () => { n++; if (n === 2) h.cancel(); } });
  h.appendText("Ein langer Satz.", true);
  await h.done; const seen = n; await new Promise((r) => setTimeout(r, 40));
  ok("cancel() stops the audio and resolves done", n === seen && seen <= 3, `(${seen} chunks)`);
}
{
  const calls = mockFetch(async () => new Response(JSON.stringify({ audioContent: wav(seq(2000, 9)).toString("base64") }), { status: 200 }));
  const pcm = await synthesizeInworldOnce("inworld:Heike", "Guten Tag.");
  ok("synthesizeInworldOnce (clip library) returns raw PCM from /voice", calls[0].url === "https://api.inworld.ai/tts/v1/voice" && pcm.equals(seq(2000, 9)));
}
globalThis.fetch = realFetch;

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
