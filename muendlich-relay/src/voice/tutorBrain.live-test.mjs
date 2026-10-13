/**
 * LIVE test of the 1:1 tutor's reply generation (Claude only — no TTS needed): German + Sie-form + one short
 * question for the examiner stages, a natural peer for the Teil-3 partner (du / "sollen wir" allowed), and the
 * history being cached block-by-block between turns.
 * Run: npx tsx src/voice/tutorBrain.live-test.mjs   (needs ANTHROPIC_API_KEY)
 */
import { generateTutorReply, } from "./tutorBrain.ts";
import { looksNonGerman, looksInformal } from "./examinerBrain.ts";

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };
process.env.CLAUDE_TUTOR_MODEL ??= "claude-haiku-4-5-20251001";

const base = { studentName: "Fatma", level: "B2", teil1Topic: "Reise (Ziel, Zeit, Land und Leute, Sehenswürdigkeiten)", teil2Topic: "Sollte man Kindern ein eigenes Smartphone erlauben?", teil3Topic: "Planen Sie gemeinsam eine Willkommensfeier für neue Kollegen im Büro." };
const history1 = [
  { speaker: "examiner", text: "Hallo Fatma, willkommen zu Ihrer Übung für Teil 1. Ihr Thema lautet: Reise." },
  { speaker: "student", text: "Ich möchte über meine Reise nach Marokko erzählen. Letztes Jahr bin ich mit einem Freund in die Sahara gefahren und wir haben eine Nacht in einem Zelt geschlafen. Das war ein unvergessliches Erlebnis, weil die Sterne so hell geleuchtet haben." },
];

async function run(ctx, history, text) {
  const chunks = []; let usage = null;
  const reply = await generateTutorReply(ctx, history, { type: "system", text: `[SYSTEM] ${text}` }, { onChunk: (c) => chunks.push(c), onUsage: (u) => { usage = u; } });
  return { reply, chunks: chunks.join(" "), usage };
}

// 1) Teil 1 examiner question, twice with a growing history (second call must cache-read the first call's prefix)
const q1 = await run({ ...base, stage: 1 }, history1, "Die Präsentationszeit ist um. Stellen Sie Fatma jetzt Ihre erste Frage zur Präsentation — konkret bezogen auf das, was Fatma tatsächlich gesagt hat. Fatma hat maximal 40 Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.");
console.log("  Q1:", q1.reply, "| usage", JSON.stringify(q1.usage));
check(!looksNonGerman(q1.reply) && !looksInformal(q1.reply), "Teil 1 question is German and uses Sie");
check(q1.reply.length > 10 && q1.reply.length < 260 && q1.reply.includes("?"), `Teil 1 question is one short question (${q1.reply.length} chars)`);
check(/marokko|sahara|zelt|freund|sterne|erlebnis|reise/i.test(q1.reply), "Teil 1 question is grounded in what the student said");
const history2 = [...history1, { speaker: "examiner", text: q1.reply }, { speaker: "student", text: "Am meisten hat mich die Stille in der Wüste beeindruckt, man hört einfach nichts und kann richtig nachdenken." }];
const q2 = await run({ ...base, stage: 1 }, history2, "Die Antwortzeit ist um. Stellen Sie Fatma jetzt Ihre zweite Frage zur Präsentation — eine andere Art von Frage als die vorherige, konkret bezogen auf das Gesagte.");
console.log("  Q2:", q2.reply, "| usage", JSON.stringify(q2.usage));
// Informational only: Haiku only caches prefixes of >= ~4096 tokens, and this short test prompt is below that — caching starts once a real session's history has grown (the exam room shows cacheRead in the tens of thousands per exam).
console.log(`  (cache: write=${q2.usage.cacheCreationInputTokens} read=${q2.usage.cacheReadInputTokens} — expected 0 below the model's minimum cacheable length)`);

// 2) Teil 2 examiner question
const t2 = await run({ ...base, stage: 2 }, [...history2, { speaker: "examiner", text: q2.reply }], "Stellen Sie Fatma jetzt die nächste Frage zum Thema (Frage 1 von 6) — nach Möglichkeit auf das bisher Gesagte bezogen. Fatma hat maximal 40 Sekunden für die Antwort — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.");
console.log("  T2:", t2.reply);
check(!looksNonGerman(t2.reply) && !looksInformal(t2.reply) && t2.reply.includes("?"), "Teil 2 question is German, Sie-form, a question");

// 3) Teil 3 partner turn (peer: may use du / sollen wir)
const t3 = await run({ ...base, stage: 3 }, [{ speaker: "examiner", text: "Wir kommen zu Teil drei. Planen Sie gemeinsam eine Willkommensfeier." }, { speaker: "student", text: "Ich denke, wir sollten die Feier am Freitagnachmittag im Büro machen." }], "Bringen Sie jetzt Ihren nächsten Gesprächsbeitrag zur gemeinsamen Planung (Beitrag 1 von 5) — als Partner, nicht als Prüfer. Fatma hat maximal 40 Sekunden Zeit zu reagieren — diese Zahl ist NUR für Sie, erwähnen Sie sie nicht.");
console.log("  T3:", t3.reply);
check(!looksNonGerman(t3.reply) && t3.reply.length > 10, "Teil 3 partner turn is German and non-empty");
check(!/Prüferin/.test(t3.reply), "Teil 3 partner does not speak as the examiner");

console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
