// Unit test (no network): the shared sentence engine of the HTTP TTS providers — early first clause, ordered prefetch, errors, cancel.   npx tsx src/voice/sentenceTts.test.mjs
const { startSentenceSynthesis, splitSentences, splitEarlyClause } = await import("./sentenceTts.ts");
delete process.env.TTS_EARLY_CLAUSE_MIN_CHARS;

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seq = (n, seed) => Buffer.from(Uint8Array.from({ length: n }, (_, i) => (i * 7 + seed) % 256));
const feed = (h, text, step = 6) => { for (let i = 0; i < text.length; i += step) h.appendText(text.slice(i, i + step), false); h.appendText("", true); };

// --- helpers ---
ok("splitSentences: complete sentences + the pending tail", JSON.stringify(splitSentences("Erster Satz. Zweiter Satz! Dritter")) === JSON.stringify({ sentences: ["Erster Satz.", "Zweiter Satz!"], rest: "Dritter" }));
ok("splitEarlyClause: cuts after the first comma that follows >= 35 chars", splitEarlyClause("Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben, und", 35)?.first === "Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben,", String(splitEarlyClause("Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben, und", 35)?.first));
ok("splitEarlyClause: nothing before the minimum length / without a boundary / when disabled", splitEarlyClause("Kurz, ja ", 35) === null && splitEarlyClause("Ein ganz langer Satz ohne jedes Satzzeichen und ohne Pause ", 35) === null && splitEarlyClause("Fatma, Sie haben erwähnt, dass Sie die Gerichte probiert haben, und", 0) === null);

// Fake provider: records the requests; each piece answers after its own delay with its own PCM, in 2 awkward chunks.
function provider(delays, opts = {}) {
  const calls = [], inFlight = { now: 0, max: 0 };
  const speak = async (text, signal, emit) => {
    const i = calls.length; calls.push(text);
    inFlight.now++; inFlight.max = Math.max(inFlight.max, inFlight.now);
    try {
      await sleep(delays[i] ?? 20);
      if (signal.aborted) return;
      if (opts.failAt === i) throw new Error(`HTTP 500 on piece ${i}`);
      const pcm = seq(1001 + i, i); // odd length on purpose: samples must stay whole across chunk borders
      emit(pcm.subarray(0, 333)); await sleep(5); emit(pcm.subarray(333));
    } finally { inFlight.now--; }
  };
  return { speak, calls, inFlight };
}

// --- early first clause ---
{
  const p = provider([30, 30, 30]); const chunks = [];
  const h = startSentenceSynthesis(p.speak, { onAudioChunk: (b) => chunks.push(Buffer.from(b, "base64")) });
  feed(h, "Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben, welche Speisen sind Ihnen besonders in Erinnerung geblieben?");
  await h.done;
  ok("the first request is the first clause, the rest of the sentence is the second request", p.calls.length === 2 && /^Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben,$/.test(p.calls[0]) && /^welche Speisen sind Ihnen besonders in Erinnerung geblieben\?$/.test(p.calls[1]), JSON.stringify(p.calls));
  ok("no text is lost or duplicated by the split", (p.calls.join(" ") === "Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben, welche Speisen sind Ihnen besonders in Erinnerung geblieben?"));
}
{
  process.env.TTS_EARLY_CLAUSE_MIN_CHARS = "0";
  const p = provider([30]);
  const h = startSentenceSynthesis(p.speak, {}); feed(h, "Fatma, Sie haben erwähnt, dass Sie die traditionellen Gerichte probiert haben, welche Speisen sind Ihnen besonders in Erinnerung geblieben?");
  await h.done; delete process.env.TTS_EARLY_CLAUSE_MIN_CHARS;
  ok("TTS_EARLY_CLAUSE_MIN_CHARS=0 switches the early split off (one request per sentence)", p.calls.length === 1);
}
{
  const p = provider([30]); const h = startSentenceSynthesis(p.speak, {});
  feed(h, "Danke, das war klar. Und wie war das bei Ihnen früher zu Hause bei der Familie, im Alltag?");
  await h.done;
  ok("a sentence that is already complete is never split at a comma afterwards (only the very first piece may be cut early)", p.calls.length === 2 && p.calls[0] === "Danke, das war klar.", JSON.stringify(p.calls));
}

// --- ordered prefetch ---
{
  const p = provider([300, 20]); // the 2nd piece answers long before the 1st
  const chunks = []; let first = 0, doneCb = 0;
  const h = startSentenceSynthesis(p.speak, { onFirstAudio: () => first++, onAudioChunk: (b) => chunks.push(Buffer.from(b, "base64")), onDone: () => doneCb++ }, { maxParallel: 2 });
  h.appendText("Erster Satz. Zweiter ", false); h.appendText("Satz kommt hier!", true);
  await h.done;
  const all = Buffer.concat(chunks);
  const expect = Buffer.concat([seq(1001, 0).subarray(0, 1000), seq(1002, 1).subarray(0, 1000)]);
  ok("two requests ran at the same time (prefetch)", p.inFlight.max === 2, `(max in flight ${p.inFlight.max})`);
  ok("the audio is still emitted strictly in order although the 2nd piece finished first", all.subarray(0, 1000).equals(expect.subarray(0, 1000)) && all.length >= 2000 && all.subarray(1000, 1000 + 999).equals(seq(1002, 1).subarray(0, 999)), `(${all.length} bytes)`);
  ok("every emitted chunk holds whole 16-bit samples", chunks.every((c) => c.length % 2 === 0));
  ok("onFirstAudio once, onDone once", first === 1 && doneCb === 1);
}
{
  const p = provider([20, 20, 20, 20]); const h = startSentenceSynthesis(p.speak, {}, { maxParallel: 2 });
  feed(h, "Eins ist hier. Zwei ist hier. Drei ist hier. Vier ist hier.");
  await h.done;
  ok("at most 2 requests in flight, all 4 sentences spoken in order", p.inFlight.max <= 2 && p.calls.join("|") === "Eins ist hier.|Zwei ist hier.|Drei ist hier.|Vier ist hier.", `(max ${p.inFlight.max})`);
}

// the default is strictly sequential (Azure / Inworld keep it)
{
  const p = provider([20, 20]); const h = startSentenceSynthesis(p.speak, {}); feed(h, "Erster Satz hier. Zweiter Satz hier."); await h.done;
  ok("the default is one request at a time", p.inFlight.max === 1 && p.calls.length === 2, `(max ${p.inFlight.max})`);
}

// --- errors ---
{
  const p = provider([20, 20], { failAt: 1 }); const chunks = []; let err = null;
  const h = startSentenceSynthesis(p.speak, { onAudioChunk: (b) => chunks.push(b), onVoiceError: (m) => { err = (err ?? "") + m; } }, { maxParallel: 2 });
  feed(h, "Erster Satz hier. Zweiter Satz hier.");
  let rejected = false; await h.done.catch(() => { rejected = true; });
  ok("an error in the 2nd piece is reported once and rejects done, the 1st piece's audio was still played", rejected && /piece 1/.test(err ?? "") && chunks.length > 0, String(err).slice(0, 60));
}

// --- cancel ---
{
  const p = provider([200, 200]); const chunks = [];
  const h = startSentenceSynthesis(p.speak, { onAudioChunk: (b) => chunks.push(b) }, { maxParallel: 2 });
  h.appendText("Erster Satz hier. Zweiter Satz hier.", true);
  await sleep(40); h.cancel(); await h.done; await sleep(400);
  ok("cancel() stops all audio and resolves done", chunks.length === 0);
}
{
  const h = startSentenceSynthesis(async () => {}, {}); let doneCb = 0;
  const h2 = startSentenceSynthesis(async () => {}, { onDone: () => doneCb++ }); h2.appendText("", true); await h2.done;
  ok("an empty reply finishes cleanly without any request", doneCb === 1); void h;
}

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
