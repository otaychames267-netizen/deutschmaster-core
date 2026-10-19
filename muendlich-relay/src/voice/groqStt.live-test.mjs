/**
 * LIVE test of the Groq STT adapter (groqStt.ts) against the real Groq API,
 * using real synthesized German speech (ElevenLabs Flash, a few cents).
 * Checks: (1) candidate grammar errors survive VERBATIM, (2) accuracy vs the
 * reference text, (3) commit latency after the last audio frame, (4) long
 * continuous speech is cut into ordered segments, (5) silence / room noise
 * produces NO transcript (Whisper's classic hallucination), (6) flush().
 *
 * Run: npx tsx src/voice/groqStt.live-test.mjs   (needs GROQ_API_KEY, ELEVENLABS_API_KEY)
 */
import { openGroqStt } from "./groqStt.ts";

const VOICE_ID = "uvysWDLbKpA4XvpD3GI6";
const SAMPLE_RATE = 16_000;

async function synth(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=pcm_16000`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

const norm = (s) => s.toLowerCase().replace(/[^a-zäöüß\s]/g, " ").split(/\s+/).filter(Boolean);
function wer(ref, hyp) {
  const r = norm(ref), h = norm(hyp);
  const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]);
  for (let j = 1; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / r.length;
}

/** Streams PCM to a fresh Groq STT session in 100ms frames (fast-forwarded: no
 * real-time pacing — the client only cares about inter-frame gaps for its
 * debounce, so we pace the trailing silence in real time instead). */
async function run(pcm, { trailingSilenceMs = 1500 } = {}) {
  const commits = [];
  const errors = [];
  let lastFrameAt = 0;
  const stt = await openGroqStt({
    onCommitted: (text) => commits.push({ text, latencyMs: Date.now() - lastFrameAt }),
    onError: (m) => errors.push(m),
  });
  const frame = SAMPLE_RATE * 2 * 0.1;
  for (let o = 0; o < pcm.length; o += frame) {
    stt.sendPcm16(pcm.subarray(o, o + frame).toString("base64"));
    lastFrameAt = Date.now();
    await new Promise((r) => setTimeout(r, 5));
  }
  await new Promise((r) => setTimeout(r, trailingSilenceMs));
  await stt.flush?.();
  stt.close();
  return { commits, errors };
}

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };

// 1+2+3: short utterance with deliberate grammar errors
const errText = "Ich habe gestern zu Kino gegangen, weil mein Freund haben Geburtstag. Wir haben viel gelacht und nachher sind wir in ein Restaurant gegessen.";
const pcm1 = await synth(errText);
console.log(`\n[1] error-laden utterance, ${(pcm1.length / 2 / SAMPLE_RATE).toFixed(1)}s audio`);
const r1 = await run(pcm1);
const t1 = r1.commits.map((c) => c.text).join(" ");
console.log("    ref:", errText, "\n    hyp:", t1, "\n    latency after last frame:", r1.commits.map((c) => c.latencyMs + "ms").join(", "));
check(r1.errors.length === 0, `no STT errors (${r1.errors.join("; ")})`);
check(/zu kino gegangen/i.test(t1), "error 'zu Kino gegangen' preserved verbatim (not auto-corrected to 'ins Kino')");
check(/freund haben/i.test(t1), "error 'mein Freund haben' preserved verbatim");
check(/in ein restaurant gegessen/i.test(t1), "error 'in ein Restaurant gegessen' preserved verbatim");
const w1 = wer(errText, t1);
check(w1 <= 0.1, `WER vs reference = ${(w1 * 100).toFixed(1)}% (<=10%)`);

// 4: long continuous speech (~30s) -> several ordered segments
const longText = "Heute möchte ich über das Thema Homeoffice sprechen. Viele Menschen arbeiten seit einigen Jahren von zu Hause aus, weil das viele Vorteile hat. Man spart zum Beispiel Zeit und Geld, weil man nicht jeden Tag ins Büro fahren muss. Außerdem kann man seinen Tag freier planen und mehr Zeit mit der Familie verbringen. Aber es gibt auch Nachteile. Manche Kollegen fühlen sich einsam, und es ist schwierig, Arbeit und Privatleben zu trennen. Meiner Meinung nach ist eine Mischung aus beiden Modellen die beste Lösung.";
const pcm2 = await synth(longText);
console.log(`\n[2] long continuous speech, ${(pcm2.length / 2 / SAMPLE_RATE).toFixed(1)}s audio`);
const r2 = await run(pcm2);
const t2 = r2.commits.map((c) => c.text).join(" ");
console.log(`    segments: ${r2.commits.length}, latency per segment: ${r2.commits.map((c) => c.latencyMs + "ms").join(", ")}\n    hyp:`, t2);
check(r2.errors.length === 0, `no STT errors (${r2.errors.join("; ")})`);
check(r2.commits.length >= 2, `long speech cut into ${r2.commits.length} segments (>=2)`);
const w2 = wer(longText, t2);
check(w2 <= 0.1, `WER vs reference = ${(w2 * 100).toFixed(1)}% (<=10%)`);
check(norm(t2).slice(0, 6).join(" ") === norm(longText).slice(0, 6).join(" "), "segments delivered in order (starts with the first sentence)");

// 5: silence and low room noise must not produce any transcript
const silence = Buffer.alloc(SAMPLE_RATE * 2 * 6, 0);
const noise = Buffer.alloc(SAMPLE_RATE * 2 * 6);
for (let i = 0; i < noise.length; i += 2) noise.writeInt16LE(Math.round((Math.random() - 0.5) * 600), i);
for (const [name, buf] of [["digital silence", silence], ["low room noise", noise]]) {
  const r = await run(buf, { trailingSilenceMs: 800 });
  console.log(`\n[3] ${name}: commits=${JSON.stringify(r.commits.map((c) => c.text))} errors=${JSON.stringify(r.errors)}`);
  check(r.commits.length === 0 && r.errors.length === 0, `${name} -> no transcript, no error`);
}

// 6: flush() resolves only after the transcript has been delivered
{
  const got = [];
  const stt = await openGroqStt({ onCommitted: (t) => got.push(t), onError: () => {} });
  const clip = pcm1.subarray(0, SAMPLE_RATE * 2 * 4);
  const frame = SAMPLE_RATE * 2 * 0.1;
  for (let o = 0; o < clip.length; o += frame) stt.sendPcm16(clip.subarray(o, o + frame).toString("base64"));
  await stt.flush();
  console.log(`\n[4] flush(): transcript present immediately after await -> ${JSON.stringify(got)}`);
  check(got.length === 1 && got[0].length > 5, "flush() returned only after the transcript arrived");
  stt.close();
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
