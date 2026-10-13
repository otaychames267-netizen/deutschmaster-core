// Unit test (no network, fetch is mocked): automatic TTS failover DeepInfra -> ElevenLabs.   npx tsx src/voice/ttsFailover.test.mjs
process.env.DEEPINFRA_API_KEY = "test-key"; process.env.ELEVENLABS_API_KEY = "el-key"; delete process.env.TTS_FAILOVER;
const { startDeepInfraSynthesis, openDeepInfraConnection } = await import("./deepinfraTts.ts");
const { holdMsFor, fallbackVoiceFor, breakerOpen, resetTtsFailover, getTtsFailoverStats, failoverEnabled } = await import("./ttsFailover.ts");

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const seq = (n, seed) => Buffer.from(Uint8Array.from({ length: n }, (_, i) => (i * 5 + seed) % 256));
const realFetch = globalThis.fetch;
function mock(responder) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return responder(String(url), calls.length); }; return calls; }
const stream = (buf) => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(buf)); c.close(); } }), { status: 200 });
async function speak(voice, text) {
  const chunks = []; let err = null;
  const h = startDeepInfraSynthesis(await openDeepInfraConnection(voice), { onAudioChunk: (b) => chunks.push(Buffer.from(b, "base64")), onVoiceError: (m) => { err = m; } });
  h.appendText(text, true); await h.done.catch(() => {}); return { audio: Buffer.concat(chunks), err };
}

ok("holds: 402/401/403 = 120 s, 5xx/network = 30 s, 429 = 10 s, 400/422 = no failover", holdMsFor(402) === 120_000 && holdMsFor(401) === 120_000 && holdMsFor(503) === 30_000 && holdMsFor(null) === 30_000 && holdMsFor(429) === 10_000 && holdMsFor(400) === 0 && holdMsFor(422) === 0);
ok("voice mapping: examiner woman / man, partner woman / man are 4 different ElevenLabs voices",
  new Set([fallbackVoiceFor("deepinfra:nadine-unknown"), fallbackVoiceFor("deepinfra:w5ansswgujjbb7qv07tz"), fallbackVoiceFor("deepinfra:s3qzkzydhp8y3i98htdu"), fallbackVoiceFor("deepinfra:spgick8i0cclmwonohad")]).size === 4);
ok("known male partner -> male partner voice, known female examiner -> female examiner voice", fallbackVoiceFor("deepinfra:spgick8i0cclmwonohad") === "IWm8DnJ4NGjFI7QAM5lM" && fallbackVoiceFor("deepinfra:21cphao8nfi9jkina0g0") === "uvysWDLbKpA4XvpD3GI6");

// 1) DeepInfra balance at 0 (402) -> the sentence is spoken by ElevenLabs, the breaker opens
{
  resetTtsFailover();
  const pcm = seq(480, 3);
  const calls = mock((url) => url.includes("deepinfra") ? new Response('{"detail":{"error":"You need positive balance"}}', { status: 402 }) : stream(pcm));
  const r = await speak("deepinfra:w5ansswgujjbb7qv07tz", "Guten Tag, willkommen zur Prüfung.");
  const el = calls.find((c) => c.url.includes("elevenlabs"));
  ok("402 -> audio comes from ElevenLabs (streaming PCM 24k, german, flash model, male examiner voice)", r.audio.length >= 478 && !r.err && !!el && el.url.includes("/v1/text-to-speech/KDqku3FJfbImX6HKQdWA/stream?output_format=pcm_24000") && JSON.parse(el.init.body).model_id === "eleven_flash_v2_5" && JSON.parse(el.init.body).language_code === "de");
  ok("the breaker is open and the stats say why", breakerOpen() && getTtsFailoverStats().trips === 1 && /402/.test(getTtsFailoverStats().lastReason) && getTtsFailoverStats().failoverSentences === 1);
  const before = calls.filter((c) => c.url.includes("deepinfra")).length;
  const r2 = await speak("deepinfra:w5ansswgujjbb7qv07tz", "Nächster Satz.");
  ok("while the breaker is open DeepInfra is NOT called again (no wasted round trip per sentence)", calls.filter((c) => c.url.includes("deepinfra")).length === before && r2.audio.length >= 478);
}
// 2) both providers down -> DeepInfra is still tried, then the original error surfaces (no silent failure)
{
  resetTtsFailover();
  const calls = mock(() => new Response("nope", { status: 402 }));
  const r = await speak("deepinfra:abc", "Hallo zusammen.");
  ok("both down -> an error is reported (onVoiceError), not silence", !!r.err && r.audio.length === 0 && calls.some((c) => c.url.includes("deepinfra")) && calls.some((c) => c.url.includes("elevenlabs")));
}
// 3) HTTP 400 (our text is bad) must NOT fail over / trip the breaker
{
  resetTtsFailover();
  const calls = mock(() => new Response("bad input", { status: 400 }));
  const r = await speak("deepinfra:abc", "Hallo.");
  ok("400 -> no failover, no breaker, error surfaces", !!r.err && !breakerOpen() && !calls.some((c) => c.url.includes("elevenlabs")));
}
// 4) healthy DeepInfra -> ElevenLabs never touched
{
  resetTtsFailover();
  const calls = mock(() => stream(seq(300, 1)));
  const r = await speak("deepinfra:abc", "Alles gut.");
  ok("healthy DeepInfra -> no ElevenLabs call, breaker closed", r.audio.length >= 298 && !calls.some((c) => c.url.includes("elevenlabs")) && !breakerOpen());
}
// 5) network error -> failover
{
  resetTtsFailover();
  const pcm = seq(200, 9);
  mock((url) => { if (url.includes("deepinfra")) throw new TypeError("fetch failed"); return stream(pcm); });
  const r = await speak("deepinfra:abc", "Netzwerkfehler Test.");
  ok("network error -> ElevenLabs", r.audio.length >= 198 && !r.err && breakerOpen());
}
// 6) switch off
{
  resetTtsFailover(); process.env.TTS_FAILOVER = "off";
  const calls = mock(() => new Response("nope", { status: 402 }));
  const r = await speak("deepinfra:abc", "Aus.");
  ok("TTS_FAILOVER=off -> old behaviour (error, no ElevenLabs call)", !!r.err && !calls.some((c) => c.url.includes("elevenlabs")) && !failoverEnabled());
  delete process.env.TTS_FAILOVER;
}
globalThis.fetch = realFetch;
if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); } else console.log("\nall passed");
