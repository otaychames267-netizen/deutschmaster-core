// usage: cd muendlich-relay && npx tsx src/tutorCost.harness.mjs <claude-model-id>   (costs ~4-5 US cents of Claude per run)
// Real-Claude cost harness for the 1:1 tutor (2/6/7 questions): runs the REAL tutorBrain prompts + generateTutorReply (real API, real caching),
// with scripted student answers; TTS characters are counted from the real replies (ElevenLabs credits are 0, so no audio is synthesized).
import { readFileSync } from "node:fs";
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
const MODEL = process.argv[2];
process.env.CLAUDE_TUTOR_MODEL = MODEL; process.env.CLAUDE_TUTOR_FALLBACK_MODEL = MODEL;
const { generateTutorReply } = await import("./voice/tutorBrain.ts");
const PRICE = /haiku/.test(MODEL) ? { in: 1, out: 5 } : { in: 2, out: 10 }; // USD per million tokens (claude-api skill table)
const name = "Amira";
let ctx = { studentName: name, level: "B2", teil1Topic: "Reise (Ziel, Zeit, Land und Leute, Sehenswürdigkeiten)", stage: 1, counts: { teil1: 2, teil2: 6, teil3: 7 } };
const history = [];
const welcome = `Hallo ${name}, willkommen zu Ihrer Übung für Teil 1 der mündlichen Prüfung. Ihr Thema lautet: ${ctx.teil1Topic}. Sie haben etwa anderthalb Minuten Zeit — bitte beginnen Sie, wenn Sie bereit sind.`;
history.push({ speaker: "examiner", text: welcome });
history.push({ speaker: "student", text: "Ich möchte über meine letzte Reise nach Spanien sprechen. Wir sind im Sommer zwei Wochen nach Barcelona gefahren, weil meine Schwester dort studiert. Die Stadt hat mir sehr gut gefallen, besonders die Architektur und das Essen. Außerdem habe ich viele nette Menschen kennengelernt, und ich konnte mein Spanisch ein bisschen verbessern. Die Reise war allerdings ziemlich teuer, aber ich finde, dass sich das gelohnt hat, weil man auf Reisen viel über andere Kulturen lernt." });
const answers = [
  "Das Wetter war meistens sehr schön, aber an zwei Tagen hat es stark geregnet. Da sind wir ins Museum gegangen, was auch interessant war.",
  "Ich würde das Land auf jeden Fall noch einmal besuchen, vielleicht im Herbst, weil es dann nicht so heiß und nicht so voll ist.",
  "Ich glaube, dass Kinder heute zu früh ein Handy bekommen. Mit zehn Jahren brauchen sie es noch nicht, weil sie lieber draußen spielen sollten.",
  "Ein Grund ist, dass Eltern erreichbar sein möchten. Das verstehe ich, aber ein einfaches Telefon würde dafür völlig reichen.",
  "Zum Beispiel hat meine Nichte schon mit acht Jahren stundenlang Videos geschaut und kaum noch mit anderen Kindern gesprochen.",
  "Ein Verbot finde ich schwierig, denn Jugendliche finden immer einen Weg. Besser wären klare Regeln zu Hause und in der Schule.",
  "Die Schule könnte Medienkunde anbieten, damit die Kinder lernen, mit dem Internet verantwortungsvoll umzugehen.",
  "Langfristig sehe ich die Gefahr, dass die Konzentration sinkt und dass echte Freundschaften seltener werden.",
  "Ich finde, wir sollten zuerst das Ziel festlegen. Wie wäre es mit einem Ausflug in die Berge, weil das nicht so teuer ist?",
  "Gut, dann machen wir zwei Tage Wanderung. Wer kümmert sich um die Unterkunft? Ich könnte im Internet nach einer Jugendherberge suchen.",
  "Das Essen können wir gemeinsam planen. Jeder bringt etwas mit, dann sparen wir Geld und haben mehr Spaß.",
  "Für das Programm schlage ich eine Tageswanderung und einen Spieleabend vor. Was meinst du dazu?",
  "Die Kosten sollten wir gleichmäßig aufteilen. Ich rechne mit etwa fünfzig Euro pro Person für Fahrt und Übernachtung.",
  "Einverstanden, dann treffen wir uns am Samstag um acht Uhr am Bahnhof und ich schicke allen noch eine Nachricht.",
  "Perfekt, damit ist alles geklärt. Ich freue mich schon auf den Ausflug mit euch.",
];
const topic2 = "Kinder und Handys: Ab welchem Alter sollten Kinder ein eigenes Handy haben? Vor- und Nachteile, Regeln, Verantwortung von Eltern und Schule.";
const topic3 = "Gemeinsame Planung: Ein Wochenendausflug mit Freunden — Ziel, Unterkunft, Essen, Programm, Kosten, Treffpunkt.";
const ordinal = ["erste", "zweite"];
let totalIn = 0, totalOut = 0, cw = 0, cr = 0, replyChars = 0, calls = 0; const perTurn = [];
async function turn(trigger) {
  let text = ""; let u = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
  const reply = await generateTutorReply(ctx, history, { type: "system", text: `[SYSTEM] ${trigger}` }, { onChunk: (t) => { text += t; }, onUsage: (x) => { u = x; } });
  const final = (reply || text).trim();
  calls++; totalIn += u.inputTokens; totalOut += u.outputTokens; cw += u.cacheCreationInputTokens; cr += u.cacheReadInputTokens; replyChars += final.length; perTurn.push(final.length);
  history.push({ speaker: ctx.stage === 3 ? "partner" : "examiner", text: final });
  return final;
}
let ai = 0; const next = () => history.push({ speaker: "student", text: answers[ai++] });
for (let q = 1; q <= 2; q++) { await turn(`${q === 1 ? "Die Präsentationszeit ist um." : "Die Antwortzeit ist um."} Stellen Sie ${name} jetzt Ihre ${ordinal[q - 1]}${q === 2 ? " und letzte" : ""} Frage zur Präsentation — konkret bezogen auf das, was ${name} tatsächlich gesagt hat. ${name} hat maximal 40 Sekunden für die Antwort.`); next(); }
ctx = { ...ctx, stage: 2, teil2Topic: topic2 };
for (let q = 1; q <= 6; q++) { await turn(`Stellen Sie ${name} jetzt die nächste Frage zum Thema (Frage ${q} von 6) — eine andere Art von Frage als zuletzt. ${name} hat maximal 40 Sekunden für die Antwort.`); next(); }
ctx = { ...ctx, stage: 3, teil3Topic: topic3 };
for (let t = 1; t <= 7; t++) { await turn(`Bringen Sie jetzt Ihren nächsten Gesprächsbeitrag zur gemeinsamen Planung (Beitrag ${t} von 7) — als Partner, nicht als Prüfer. ${name} hat maximal 40 Sekunden Zeit zu reagieren.`); if (ai < answers.length) next(); }
const claudeUsd = (totalIn * PRICE.in + cw * PRICE.in * 1.25 + cr * PRICE.in * 0.1 + totalOut * PRICE.out) / 1e6;
const liveChars = welcome.length + replyChars + 130; // + ~130 chars of live "rest" after the two cached transition lead-ins
console.log(JSON.stringify({ model: MODEL, calls, tokens: { uncachedIn: totalIn, cacheWrite: cw, cacheRead: cr, out: totalOut }, claudeUsd: +claudeUsd.toFixed(4), replyChars, avgReplyChars: Math.round(replyChars / calls), minMax: [Math.min(...perTurn), Math.max(...perTurn)], liveTtsChars: liveChars, sample: history.filter((h) => h.speaker !== "student").slice(1, 4).map((h) => h.text) }, null, 1));
if (process.env.HARNESS_OUT) { const { writeFileSync } = await import("node:fs"); writeFileSync(process.env.HARNESS_OUT, JSON.stringify({ welcome, replies: history.filter((h) => h.speaker !== "student").slice(1).map((h) => h.text) })); }
process.exit(0);
