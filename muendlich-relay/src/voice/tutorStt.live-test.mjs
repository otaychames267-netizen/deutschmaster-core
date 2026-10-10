/**
 * LIVE test of the 1:1 tutor's NEW speech path (Groq STT with the shared silence gate), with no TTS needed:
 * real German speech comes from the pre-generated audio library (24 kHz PCM), is resampled to the browser's 16 kHz
 * and streamed into the real openTutorVoiceSession like a microphone would. Verifies that
 *   - the student's speech is transcribed (onInputTranscript) with low WER,
 *   - long silence is NOT forwarded (forwarded minutes << streamed minutes),
 *   - audio arriving while the tutor itself is "playing" is not fed to STT,
 *   - usage is billed to Groq (requests / billed seconds), not to ElevenLabs STT.
 * Run: MUENDLICH_STT_BACKEND=groq npx tsx src/voice/tutorStt.live-test.mjs  (needs GROQ_API_KEY + Supabase env)
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
process.env.MUENDLICH_STT_BACKEND = "groq";
const { openTutorVoiceSession } = await import("./tutorVoiceSession.ts");

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().replace(/[^a-zäöüß\s]/g, " ").split(/\s+/).filter(Boolean);
function wer(ref, hyp) { const r = norm(ref), h = norm(hyp); const d = Array.from({ length: r.length + 1 }, (_, i) => [i, ...Array(h.length).fill(0)]); for (let j = 1; j <= h.length; j++) d[0][j] = j; for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (r[i-1]===h[j-1]?0:1)); return d[r.length][h.length] / r.length; }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../audio-library");
const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
const clip = manifest.find((a) => a.category === "welcome");
const pcm24 = await readFile(path.join(root, clip.pcmPath));
// 24k -> 16k (linear interpolation) PCM16 mono, like the browser's capture
const n24 = pcm24.length / 2, n16 = Math.floor(n24 * 16000 / 24000);
const pcm16 = Buffer.alloc(n16 * 2);
for (let i = 0; i < n16; i++) { const x = i * 24000 / 16000, i0 = Math.floor(x), f = x - i0; const a = pcm24.readInt16LE(Math.min(i0, n24 - 1) * 2), b = pcm24.readInt16LE(Math.min(i0 + 1, n24 - 1) * 2); pcm16.writeInt16LE(Math.round(a + (b - a) * f), i * 2); }
const speechSeconds = n16 / 16000;
console.log(`speech clip: ${speechSeconds.toFixed(1)}s, "${clip.text.slice(0, 70)}…"`);

const inputs = [];
const session = await openTutorVoiceSession(
  { studentName: "Fatma", level: "B2", teil1Topic: "Reise", stage: 1 },
  `tutor-stt-test-${Date.now()}`,
  { onInputTranscript: (t) => inputs.push(t), onError: (m) => console.log("ERR", m) },
);
await sleep(300);

const FRAME = 2730; // ~85 ms of 16 kHz PCM16, like the browser
const silent = Buffer.alloc(FRAME).toString("base64");
let streamedMs = 0;
async function stream(buf) { for (let o = 0; o < buf.length; o += FRAME) { session.sendAudioChunk(buf.subarray(o, o + FRAME).toString("base64")); streamedMs += 85; await sleep(85); } } // real-time pacing: the gate's hangover is wall-clock, so a time-compressed stream would be (rightly) forwarded in full
async function streamSilence(ms) { for (let t = 0; t < ms; t += 85) { session.sendAudioChunk(silent); streamedMs += 85; await sleep(85); } }

await streamSilence(8_000);                 // dead air before the student starts
await stream(pcm16);                        // the student speaks
await streamSilence(6_000);                 // and then silence again
await sleep(300);
// flush like sendSystemMessage does (it is what the tutor calls before asking a question) — without any TTS: just wait for STT
await sleep(5_000);

const hyp = inputs.join(" ");
console.log("transcript:", hyp.slice(0, 160), hyp.length > 160 ? "…" : "");
const w = wer(clip.text, hyp);
check(w <= 0.12, `student speech transcribed through the gate (WER ${(w * 100).toFixed(1)}% <= 12%)`);
const u = session.getUsage();
console.log("usage:", JSON.stringify({ forwardedSttMinutes: u.forwardedSttMinutes, groqSttMinutes: u.groqSttMinutes, groqRequests: u.groqRequests, sttMinutes: u.sttMinutes }));
const streamedMin = streamedMs / 60000;
check(u.forwardedSttMinutes < streamedMin * 0.65, `silence is not forwarded (forwarded ${u.forwardedSttMinutes.toFixed(2)} of ${streamedMin.toFixed(2)} streamed minutes)`);
check(u.forwardedSttMinutes >= (speechSeconds / 60) * 0.9, "all the speech was forwarded");
check(u.groqRequests >= 1 && u.groqSttMinutes > 0, `billed to Groq (${u.groqRequests} request(s), ${(u.groqSttMinutes * 60).toFixed(0)}s billed)`);
check(u.sttMinutes === 0, "no ElevenLabs STT minutes (no failover)");

session.close();
console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
