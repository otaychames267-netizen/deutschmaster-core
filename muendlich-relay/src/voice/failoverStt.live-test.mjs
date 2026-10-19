/**
 * LIVE test of the Groq -> ElevenLabs STT failover (failoverStt.ts).
 * Forces a permanent Groq failure with an invalid key (401), streams real
 * synthesized German speech, and verifies the stream switches to ElevenLabs
 * realtime STT and keeps transcribing — no exam silently left without a
 * transcript. Also checks the healthy path does NOT fail over.
 *
 * Run: npx tsx src/voice/failoverStt.live-test.mjs
 */
import { openFailoverStt } from "./failoverStt.ts";
import { openGroqStt } from "./groqStt.ts";
import { openRealtimeStt } from "./elevenLabsStt.ts";

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synth(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/uvysWDLbKpA4XvpD3GI6?output_format=pcm_16000", {
    method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function stream(stt, pcm) {
  const frame = 3200;
  for (let o = 0; o < pcm.length; o += frame) { stt.sendPcm16(pcm.subarray(o, o + frame).toString("base64")); await sleep(100); }
}
const silentB64 = Buffer.alloc(3200).toString("base64");
async function silence(stt, ms) { for (let t = 0; t < ms; t += 100) { stt.sendPcm16(silentB64); await sleep(100); } }

const REAL_GROQ_KEY = process.env.GROQ_API_KEY;
const speech1 = await synth("Ich möchte heute über meinen Urlaub in Italien sprechen, weil das eine schöne Erinnerung für mich ist.");
const speech2 = await synth("Wir sind mit dem Zug nach Rom gefahren und haben dort drei Tage lang die Stadt besichtigt.");

// --- 1) broken primary -> must fail over and keep transcribing -------------
process.env.GROQ_API_KEY = "gsk_invalid_key_for_failover_test";
const commits1 = [], errors1 = [];
const s1 = await openFailoverStt(openGroqStt, openRealtimeStt, { onCommitted: (t) => commits1.push(t), onError: (m) => errors1.push(m) }, "test-broken");
await stream(s1, speech1);           // goes to Groq, fails with 401 after the debounce -> permanent -> failover
await silence(s1, 1500);
await sleep(2500);                   // let the 401 + fallback WebSocket open settle
check(s1.failedOver === true, "invalid Groq key -> stream failed over to the fallback");
check(errors1.some((m) => m.includes("[permanent]")), "failure was classified permanent (immediate switch, no slow retries)");
await stream(s1, speech2);           // now goes to ElevenLabs
await silence(s1, 2500);             // VAD commit
await sleep(2500);
console.log("   fallback transcripts:", JSON.stringify(commits1));
check(commits1.some((t) => /rom|zug|drei tage|stadt/i.test(t)), "after failover the second utterance was transcribed by the fallback");
s1.close();

// --- 2) healthy primary -> must NOT fail over ------------------------------
process.env.GROQ_API_KEY = REAL_GROQ_KEY;
const commits2 = [];
const s2 = await openFailoverStt(openGroqStt, openRealtimeStt, { onCommitted: (t) => commits2.push(t), onError: () => {} }, "test-healthy");
await stream(s2, speech2);
await silence(s2, 1000);
await s2.flush();
console.log("   healthy-path transcripts:", JSON.stringify(commits2));
check(s2.failedOver === false, "healthy Groq -> no failover");
check(commits2.some((t) => /rom|zug|drei tage|stadt/i.test(t)), "healthy path transcribed via Groq");
s2.close();

await sleep(500);
console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
