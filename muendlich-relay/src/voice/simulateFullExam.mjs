/**
 * Runs a REALISTIC complete 3-Teil exam through the REAL, CURRENT
 * architecture: fixed-phrase-library / scripted (skip-Claude) moments
 * computed directly from examinerPhrases.ts + phraseLibrary/fixedPhrases.ts
 * (exactly what server.ts now calls — no Claude round-trip for these, see
 * muendlichVoiceSession.ts's playLibraryPhrase/speakScriptedText), PLUS
 * real Claude API calls (examinerBrain.ts's generateExaminerReply, with
 * real prompt-caching enabled) for every genuinely Claude-driven moment:
 * Teil-1 organic follow-ups, Teil-2 takeover questions, the anti-silence
 * nudge, and Teil-3 completion/moderation.
 *
 * This supersedes the previous version of this file, which routed EVERY
 * moment (including the fully scripted ones) through Claude — that measured
 * the OLD architecture, before the fixed-phrase-library work. Real numbers
 * from that older run: ~2224 chars/exam average, 100% Claude-generated.
 *
 * Measures, per exam, with REAL numbers (not estimates):
 *   - Claude input/output/cache-write/cache-read tokens (from Anthropic's
 *     own usage block, via onUsage)
 *   - Claude-generated TTS characters (organic/takeover/nudge/moderation)
 *   - Scripted TTS characters (exam_start/task_transition/section_transition
 *     — Claude-free, but still real per-exam dynamic TTS)
 *   - Fixed-library characters (welcome/exam_end) — reported separately
 *     since these cost $0 in TTS once the library is actually generated
 *     (see phraseLibrary/generateLibrary.ts — currently BLOCKED by the
 *     ElevenLabs account tier), and cost the same as "scripted" until then
 *     (muendlichVoiceSession.ts's automatic fallback).
 */
import { generateExaminerReply } from "./examinerBrain.ts";
import { pickExamStart, pickTaskTransition, pickSectionTransition12, pickSectionTransition23 } from "../examinerPhrases.ts";
import { getFixedPool } from "./phraseLibrary/fixedPhrases.ts";
import { getTeil1QuestionPool } from "./phraseLibrary/teil1Questions.ts";
import { VOICES } from "./voices.config.ts";

// NOTE: every real exam has a DIFFERENT candidate-name/topic pair, which
// means a DIFFERENT system-prompt TEXT, which means a FRESH prompt cache
// (Claude's cache key is the exact cached content) — a real exam never
// benefits from a PREVIOUS exam's cache the way three back-to-back sim runs
// with identical ctx would. baseCtx(i) varies the names/topics per
// simulated exam so each run gets its own honest cache lifecycle: one real
// cache-WRITE for its first Claude call, cache-READs for the rest of that
// same exam — exactly what production looks like.
// teil1TopicA/B use REAL topic titles matching teil1Questions.ts's
// TEIL1_TOPICS exactly (confirmed live against the real muendlich_materials
// table this session) so the simulation exercises the REAL question-library
// lookup (getTeil1QuestionPool), not just the scripted exam_start line.
function baseCtx(i) {
  return {
    personAName: `Fatma${i}`, personBName: `Youssef${i}`,
    teil1TopicA: "Reise",
    teil1TopicB: "Wichtige Erfahrung",
    teil2Topic: `Sollte man Kindern ab welchem Alter ein eigenes Smartphone erlauben? (Variante ${i})`,
    teil3Topic: `Planen Sie gemeinsam eine Willkommensfeier für neue Kollegen im Büro. (Variante ${i})`,
    level: "B2",
  };
}
const voiceId = VOICES[0].voiceId; // fixed for reproducibility across runs

const PRESENTATION_A = "Also, ich möchte über Freundschaft im digitalen Zeitalter sprechen. Meiner Meinung nach hat sich Freundschaft durch soziale Medien stark verändert. Früher hat man sich persönlich getroffen, aber heute kommunizieren viele Menschen hauptsächlich über WhatsApp oder Instagram. Ich finde das hat sowohl Vorteile als auch Nachteile. Zum Beispiel kann man mit alten Freunden aus der Schule leicht in Kontakt bleiben, auch wenn man weit weg wohnt. Aber andererseits fehlt oft die echte, persönliche Verbindung. In meinem eigenen Leben habe ich gemerkt, dass ich zwar viele Kontakte online habe, aber nur wenige echte, enge Freunde. Das war meine Präsentation, vielen Dank.";
const PRESENTATION_B = "Ich spreche heute über Homeoffice. In den letzten Jahren hat sich die Arbeitswelt stark verändert, und viele Menschen arbeiten jetzt von zu Hause aus. Ich persönlich finde das sehr praktisch, weil ich mehr Zeit mit meiner Familie verbringen kann und den Weg zur Arbeit spare. Allerdings gibt es auch Nachteile: Manchmal fällt es schwer, Arbeit und Privatleben zu trennen, und man vermisst den direkten Kontakt zu Kollegen. Insgesamt überwiegen für mich aber die Vorteile. Das wäre meine Präsentation.";

async function claudeSpeak(ctx, label, breakdown, usageTotal, history, trigger) {
  let chars = 0;
  const reply = await generateExaminerReply(ctx, history, trigger, {
    onChunk: (t) => { chars += t.length; },
    onUsage: (u) => {
      usageTotal.inputTokens += u.inputTokens;
      usageTotal.outputTokens += u.outputTokens;
      usageTotal.cacheCreationInputTokens += u.cacheCreationInputTokens;
      usageTotal.cacheReadInputTokens += u.cacheReadInputTokens;
    },
  });
  const finalChars = reply ? reply.length : 0;
  breakdown.push({ label, chars: finalChars, silent: reply === null, kind: "claude" });
  return reply;
}

function scriptedSpeak(label, breakdown, text, kind) {
  breakdown.push({ label, chars: text.length, silent: false, kind });
  return text;
}

function pickFixed(category) {
  const pool = getFixedPool(category);
  return pool[Math.floor(Math.random() * pool.length)].text;
}

function pickTeil1Question(topic) {
  const pool = getTeil1QuestionPool(topic);
  return pool[Math.floor(Math.random() * pool.length)].text;
}

async function runOneExam(examLabel, examIndex) {
  const ctx = baseCtx(examIndex);
  const PRESENTATION_A_I = PRESENTATION_A;
  const PRESENTATION_B_I = PRESENTATION_B;
  const breakdown = [];
  const usage = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 };
  const history = [];

  // --- Opening: welcome (library) + exam_start (scripted) — both skip Claude ---
  const welcome = scriptedSpeak("welcome (library)", breakdown, pickFixed("welcome"), "library");
  history.push({ speaker: "examiner", text: welcome });
  const examStart = scriptedSpeak("exam_start (scripted)", breakdown, pickExamStart({ aName: ctx.personAName, topicA: ctx.teil1TopicA }, voiceId), "scripted");
  history.push({ speaker: "examiner", text: examStart });
  // teil1_question (library, once generated -> $0; falls back to dynamic
  // scripted TTS today since the library hasn't been generated yet — see
  // muendlichVoiceSession.ts's playTeil1Question). Marked "library" here
  // since that's the intended steady-state; the separate WITHOUT-library
  // total in the summary below adds this back in as a real dynamic cost.
  const teil1QuestionA = scriptedSpeak("teil1_question A (library)", breakdown, pickTeil1Question(ctx.teil1TopicA), "library");
  history.push({ speaker: "examiner", text: teil1QuestionA });
  history.push({ speaker: "A", text: PRESENTATION_A_I });

  const followupA = await claudeSpeak(ctx, "teil1 organic followup A", breakdown, usage, history, { type: "organic", candidateSlot: "A", text: PRESENTATION_A_I.split(". ").slice(-2).join(". ") });
  if (followupA) history.push({ speaker: "examiner", text: followupA });
  history.push({ speaker: "A", text: "Ich denke, es liegt daran, dass man online oft nur oberflächlich kommuniziert." });

  const handoff = scriptedSpeak("teil1 handoff to B (scripted)", breakdown, pickTaskTransition({ bName: ctx.personBName, topicB: ctx.teil1TopicB }, voiceId), "scripted");
  history.push({ speaker: "examiner", text: handoff });
  const teil1QuestionB = scriptedSpeak("teil1_question B (library)", breakdown, pickTeil1Question(ctx.teil1TopicB), "library");
  history.push({ speaker: "examiner", text: teil1QuestionB });
  history.push({ speaker: "B", text: PRESENTATION_B_I });

  const followupB = await claudeSpeak(ctx, "teil1 organic followup B", breakdown, usage, history, { type: "organic", candidateSlot: "B", text: PRESENTATION_B_I.split(". ").slice(-2).join(". ") });
  if (followupB) history.push({ speaker: "examiner", text: followupB });
  history.push({ speaker: "B", text: "Ja, genau, das Timemanagement ist wirklich eine Herausforderung." });

  // --- Teil 1 -> 2 (scripted) ---
  const trans12 = scriptedSpeak("teil1->2 transition (scripted)", breakdown, pickSectionTransition12({ teil2Topic: ctx.teil2Topic }, voiceId), "scripted");
  history.push({ speaker: "examiner", text: trans12 });
  history.push({ speaker: "A", text: "Ich finde, Kinder sollten frühestens mit 12 Jahren ein eigenes Smartphone bekommen." });
  history.push({ speaker: "B", text: "Das sehe ich anders, ich denke 10 Jahre ist auch okay, wenn die Eltern gut aufpassen." });

  // --- Teil 2 takeover (4 alternating rounds, real Claude calls) ---
  const t2Rounds = [
    { candidate: "A", framing: "Die Zeit für das freie Gespräch der Kandidaten ist um. Übernehmen Sie jetzt aktiv die Gesprächsführung.", answer: "Ich denke, ein Smartphone kann auch sinnvoll sein, um mit den Eltern in Kontakt zu bleiben." },
    { candidate: "B", framing: "Bedanken Sie sich kurz für die Antwort und wechseln Sie dann höflich das Wort.", answer: "Ich stimme teilweise zu, aber die Kontrolle der Eltern ist auch sehr wichtig." },
    { candidate: "A", framing: "Bedanken Sie sich kurz für die Antwort und wechseln Sie dann höflich das Wort.", answer: "Ein konkretes Beispiel: Meine Nichte hat mit 11 Jahren ein Handy bekommen und es hat gut funktioniert." },
    { candidate: "B", framing: "Bedanken Sie sich kurz für die Antwort und wechseln Sie dann höflich das Wort.", answer: "Bei uns war das anders, meine Cousine hatte Probleme mit zu viel Handynutzung." },
  ];
  for (const round of t2Rounds) {
    const targetName = round.candidate === "A" ? ctx.personAName : ctx.personBName;
    const otherName = round.candidate === "A" ? ctx.personBName : ctx.personAName;
    const q = await claudeSpeak(ctx, `teil2 takeover -> ${round.candidate}`, breakdown, usage, history, { type: "system", text: `[SYSTEM] ${round.framing} Stellen Sie ${targetName} jetzt eine direkte Frage zum Thema. Wählen Sie eine andere Art von Frage als beim letzten Mal (Meinung, Grund, Beispiel, Vergleich, Reaktion auf ${otherName}s Beitrag, Gegenargument oder Konsequenz).` });
    history.push({ speaker: "examiner", text: q });
    history.push({ speaker: round.candidate, text: round.answer });
  }

  // --- Teil 2 -> 3 (scripted) ---
  const trans23 = scriptedSpeak("teil2->3 transition (scripted)", breakdown, pickSectionTransition23({ teil3Topic: ctx.teil3Topic }, voiceId), "scripted");
  history.push({ speaker: "examiner", text: trans23 });
  history.push({ speaker: "A", text: "Wir könnten die Feier am Freitagnachmittag im Büro machen." });
  history.push({ speaker: "B", text: "Gute Idee, sollen wir auch Essen bestellen?" });
  history.push({ speaker: "A", text: "Ja, vielleicht Pizza, das mögen die meisten." });

  const nudge = await claudeSpeak(ctx, "teil3 anti-silence nudge", breakdown, usage, history, { type: "system", text: `[SYSTEM] Es herrscht seit mehreren Sekunden absolute Stille. ${ctx.personBName} hat davon am längsten nichts mehr gesagt (seit etwa 6 Sekunden) — beziehen Sie ${ctx.personBName} bevorzugt aktiv mit ein, gegründet auf den bisherigen Gesprächsverlauf. Stellen Sie eine konkrete, auf die Planung bezogene Frage; treffen Sie die Entscheidung nicht selbst.` });
  history.push({ speaker: "examiner", text: nudge });
  history.push({ speaker: "B", text: "Ich denke, wir sollten auch an Getränke denken." });

  const completion = await claudeSpeak(ctx, "teil3 completion signal", breakdown, usage, history, { type: "system", text: `[SYSTEM] Die geplante freie Planungszeit nähert sich dem Ende. Werden Sie ab jetzt aktiver als Moderatorin: Identifizieren Sie noch offene Planungspunkte und stellen Sie gezielte Fragen, damit die Kandidaten zu einer konkreten gemeinsamen Entscheidung kommen.` });
  history.push({ speaker: "examiner", text: completion });
  history.push({ speaker: "A", text: "Wir haben uns für Pizza und Getränke entschieden, das sollte reichen." });

  const moderation2 = await claudeSpeak(ctx, "teil3 moderation follow-up", breakdown, usage, history, { type: "system", text: `[SYSTEM] Fragen Sie gezielt nach einem noch offenen Punkt der Planung, z. B. Uhrzeit oder wer die Bestellung übernimmt — sprechen Sie nur, wenn wirklich noch etwas offen ist, sonst schließen Sie freundlich ab.` });
  history.push({ speaker: "examiner", text: moderation2 });

  // --- exam_end (library) ---
  const examEnd = scriptedSpeak("exam_end (library)", breakdown, pickFixed("exam_end"), "library");
  history.push({ speaker: "examiner", text: examEnd });

  const libraryChars = breakdown.filter((b) => b.kind === "library").reduce((a, b) => a + b.chars, 0);
  const scriptedChars = breakdown.filter((b) => b.kind === "scripted").reduce((a, b) => a + b.chars, 0);
  const claudeChars = breakdown.filter((b) => b.kind === "claude").reduce((a, b) => a + b.chars, 0);
  const totalTtsCharsWithLibrary = scriptedChars + claudeChars; // library phrases cost $0 TTS once generated
  const totalTtsCharsWithoutLibrary = scriptedChars + claudeChars + libraryChars; // fallback path (today, until generation unblocks)

  console.log(`\n=== ${examLabel} ===`);
  for (const b of breakdown) console.log(`  ${b.silent ? "(silent)" : `${b.chars.toString().padStart(4)} chars`}  [${b.kind.padEnd(8)}]  ${b.label}`);
  console.log(`  library=${libraryChars} scripted=${scriptedChars} claude=${claudeChars} chars`);
  console.log(`  Claude tokens: input=${usage.inputTokens} output=${usage.outputTokens} cacheWrite=${usage.cacheCreationInputTokens} cacheRead=${usage.cacheReadInputTokens}`);

  return { libraryChars, scriptedChars, claudeChars, totalTtsCharsWithLibrary, totalTtsCharsWithoutLibrary, usage };
}

async function main() {
  const results = [];
  const n = Number(process.env.SIMULATE_EXAM_RUNS ?? 3);
  for (let i = 1; i <= n; i++) results.push(await runOneExam(`Exam ${i}`, i));

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const withLib = results.map((r) => r.totalTtsCharsWithLibrary);
  const withoutLib = results.map((r) => r.totalTtsCharsWithoutLibrary);
  const inputTok = results.map((r) => r.usage.inputTokens);
  const outputTok = results.map((r) => r.usage.outputTokens);
  const cacheWriteTok = results.map((r) => r.usage.cacheCreationInputTokens);
  const cacheReadTok = results.map((r) => r.usage.cacheReadInputTokens);

  console.log(`\n=== SUMMARY (${results.length} complete simulated exams, real Claude API calls) ===`);
  console.log(`TTS chars WITH library generated (real target state): ${withLib.join(", ")} — avg ${avg(withLib).toFixed(0)}`);
  console.log(`TTS chars WITHOUT library (today's fallback, blocked account): ${withoutLib.join(", ")} — avg ${avg(withoutLib).toFixed(0)}`);
  console.log(`Claude input tokens/exam: ${inputTok.join(", ")} — avg ${avg(inputTok).toFixed(0)}`);
  console.log(`Claude output tokens/exam: ${outputTok.join(", ")} — avg ${avg(outputTok).toFixed(0)}`);
  console.log(`Claude cache-WRITE tokens/exam: ${cacheWriteTok.join(", ")} — avg ${avg(cacheWriteTok).toFixed(0)}`);
  console.log(`Claude cache-READ tokens/exam: ${cacheReadTok.join(", ")} — avg ${avg(cacheReadTok).toFixed(0)}`);
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
