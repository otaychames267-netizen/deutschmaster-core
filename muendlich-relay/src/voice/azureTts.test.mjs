// Unit test (no network, fetch is mocked): the Azure TTS provider of the 1:1 tutor.   npx tsx src/voice/azureTts.test.mjs
process.env.AZURE_SPEECH_KEY = "test-key"; process.env.AZURE_SPEECH_REGION = "westeurope"; delete process.env.AZURE_HD_TEMPERATURE;
const { isAzureVoice, buildAzureSsml, escapeXml, splitSentences, openAzureConnection, startAzureSynthesis } = await import("./azureTts.ts");
const { openLiveConnection, startLiveSynthesis } = await import("./elevenLabsTts.ts");

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

// --- provider detection / SSML / sentence splitting ---
ok("Azure HD voice name is Azure", isAzureVoice("de-DE-Seraphina:DragonHDLatestNeural"));
ok("Azure neural voice name is Azure", isAzureVoice("de-DE-KatjaNeural"));
ok("ElevenLabs voice id is not Azure", !isAzureVoice("uvysWDLbKpA4XvpD3GI6") && !isAzureVoice("KDqku3FJfbImX6HKQdWA"));
ok("escapeXml", escapeXml(`a & b < c > "d" 'e'`) === "a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;");
let ssml = buildAzureSsml("de-DE-Seraphina:DragonHDLatestNeural", "Guten Tag & willkommen");
ok("HD SSML: voice, language, escaped text, temperature", ssml.includes('<voice name="de-DE-Seraphina:DragonHDLatestNeural" parameters="temperature=0.7">') && ssml.includes('xml:lang="de-DE"') && ssml.includes("Guten Tag &amp; willkommen"), ssml);
ssml = buildAzureSsml("de-DE-KatjaNeural", "Hallo");
ok("standard neural voice gets no parameters attribute", ssml === '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE"><voice name="de-DE-KatjaNeural">Hallo</voice></speak>', ssml);
process.env.AZURE_HD_TEMPERATURE = "0.4";
ok("AZURE_HD_TEMPERATURE is honoured", buildAzureSsml("de-DE-Florian:DragonHDLatestNeural", "x").includes('temperature=0.4'));
process.env.AZURE_HD_TEMPERATURE = "7";
ok("an out-of-range temperature is dropped", !buildAzureSsml("de-DE-Florian:DragonHDLatestNeural", "x").includes("parameters"));
delete process.env.AZURE_HD_TEMPERATURE;
let sp = splitSentences("Erster Satz. Zweiter Satz? Dritter ohne Ende");
ok("splitSentences keeps the unfinished tail", sp.sentences.join("|") === "Erster Satz.|Zweiter Satz?" && sp.rest === "Dritter ohne Ende", JSON.stringify(sp));
ok("splitSentences: no boundary -> nothing completed", splitSentences("Nur ein Satz ohne Punkt").sentences.length === 0);

// --- routing through the shared live switch ---
const conn = await openLiveConnection("de-DE-KatjaNeural");
ok("openLiveConnection routes an Azure voice to the Azure provider", conn.kind === "azure");

// --- streaming synthesis with a mocked fetch ---
const realFetch = globalThis.fetch;
function mockFetch(responder) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return responder(calls.length, init); }; return calls; }
function pcmStream(bytes, sizes) { // delivers `bytes` in chunks of the given (deliberately odd) sizes
  let i = 0, k = 0;
  return new ReadableStream({ pull(c) { if (i >= bytes.length) return c.close(); const n = sizes[k++ % sizes.length]; c.enqueue(bytes.subarray(i, i + n)); i += n; } });
}
const seq = (n, seed) => Uint8Array.from({ length: n }, (_, i) => (i * 7 + seed) % 256);

{
  const a = seq(1001, 1), b = seq(500, 2); // 1001 bytes = odd total on purpose (a stray last byte is dropped, never emitted half)
  let active = 0, maxActive = 0;
  const calls = mockFetch(async (n) => { active++; maxActive = Math.max(maxActive, active); await new Promise((r) => setTimeout(r, 15)); active--; return new Response(pcmStream(n === 1 ? a : b, [333, 1, 128, 7]), { status: 200 }); });
  const chunks = []; let first = 0, doneCb = 0;
  const h = startAzureSynthesis(await openAzureConnection("de-DE-Seraphina:DragonHDLatestNeural"), { onFirstAudio: () => first++, onAudioChunk: (b64) => chunks.push(Buffer.from(b64, "base64")), onDone: () => doneCb++ });
  h.appendText("Erster Satz. Zweiter ", false);
  h.appendText("Satz folgt hier!", true);
  await h.done;
  const all = Buffer.concat(chunks);
  ok("one request per sentence, in order", calls.length === 2 && calls[0].init.body.includes("Erster Satz.") && calls[1].init.body.includes("Zweiter Satz folgt hier!"), `(${calls.length} calls)`);
  ok("requests carry the key and the PCM 24 kHz format", calls[0].init.headers["Ocp-Apim-Subscription-Key"] === "test-key" && calls[0].init.headers["X-Microsoft-OutputFormat"] === "raw-24khz-16bit-mono-pcm" && calls[0].url === "https://westeurope.tts.speech.microsoft.com/cognitiveservices/v1");
  ok("sentences are synthesized one after the other, never in parallel", maxActive === 1, `(max ${maxActive})`);
  ok("every emitted chunk holds whole 16-bit samples", chunks.every((c) => c.length % 2 === 0));
  ok("audio arrives complete and in order (odd trailing byte dropped)", all.equals(Buffer.concat([Buffer.from(a.subarray(0, 1000)), Buffer.from(b)])), `(${all.length} bytes)`);
  ok("onFirstAudio once, onDone once", first === 1 && doneCb === 1);
}
{
  mockFetch(async () => new Response("denied", { status: 401 }));
  let err = null; const h = startAzureSynthesis(await openAzureConnection("de-DE-KatjaNeural"), { onVoiceError: (m) => { err = m; } });
  h.appendText("Hallo Welt.", true);
  let rejected = false; await h.done.catch(() => { rejected = true; });
  ok("an HTTP error reaches onVoiceError and rejects done", rejected && /401/.test(err ?? ""), String(err).slice(0, 80));
}
{
  mockFetch(async () => new Response(pcmStream(seq(40000, 3), [4000]), { status: 200 }));
  let n = 0; const h = startAzureSynthesis(await openAzureConnection("de-DE-KatjaNeural"), { onAudioChunk: () => { n++; if (n === 2) h.cancel(); } });
  h.appendText("Ein sehr langer Satz.", true);
  await h.done;
  const seen = n; await new Promise((r) => setTimeout(r, 40));
  ok("cancel() stops the audio and resolves done", n === seen && seen <= 3, `(${seen} chunks)`);
}
{
  mockFetch(async () => new Response(pcmStream(seq(10, 4), [10]), { status: 200 }));
  let doneCb = 0; const h = startAzureSynthesis(await openAzureConnection("de-DE-KatjaNeural"), { onDone: () => doneCb++ });
  h.appendText("", true); await h.done;
  ok("an empty reply finishes cleanly without any request", doneCb === 1);
}
globalThis.fetch = realFetch;

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
