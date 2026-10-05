/**
 * SpeechDetector: a quiet speaker must count as speaking, a quiet room as silent,
 * a loud room must not turn into permanent "speech".
 * Real voices are synthesized with ElevenLabs (needs ELEVENLABS_API_KEY).
 */
import { SpeechDetector } from "./speechActivity.ts";

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };
const FRAME = 1365; // samples per browser frame at 16k

function frames(fn, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const b = Buffer.alloc(FRAME * 2);
    for (let k = 0; k < FRAME; k++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(fn(i * FRAME + k) * 32768))), k * 2);
    out.push(b.toString("base64"));
  }
  return out;
}
const noise = (rms) => (() => (Math.random() - 0.5) * 2 * rms * Math.sqrt(3));
const tone = (rms) => ((i) => Math.sin(i / 7) * rms * Math.SQRT2);
function ratio(det, fr, startMs = 0) { let n = 0; fr.forEach((f, i) => { if (det.isSpeech(f, startMs + i * 85)) n++; }); return n / fr.length; }

// synthetic signals
check(ratio(new SpeechDetector(), frames(noise(0), 100)) === 0, "digital silence is never speech");
check(ratio(new SpeechDetector(), frames(noise(0.004), 100)) === 0, "quiet room noise (RMS 0.004) is not speech");
check(ratio(new SpeechDetector(), frames(tone(0.06), 100)) === 1, "loud speech-level signal (RMS 0.06) is speech");
{
  // speech-like: bursts at a QUIET level (RMS 0.012) with lulls (RMS 0.002) — a steady tone would (rightly) be learned as hum
  const d = new SpeechDetector();
  const burst = frames(tone(0.012), 8), lull = frames(noise(0.002), 4);
  let burstHits = 0, lullHits = 0, t = 0;
  for (let rep = 0; rep < 12; rep++) {
    for (const f of burst) if (d.isSpeech(f, (t++) * 85)) burstHits++;
    for (const f of lull) if (d.isSpeech(f, (t++) * 85)) lullHits++;
  }
  check(burstHits === 96 && lullHits === 0, `QUIET speaker bursts (RMS 0.012): ${burstHits}/96 burst frames detected, ${lullHits} lull frames wrongly detected — the old fixed 0.02 gate called all of this silence`);
}
// a STEADY level is hum, not speech: learned as noise after ~5s
{
  const d = new SpeechDetector();
  ratio(d, frames(tone(0.012), 200), 0);
  check(ratio(d, frames(tone(0.012), 20), 20_000) === 0, "a perfectly steady 0.012 hum is eventually treated as noise, not as permanent speech");
}

// a noisy room raises the floor, but speech well above it still counts and the threshold never exceeds 0.02
{
  const d = new SpeechDetector();
  ratio(d, frames(noise(0.008), 200), 0);          // 17s of fan noise
  check(d.threshold() > 0.015 && d.threshold() <= 0.02, `noisy room (RMS 0.008) raises the threshold to ${d.threshold().toFixed(3)} (<= 0.02)`);
  check(ratio(d, frames(tone(0.05), 20), 20_000) === 1, "speech over that noise still counts");
}
// word tails inside the hangover must not poison the noise floor
{
  const d = new SpeechDetector();
  ratio(d, frames(tone(0.05), 20), 0);                // speech
  ratio(d, frames(tone(0.012), 10), 20 * 85);          // quiet tail right after
  check(d.threshold() <= 0.0061, "quiet word tails right after speech do not raise the threshold");
}

// real synthesized voices: loud one and the quiet one that exposed the bug
const text = "Ich möchte über eine wichtige Erfahrung in meinem Leben sprechen. Vor vier Jahren bin ich nach Deutschland gekommen, weil ich dort studieren wollte. Am Anfang war alles sehr schwierig, denn ich konnte die Sprache nicht gut und kannte niemanden.";
if (process.env.ELEVENLABS_API_KEY) {
  for (const [name, voice, minShare] of [["loud voice", "uvysWDLbKpA4XvpD3GI6", 0.9], ["QUIET voice (median RMS 0.012)", "KDqku3FJfbImX6HKQdWA", 0.9]]) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=pcm_16000`, { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }) });
    const pcm = Buffer.from(await r.arrayBuffer());
    const fr = [];
    for (let o = 0; o + FRAME * 2 <= pcm.length; o += FRAME * 2) fr.push(pcm.subarray(o, o + FRAME * 2).toString("base64"));
    // Judge the core of the clip. What the room logic needs is that detected-speech frames are never more than a
    // short gap apart while the candidate is really talking (its thresholds are 4s/5s/8s) — per-frame share is not
    // the right measure, natural pauses between phrases are legitimately silent.
    const det = new SpeechDetector();
    const flags = fr.map((f, i) => det.isSpeech(f, i * 85));
    const core = flags.slice(3, flags.length - 8);
    let gap = 0, maxGap = 0, speech = 0;
    for (const f of core) { if (f) { speech++; gap = 0; } else { gap++; maxGap = Math.max(maxGap, gap); } }
    check(maxGap * 85 < 1500, `${name}: longest run of non-speech frames inside the talking = ${maxGap * 85}ms (< 1500ms)`);
    check(speech / core.length > 0.5, `${name}: ${((speech / core.length) * 100).toFixed(0)}% of frames flagged speech (> 50%)`);
  }
} else console.log("SKIP real voices (no ELEVENLABS_API_KEY)");

console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
