// Unit test (no network, fetch is mocked): the DeepInfra (Qwen3-TTS) provider of the 1:1 tutor and the 2:1 exam room.   npx tsx src/voice/deepinfraTts.test.mjs
process.env.DEEPINFRA_API_KEY = "test-key"; process.env.INWORLD_API_KEY = "dGVzdGtleTp0ZXN0c2VjcmV0=="; delete process.env.DEEPINFRA_TTS_MODEL; delete process.env.EXAM_TTS_PROVIDER; delete process.env.TUTOR_TTS_PROVIDER;
const { isDeepInfraVoice, openDeepInfraConnection, startDeepInfraSynthesis, synthesizeDeepInfraOnce } = await import("./deepinfraTts.ts");
const { openLiveConnection, startLiveSynthesis, openExamConnection, startExamSynthesis } = await import("./elevenLabsTts.ts");
const { voiceProvider, examProvider, tutorProvider, getExamPool } = await import("./voicePools.ts");

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const seq = (n, seed) => Buffer.from(Uint8Array.from({ length: n }, (_, i) => (i * 5 + seed) % 256));
const realFetch = globalThis.fetch;
function mockFetch(responder) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return responder(calls.length, init); }; return calls; }
function chunked(buf, sizes) { // raw PCM delivered in deliberately awkward network chunks (odd sizes split 16-bit samples)
  let i = 0, k = 0;
  return new ReadableStream({ pull(c) { if (i >= buf.length) return c.close(); const n = sizes[k++ % sizes.length]; c.enqueue(new Uint8Array(buf.subarray(i, i + n))); i += n; } });
}

// --- ids and routing ---
ok("voice ids with the deepinfra: prefix are DeepInfra", isDeepInfraVoice("deepinfra:Vivian") && !isDeepInfraVoice("inworld:Annika") && !isDeepInfraVoice("uvysWDLbKpA4XvpD3GI6"));
ok("voiceProvider recognises deepinfra", voiceProvider({ voiceId: "deepinfra:Vivian" }) === "deepinfra" && voiceProvider({ voiceId: "inworld:Annika" }) === "inworld" && voiceProvider({ voiceId: "uvysWDLbKpA4XvpD3GI6" }) === "elevenlabs");
ok("openLiveConnection (1:1 tutor) routes deepinfra: voices to DeepInfra", (await openLiveConnection("deepinfra:Vivian")).kind === "deepinfra");
ok("openExamConnection (2:1 room) routes deepinfra: voices to DeepInfra", (await openExamConnection("deepinfra:Vivian")).kind === "deepinfra");
ok("openExamConnection routes inworld: voices to Inworld", (await openExamConnection("inworld:Annika")).kind === "inworld");

// --- env switches: default stays ElevenLabs; the key must exist ---
ok("EXAM_TTS_PROVIDER unset -> elevenlabs", examProvider() === "elevenlabs");
process.env.EXAM_TTS_PROVIDER = "deepinfra"; ok("EXAM_TTS_PROVIDER=deepinfra with a key -> deepinfra", examProvider() === "deepinfra");
const key = process.env.DEEPINFRA_API_KEY; delete process.env.DEEPINFRA_API_KEY;
ok("EXAM_TTS_PROVIDER=deepinfra without a key falls back to elevenlabs", examProvider() === "elevenlabs");
ok("openDeepInfraConnection rejects without a key", await openDeepInfraConnection("deepinfra:Vivian").then(() => false, () => true));
process.env.DEEPINFRA_API_KEY = key;
delete process.env.EXAM_TTS_PROVIDER;
process.env.TUTOR_TTS_PROVIDER = "deepinfra"; ok("TUTOR_TTS_PROVIDER=deepinfra -> deepinfra", tutorProvider() === "deepinfra"); delete process.env.TUTOR_TTS_PROVIDER;
ok("with the default provider the exam pool is the ElevenLabs pool", getExamPool("examiner").length > 0 && getExamPool("examiner").every((v) => voiceProvider(v) === "elevenlabs"));

// --- streaming ---
{
  const a = seq(1201, 1), b = seq(900, 2); // 1201 = odd on purpose: samples must be re-aligned across chunk borders
  const calls = mockFetch(async (n) => new Response(chunked(n === 1 ? a : b, [97, 3, 400, 17]), { status: 200 }));
  const chunks = []; let first = 0, doneCb = 0;
  const conn = await openLiveConnection("deepinfra:Vivian");
  const h = startLiveSynthesis(conn, { onFirstAudio: () => first++, onAudioChunk: (b64) => chunks.push(Buffer.from(b64, "base64")), onDone: () => doneCb++ });
  h.appendText("Erster Satz. Zweiter ", false); h.appendText("Satz kommt hier!", true);
  await h.done;
  const body = JSON.parse(calls[0].init.body);
  ok("one request per sentence, in order", calls.length === 2 && calls[0].url === "https://api.deepinfra.com/v1/openai/audio/speech" && JSON.parse(calls[1].init.body).input === "Zweiter Satz kommt hier!", `(${calls.length} calls)`);
  ok("request: Bearer auth, model, voice without the prefix, pcm", calls[0].init.headers.Authorization === "Bearer test-key" && body.model === "Qwen/Qwen3-TTS" && body.voice === "Vivian" && body.response_format === "pcm" && body.input === "Erster Satz.", JSON.stringify(body));
  ok("every emitted chunk holds whole 16-bit samples", chunks.every((c) => c.length % 2 === 0));
  const all = Buffer.concat(chunks);
  ok("audio = all PCM bytes in order (a trailing odd byte per sentence may be dropped)", all.length >= a.length + b.length - 2 && all.subarray(0, 1200).equals(a.subarray(0, 1200)), `(${all.length} bytes)`);
  ok("onFirstAudio once, onDone once", first === 1 && doneCb === 1);
}
{
  process.env.DEEPINFRA_TTS_MODEL = "Qwen/Qwen3-TTS-VoiceDesign";
  const calls = mockFetch(async () => new Response(chunked(seq(100, 1), [50]), { status: 200 }));
  const conn = await openExamConnection("deepinfra:abc123");
  const h = startExamSynthesis(conn, {}); h.appendText("Hallo Welt.", true); await h.done;
  const body = JSON.parse(calls[0].init.body);
  ok("DEEPINFRA_TTS_MODEL selects the model; the cloned voice id is passed as voice (exam room path)", body.model === "Qwen/Qwen3-TTS-VoiceDesign" && body.voice === "abc123");
  delete process.env.DEEPINFRA_TTS_MODEL;
}
{
  const calls = mockFetch(async () => new Response(chunked(seq(100, 1), [50]), { status: 200 }));
  const h0 = startDeepInfraSynthesis(await openDeepInfraConnection("deepinfra:Vivian"), {}); h0.appendText("Hallo.", true); await h0.done;
  process.env.DEEPINFRA_SERVICE_TIER = "priority";
  const h1 = startDeepInfraSynthesis(await openDeepInfraConnection("deepinfra:Vivian"), {}); h1.appendText("Hallo.", true); await h1.done;
  delete process.env.DEEPINFRA_SERVICE_TIER;
  ok("service_tier is sent only when DEEPINFRA_SERVICE_TIER is set", !("service_tier" in JSON.parse(calls[0].init.body)) && JSON.parse(calls[1].init.body).service_tier === "priority");
}
{
  mockFetch(async () => new Response('{"detail":{"error":"You need positive balance to do inference."}}', { status: 402 }));
  let err = null; const h = startDeepInfraSynthesis(await openDeepInfraConnection("deepinfra:Vivian"), { onVoiceError: (m) => { err = m; } });
  h.appendText("Hallo Welt.", true);
  let rejected = false; await h.done.catch(() => { rejected = true; });
  ok("an HTTP 402 (no balance) reaches onVoiceError and rejects done", rejected && /402/.test(err ?? "") && /positive balance/.test(err ?? ""), String(err).slice(0, 90));
}
{
  let n = 0; const calls = mockFetch(async () => (++n === 1 ? new Response("busy", { status: 503 }) : new Response(chunked(seq(100, 1), [50]), { status: 200 })));
  let got = 0; const h = startDeepInfraSynthesis(await openDeepInfraConnection("deepinfra:Vivian"), { onAudioChunk: () => got++ });
  h.appendText("Hallo Welt.", true); await h.done;
  ok("a 503 is retried once and then succeeds", calls.length === 2 && got > 0);
}
{
  mockFetch(async () => new Response(chunked(seq(60000, 1), [5000]), { status: 200 }));
  let n = 0; const h = startDeepInfraSynthesis(await openDeepInfraConnection("deepinfra:Vivian"), { onAudioChunk: () => { n++; if (n === 2) h.cancel(); } });
  h.appendText("Ein langer Satz.", true);
  await h.done; const seen = n; await new Promise((r) => setTimeout(r, 40));
  ok("cancel() stops the audio and resolves done", n === seen && seen <= 3, `(${seen} chunks)`);
}
{
  const calls = mockFetch(async () => new Response(seq(2000, 9), { status: 200 }));
  const pcm = await synthesizeDeepInfraOnce("deepinfra:Serena", "Guten Tag.");
  ok("synthesizeDeepInfraOnce (clip library) returns the raw PCM", calls[0].url === "https://api.deepinfra.com/v1/openai/audio/speech" && pcm.equals(seq(2000, 9)));
}
globalThis.fetch = realFetch;

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
