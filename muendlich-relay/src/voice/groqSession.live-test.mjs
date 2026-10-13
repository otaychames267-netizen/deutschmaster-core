/**
 * SESSION-level live test of the Groq STT path: the real openMuendlichVoiceSession
 * (real VoiceManager, real silence gate, real Claude examiner, real ElevenLabs
 * TTS) with MUENDLICH_STT_BACKEND=groq, fed REAL synthesized German speech as
 * candidate A. Verifies the thing that matters for the exam:
 *   - A's speech reaches the transcript attributed to slot A (and not B)
 *   - getSpokenChars(A) > 0 (so server.ts treats the turn as "has content")
 *   - sendSystemMessage() fired IMMEDIATELY after the last audio still sees the
 *     full transcript (flush() before the Claude call) -> the examiner's
 *     question is grounded in what was actually said
 *   - usage is billed to the Groq bucket, not ElevenLabs STT
 *
 * Run: npx tsx src/voice/groqSession.live-test.mjs
 */
process.env.MUENDLICH_STT_BACKEND = "groq";
process.env.CLAUDE_EXAMINER_MODEL ??= "claude-haiku-4-5-20251001";
const { openMuendlichVoiceSession } = await import("./muendlichVoiceSession.ts");

let failed = 0;
const ok = (msg, cond) => { console.log(`${cond ? "PASS" : "FAIL"} — ${msg}`); if (!cond) failed++; };

const ctx = {
  personAName: "Fatma", personBName: "Youssef",
  teil1TopicA: "Reisen", teil1TopicB: "Homeoffice",
  teil2Topic: "Smartphones für Kinder", teil3Topic: "Willkommensfeier planen", level: "B2",
};

const PRESENTATION = "Mein Thema ist Reisen. Letzten Sommer bin ich mit meiner Schwester nach Portugal gefahren. Wir haben in Lissabon eine kleine Wohnung gemietet und jeden Tag die Stadt mit der Straßenbahn erkundet. Am besten hat mir der Ausflug nach Sintra gefallen, weil dort die alten Schlösser so beeindruckend sind. Reisen ist für mich wichtig, weil man dabei andere Kulturen kennenlernt.";

async function synth(text) {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/uvysWDLbKpA4XvpD3GI6?output_format=pcm_16000", {
    method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: "de" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const inputs = [];
const outputs = [];
const errors = [];
let opened = false;
const session = await openMuendlichVoiceSession(ctx, `groq-session-test-${Date.now()}`, {
  onOpen: () => { opened = true; },
  onInputTranscript: (text, slot) => inputs.push({ text, slot, at: Date.now() }),
  onOutputTranscript: (text) => outputs.push(text),
  onError: (m) => errors.push(m),
});
await new Promise((r) => setTimeout(r, 300));
ok("session opened", opened);

const pcm = await synth(PRESENTATION);
console.log(`candidate A speech: ${(pcm.length / 32000).toFixed(1)}s`);
const frame = 3200; // 100ms
const tStart = Date.now();
for (let o = 0; o < pcm.length; o += frame) {
  session.sendAudioChunk("A", pcm.subarray(o, o + frame).toString("base64"));
  await new Promise((r) => setTimeout(r, 100)); // real-time pacing, like a live mic
}
// room "B" stays silent; a little trailing silence like a real pause
const silent = Buffer.alloc(frame).toString("base64");
for (let i = 0; i < 4; i++) { session.sendAudioChunk("A", silent); session.sendAudioChunk("B", silent); await new Promise((r) => setTimeout(r, 100)); }

// The exam fires the question trigger the moment the 90s timer ends — NOT
// after waiting for STT. This is the race flush() exists for.
const spokenAtTrigger = session.getSpokenChars("A");
console.log(`spokenChars(A) at trigger time (before flush): ${spokenAtTrigger}`);
session.sendSystemMessage(`Die Präsentationszeit ist um. Stellen Sie ${ctx.personAName} jetzt Ihre erste Frage zur Präsentation — konkret bezogen auf das, was ${ctx.personAName} tatsächlich gesagt hat. ${ctx.personAName} hat maximal 30 Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.`);
await new Promise((r) => setTimeout(r, 12_000)); // Claude + TTS

const aText = inputs.filter((i) => i.slot === "A").map((i) => i.text).join(" ");
const bText = inputs.filter((i) => i.slot === "B").map((i) => i.text).join(" ");
console.log("transcript A:", aText);
console.log("transcript B:", JSON.stringify(bText));
console.log("examiner question:", outputs[outputs.length - 1]);

ok("no relay errors", errors.length === 0);
ok("A's speech transcribed and attributed to slot A", /portugal/i.test(aText) && /lissabon/i.test(aText) && /sintra/i.test(aText));
ok("nothing attributed to silent slot B", bText.trim() === "");
ok("getSpokenChars(A) > 0 after the turn", session.getSpokenChars("A") > 100);
ok("examiner question exists", outputs.length > 0);
const q = outputs[outputs.length - 1] ?? "";
ok("examiner's question is grounded in what A actually said (mentions Portugal/Lissabon/Sintra/Schwester/Straßenbahn/Schlösser/Kulturen)", /portugal|lissabon|sintra|schwester|straßenbahn|schl(ö|oe)sser|kultur/i.test(q));
const u = session.getUsage();
console.log("usage:", JSON.stringify({ sttMinutes: u.sttMinutes, groqSttMinutes: u.groqSttMinutes, ttsCharacters: u.ttsCharacters }));
ok("STT billed to the Groq bucket, not ElevenLabs", u.groqSttMinutes > 0 && u.sttMinutes === 0);

session.close();
console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
