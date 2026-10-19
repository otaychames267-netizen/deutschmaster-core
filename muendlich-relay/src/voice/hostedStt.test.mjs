// Unit test (no network, fetch is mocked): hosted Whisper STT — DeepInfra primary, Groq backup.   node --import tsx src/voice/hostedStt.test.mjs
process.env.DEEPINFRA_API_KEY = "di-key"; process.env.GROQ_API_KEY = "gq-key"; process.env.STT_HEDGE_AFTER_MS = "200";
delete process.env.DEEPINFRA_STT_MODEL; delete process.env.GROQ_STT_MODEL; delete process.env.DEEPINFRA_STT_USD_PER_HOUR;
const { openHostedWhisperStt, openGroqStt } = await import("./groqStt.ts");
const { openFailoverStt } = await import("./failoverStt.ts");
const { computeExamCost } = await import("./costAccounting.ts");

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const realFetch = globalThis.fetch;
function mock(responder) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return responder(String(url), calls.length, init); }; return calls; }
const okJson = (text) => new Response(JSON.stringify({ text, segments: [{ text, no_speech_prob: 0.01, avg_logprob: -0.2 }] }), { status: 200 });

// 2.0 s of "speech" (a 440 Hz tone at a clearly voiced level), PCM16 @ 16 kHz, in 100 ms frames
const SPEECH_SECONDS = 2.0;
function speechFrames(seconds = SPEECH_SECONDS) {
  const frames = []; const n = Math.round(seconds * 10);
  for (let f = 0; f < n; f++) { const b = Buffer.alloc(3200); for (let i = 0; i < 1600; i++) b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 440 * ((f * 1600 + i) / 16000))), i * 2); frames.push(b.toString("base64")); }
  return frames;
}
function collector() { const committed = [], errors = []; return { committed, errors, cb: { onCommitted: (t) => committed.push(t), onError: (m) => errors.push(m), onClose: () => {} } }; }
async function say(stt, seconds) { for (const fr of speechFrames(seconds)) stt.sendPcm16(fr); await stt.flush(); }
const OPTS = { flushDebounceMs: 20 };

// 1) DeepInfra alone: right URL, model, auth; billed on the audio actually sent (no 10 s minimum); $0.012/h
{
  const c = collector();
  const calls = mock(() => okJson("Guten Tag zusammen"));
  const stt = await openHostedWhisperStt("deepinfra", c.cb, OPTS);
  await say(stt, SPEECH_SECONDS);
  const form = calls[0]?.init?.body;
  ok("DeepInfra: POST to the DeepInfra OpenAI-compatible transcription endpoint with its own key", calls.length === 1 && calls[0].url === "https://api.deepinfra.com/v1/openai/audio/transcriptions" && calls[0].init.headers.Authorization === "Bearer di-key");
  ok("DeepInfra: model openai/whisper-large-v3-turbo, German, verbose_json, temperature 0", form?.get("model") === "openai/whisper-large-v3-turbo" && form.get("language") === "de" && form.get("response_format") === "verbose_json" && form.get("temperature") === "0");
  ok("DeepInfra: transcript delivered", c.committed.length === 1 && c.committed[0] === "Guten Tag zusammen" && c.errors.length === 0);
  const b = stt.billing();
  ok("DeepInfra: billed seconds = the audio sent (about 2.5 s with the speech padding), NOT a 10 s minimum", b.requests === 1 && b.billedSeconds > 1.9 && b.billedSeconds < 3.2, JSON.stringify(b));
  ok("DeepInfra: costUsd = billed seconds x $0.012/h and providerLabel is 'deepinfra'", approx(stt.costUsd(), (b.billedSeconds / 3600) * 0.012) && stt.providerLabel() === "deepinfra");
  stt.close();
}

// 2) Groq alone keeps its 10 s minimum billing and $0.04/h (unchanged behaviour of the old path, used by the 2:1 room)
{
  const c = collector();
  const calls = mock(() => okJson("Hallo"));
  const stt = await openGroqStt(c.cb, OPTS);
  await say(stt, SPEECH_SECONDS);
  ok("Groq: Groq endpoint, whisper-large-v3-turbo, Groq key", calls[0].url === "https://api.groq.com/openai/v1/audio/transcriptions" && calls[0].init.body.get("model") === "whisper-large-v3-turbo" && calls[0].init.headers.Authorization === "Bearer gq-key");
  ok("Groq: billed at a 10 s minimum per request, $0.04/h", stt.billing().billedSeconds === 10 && approx(stt.costUsd(), (10 / 3600) * 0.04) && stt.providerLabel() === "groq");
  stt.close();
}

// 3) Missing key => the open itself rejects (so the chain can be built conditionally)
{
  const saved = process.env.DEEPINFRA_API_KEY; delete process.env.DEEPINFRA_API_KEY;
  let rejected = false; try { await openHostedWhisperStt("deepinfra", collector().cb, OPTS); } catch { rejected = true; }
  ok("no DEEPINFRA_API_KEY -> open rejects", rejected);
  process.env.DEEPINFRA_API_KEY = saved;
}

// 4) DeepInfra balance used up (HTTP 402) => permanent: this stream moves to Groq at once, later speech is transcribed by Groq, cost = both providers
{
  const c = collector();
  const calls = mock((url) => url.includes("deepinfra") ? new Response('{"detail":"insufficient balance"}', { status: 402 }) : okJson("Weiter geht es mit Groq"));
  const stt = await openFailoverStt((cb) => openHostedWhisperStt("deepinfra", cb, OPTS), (cb) => openHostedWhisperStt("groq", cb, OPTS), c.cb, "test");
  await say(stt, SPEECH_SECONDS); // fails on DeepInfra (402, ONE request — no pointless retries)
  await new Promise((r) => setTimeout(r, 50));
  ok("402: DeepInfra is called exactly once for the failed segment (no retries) and the stream is switched", calls.filter((x) => x.url.includes("deepinfra")).length === 1 && stt.failedOver === true && c.errors.length === 1 && c.errors[0].includes("[permanent]"));
  await say(stt, SPEECH_SECONDS);
  ok("402: the next utterance is transcribed by Groq", c.committed.length === 1 && c.committed[0] === "Weiter geht es mit Groq" && calls.filter((x) => x.url.includes("groq")).length === 1);
  ok("402: providerLabel 'deepinfra->groq'; costUsd = Groq's 10 s minimum (the failed DeepInfra call billed nothing)", stt.providerLabel() === "deepinfra->groq" && approx(stt.costUsd(), (10 / 3600) * 0.04), String(stt.costUsd()));
  ok("402: billing() adds both providers (only the Groq request completed)", stt.billing().requests === 1 && stt.billing().billedSeconds === 10);
  stt.close();
}

// 5) A bad key (401) is permanent too
{
  const c = collector();
  const calls = mock((url) => url.includes("deepinfra") ? new Response("unauthorized", { status: 401 }) : okJson("ok"));
  const stt = await openFailoverStt((cb) => openHostedWhisperStt("deepinfra", cb, OPTS), (cb) => openHostedWhisperStt("groq", cb, OPTS), c.cb, "test");
  await say(stt, SPEECH_SECONDS); await new Promise((r) => setTimeout(r, 50));
  ok("401: switches to the backup immediately", stt.failedOver === true && calls.filter((x) => x.url.includes("deepinfra")).length === 1);
  stt.close();
}

// 6) A momentary 5xx is retried on the SAME provider and succeeds — no failover, no error surfaced (hedging off here: its 800 ms retry backoff is longer than the test's 200 ms hedge delay)
{
  process.env.STT_HEDGE = "off";
  const c = collector();
  const calls = mock((url, n) => n === 1 ? new Response("upstream busy", { status: 503 }) : okJson("Zweiter Versuch klappt"));
  const stt = await openFailoverStt((cb) => openHostedWhisperStt("deepinfra", cb, OPTS), (cb) => openHostedWhisperStt("groq", cb, OPTS), c.cb, "test");
  await say(stt, SPEECH_SECONDS);
  ok("503 then 200: retried on DeepInfra, transcript delivered, no failover, no error", calls.length === 2 && calls.every((x) => x.url.includes("deepinfra")) && c.committed[0] === "Zweiter Versuch klappt" && !stt.failedOver && c.errors.length === 0);
  ok("503 then 200: only the successful request is billed", stt.billing().requests === 1 && stt.providerLabel() === "deepinfra");
  stt.close();
  delete process.env.STT_HEDGE;
}

// 7) Whisper hallucination on noise is still dropped on the DeepInfra path (shared cleaning)
{
  const c = collector();
  mock(() => okJson("Untertitel der Amara.org-Community"));
  const stt = await openHostedWhisperStt("deepinfra", c.cb, OPTS);
  await say(stt, SPEECH_SECONDS);
  ok("stock hallucination phrase is filtered", c.committed.length === 0);
  stt.close();
}

// 8) Cost record: provider-reported dollars REPLACE the minute-based Groq price (DeepInfra's rate differs)
{
  const base = { ttsCharacters: 0, sttMinutes: 0 };
  const viaMinutes = computeExamCost({ ...base, groqSttMinutes: 10 }).selfHostedUsd;
  const viaProvider = computeExamCost({ ...base, groqSttMinutes: 10, hostedSttUsd: 0.002 }).selfHostedUsd;
  ok("computeExamCost: hostedSttUsd replaces the Groq per-minute pricing", approx(viaMinutes, (10 / 60) * 0.04) && approx(viaProvider, 0.002));
}

// 9) Hedging (2026-10-19): a DeepInfra request that is still silent after STT_HEDGE_AFTER_MS is also sent to Groq and the first transcript wins; an outright DeepInfra failure still propagates at once
{
  const c = collector();
  const calls = mock((url) => (url.includes("deepinfra") ? new Promise((r) => setTimeout(() => r(okJson("langsam")), 1500)) : okJson("schnell")));
  const stt = await openHostedWhisperStt("deepinfra", c.cb, OPTS);
  const t0 = Date.now();
  await say(stt, SPEECH_SECONDS);
  ok("hedge: Groq answered first while DeepInfra hung", c.committed.length === 1 && c.committed[0] === "schnell" && Date.now() - t0 < 1200, `${Date.now() - t0} ms, ${JSON.stringify(c.committed)}`);
  ok("hedge: both providers were asked with the same audio", calls.some((x) => x.url.includes("api.deepinfra.com")) && calls.some((x) => x.url.includes("api.groq.com")));
  ok("hedge: only DeepInfra seconds are billed (Groq hedge is free tier)", stt.providerLabel() === "deepinfra");
  stt.close();
}
{
  const c = collector();
  const calls = mock((url) => (url.includes("deepinfra") ? okJson("direkt") : okJson("nie")));
  const stt = await openHostedWhisperStt("deepinfra", c.cb, OPTS);
  await say(stt, SPEECH_SECONDS);
  ok("hedge: a healthy DeepInfra answer never touches Groq", c.committed[0] === "direkt" && !calls.some((x) => x.url.includes("api.groq.com")));
  stt.close();
}
{
  const c = collector();
  mock((url) => (url.includes("deepinfra") ? new Response("balance", { status: 402 }) : okJson("nie")));
  const stt = await openHostedWhisperStt("deepinfra", c.cb, OPTS);
  await say(stt, SPEECH_SECONDS);
  ok("hedge: an immediate DeepInfra 402 is reported as an error (failover path unchanged)", c.errors.length >= 1 && c.committed.length === 0, JSON.stringify(c.errors).slice(0, 100));
  stt.close();
}

globalThis.fetch = realFetch;
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
