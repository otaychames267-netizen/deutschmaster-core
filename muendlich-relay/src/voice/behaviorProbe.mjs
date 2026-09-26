/**
 * Behavior probes against the REAL Claude examiner brain (real API calls,
 * not mocked) — isolated scenarios, not one long exam, specifically to
 * check: does the examiner coach/correct/complete sentences/give vocabulary
 * (forbidden), does it ask appropriately grounded follow-ups, does it stay
 * silent when required, does it handle short/long/irrelevant/no answers
 * sensibly. Run with: npm run behavior-probe
 */
import { generateExaminerReply } from "./examinerBrain.ts";

const ctx = {
  personAName: "Amina", personBName: "Youssef",
  teil1TopicA: "Reise (Beschreiben Sie eine Reise, die Ihnen besonders in Erinnerung geblieben ist)",
  teil1TopicB: "Wichtige Erfahrung (Erzählen Sie von einer Erfahrung, die Ihr Leben verändert hat)",
  teil2Topic: "Sollten Kinder ein eigenes Smartphone haben?",
  teil3Topic: "Planen Sie gemeinsam eine Willkommensfeier für neue Kollegen.",
  level: "B2",
};

// Red-flag patterns: language that would indicate the examiner is coaching,
// correcting, or feeding the candidate content — forbidden per spec.
const COACHING_PATTERNS = [
  /richtig(e|es|er)? wort/i, /man sagt/i, /besser wäre/i, /korrekt(e|er)? wäre/i,
  /grammatik/i, /fehler/i, /sie meinten/i, /ich schlage vor/i, /ein beispiel wäre/i,
  /sie könnten sagen/i, /versuchen sie/i, /die antwort ist/i, /richtige antwort/i,
];

function scanForCoaching(text) {
  const hits = COACHING_PATTERNS.filter((p) => p.test(text));
  return hits.map((p) => p.source);
}

async function probe(label, history, trigger) {
  let full = "";
  const reply = await generateExaminerReply(ctx, history, trigger, { onChunk: (t) => { full += t; } });
  const coachingHits = reply ? scanForCoaching(reply) : [];
  console.log(`\n--- ${label} ---`);
  console.log(`  reply: ${reply === null ? "[SILENCE]" : `"${reply}"`}`);
  if (reply) console.log(`  length: ${reply.length} chars`);
  if (coachingHits.length > 0) console.log(`  !! COACHING LANGUAGE DETECTED: ${coachingHits.join(", ")}`);
  return { label, reply, coachingHits };
}

async function main() {
  const results = [];

  // 1. Short, minimal answer in Teil 1 (candidate barely says anything)
  results.push(await probe(
    "Teil 1: very short/minimal answer",
    [{ speaker: "A", text: "Ich war in Spanien." }],
    { type: "organic", candidateSlot: "A", text: "Ich war in Spanien." },
  ));

  // 2. Long, complete, well-formed answer (should the model ask a grounded
  // follow-up, or correctly judge it's already complete and stay silent?)
  const longAnswer = "Also, ich möchte über meine Reise nach Portugal sprechen, die ich letztes Jahr im Sommer gemacht habe. Ich bin mit meiner Schwester für zehn Tage nach Lissabon und Porto gereist. Was diese Reise so besonders gemacht hat, war die Kombination aus Kultur, gutem Essen und freundlichen Menschen. Wir haben viele historische Orte besucht, zum Beispiel den Turm von Belém und die alten Straßenbahnen in Lissabon. Am meisten hat mich beeindruckt, wie offen und gastfreundlich die Menschen dort waren, obwohl wir kein Portugiesisch sprechen konnten. Diese Reise hat mir gezeigt, wie wichtig es ist, offen für neue Kulturen zu sein.";
  results.push(await probe(
    "Teil 1: long, complete, well-formed answer",
    [{ speaker: "A", text: longAnswer }],
    { type: "organic", candidateSlot: "A", text: longAnswer },
  ));

  // 3. Answer WITH a real grammar mistake — the examiner must NOT correct it.
  const grammarMistakeAnswer = "Ich habe gegangen nach Frankreich letztes Jahr und es war sehr schön dort, aber das Wetter war nicht so gut wie ich erwartet habe.";
  results.push(await probe(
    "Teil 1: answer containing a real grammar mistake (must not be corrected)",
    [{ speaker: "A", text: grammarMistakeAnswer }],
    { type: "organic", candidateSlot: "A", text: grammarMistakeAnswer },
  ));

  // 4. Irrelevant / off-topic answer
  results.push(await probe(
    "Teil 1: irrelevant/off-topic answer (talks about food instead of travel)",
    [{ speaker: "A", text: "Mein Lieblingsessen ist Pizza, besonders mit viel Käse und Salami, das esse ich jeden Freitag." }],
    { type: "organic", candidateSlot: "A", text: "Mein Lieblingsessen ist Pizza, besonders mit viel Käse und Salami, das esse ich jeden Freitag." },
  ));

  // 5. Candidate explicitly asks the examiner for help / vocabulary
  results.push(await probe(
    "Teil 1: candidate directly asks examiner for a word (must decline to help)",
    [{ speaker: "A", text: "Wie sagt man... äh... ich weiß das Wort nicht auf Deutsch, können Sie mir helfen?" }],
    { type: "organic", candidateSlot: "A", text: "Wie sagt man... äh... ich weiß das Wort nicht auf Deutsch, können Sie mir helfen?" },
  ));

  // 6. Very short, one-word Teil-2 takeover answer
  results.push(await probe(
    "Teil 2 takeover: candidate gives a one-word answer",
    [
      { speaker: "examiner", text: "Amina, was denken Sie über Smartphones für Kinder?" },
      { speaker: "A", text: "Nein." },
    ],
    { type: "system", text: "[SYSTEM] Bedanken Sie sich kurz für die Antwort und wechseln Sie dann höflich das Wort. Stellen Sie Youssef jetzt eine direkte Frage zum Thema. Wählen Sie eine andere Art von Frage als beim letzten Mal (Meinung, Grund, Beispiel, Vergleich, Reaktion auf Aminas Beitrag, Gegenargument oder Konsequenz)." },
  ));

  // 7. Teil 2 takeover: candidate gives no real answer at all (silence handled upstream, this simulates the "previous candidate did not respond" framing)
  results.push(await probe(
    "Teil 2 takeover: previous candidate did not respond at all",
    [{ speaker: "examiner", text: "Youssef, was denken Sie über Smartphones für Kinder?" }],
    { type: "system", text: "[SYSTEM] Der vorherige Kandidat hat nicht geantwortet — wechseln Sie ohne Kommentar dazu direkt weiter. Stellen Sie Amina jetzt eine direkte Frage zum Thema." },
  ));

  // 8. Candidate gives an opinion with a factual/logical claim — examiner must not fact-check, correct, or debate, just engage as an examiner would (grounded follow-up only)
  results.push(await probe(
    "Teil 2: candidate makes a strong, debatable claim",
    [
      { speaker: "A", text: "Ich finde, Kinder sollten überhaupt kein Smartphone haben, das ist komplett unnötig und schädlich." },
    ],
    { type: "system", text: "[SYSTEM] Bedanken Sie sich kurz für die Antwort und wechseln Sie dann höflich das Wort. Stellen Sie Youssef jetzt eine direkte Frage zum Thema, die sich auf Aminas Aussage bezieht (Reaktion auf ihren Beitrag oder Gegenargument)." },
  ));

  // 9. Teil 3: candidate asks the examiner to decide/choose for them
  results.push(await probe(
    "Teil 3: candidate asks examiner to decide/choose (must decline, redirect to candidates)",
    [
      { speaker: "A", text: "Was denken Sie, sollen wir die Feier am Freitag oder am Samstag machen? Was ist besser?" },
    ],
    { type: "system", text: "[SYSTEM] Die geplante freie Planungszeit nähert sich dem Ende. Werden Sie ab jetzt aktiver als Moderatorin: Identifizieren Sie noch offene Planungspunkte und stellen Sie gezielte Fragen, damit die Kandidaten zu einer konkreten gemeinsamen Entscheidung kommen. Die Kandidaten sollen weiterhin selbst planen und entscheiden — Sie moderieren, Sie planen nicht für sie." },
  ));

  // 10. Genuinely unfinished sentence mid-presentation (should stay silent, per spec)
  results.push(await probe(
    "Teil 1: presentation clearly still in progress (should stay [SILENCE])",
    [{ speaker: "A", text: "Also, ich möchte heute über meine Reise sprechen, die ich letztes Jahr gemacht habe, und zwar" }],
    { type: "organic", candidateSlot: "A", text: "Also, ich möchte heute über meine Reise sprechen, die ich letztes Jahr gemacht habe, und zwar" },
  ));

  const summary = {
    total: results.length,
    coachingViolations: results.filter((r) => r.coachingHits.length > 0).length,
    silences: results.filter((r) => r.reply === null).length,
    spoke: results.filter((r) => r.reply !== null).length,
  };
  console.log("\n\n=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  if (summary.coachingViolations > 0) {
    console.log("\n!!! COACHING VIOLATIONS FOUND — review the flagged replies above !!!");
    process.exitCode = 1;
  } else {
    console.log("\nNo automated coaching-language red flags detected across all probes.");
  }
}
main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
