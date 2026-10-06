// Unit test (no network): 1:1 tutor — "did not understand" detection + the solo-safe subset of the 2:1 transition / ending phrases.
//   npx tsx src/tutorSolo.test.mjs
import { asksForSimplerQuestion } from "./tutorSimplify.ts";
import { pickSoloSectionTransition12Line, pickSoloSectionTransition23Line, getSoloExamEndPool, isReadableForOneCandidate } from "./examinerPhrases.ts";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const yes = [
  "Ich habe die Frage nicht verstanden.", "Entschuldigung, ich habe das nicht verstanden", "Wie bitte?", "Können Sie die Frage bitte wiederholen?",
  "Können Sie das noch einmal sagen?", "Bitte einfacher.", "Ich verstehe nicht.", "Entschuldigung, ich verstehe das nicht", "Was meinen Sie damit?",
  "Können Sie das anders erklären?", "Die Frage verstehe ich nicht", "Ich habe nicht verstanden.", "Noch einmal bitte, ich habe die Frage leider nicht ganz verstanden",
];
const longAnswer = "Ich habe die Frage verstanden, aber ich muss kurz nachdenken, weil das Thema sehr groß ist und ich viele Gedanken dazu habe, die ich ordnen möchte, bevor ich antworte, denn ich habe die Frage nicht verstanden gehabt, als sie anfangs gestellt wurde, aber jetzt ist alles klar.";
const no = [
  "Ich verstehe nicht, warum Kinder so früh ein Handy brauchen, und das finde ich nicht gut für ihre Entwicklung.",
  "Ich finde, dass man das nicht verbieten sollte.", "Ich habe meinen Freund nicht verstanden, als er mir von seinem Urlaub in Spanien erzählt hat.",
  "Das ist ein wichtiges Thema, weil viele Menschen heute im Internet arbeiten und lernen.", "", "   ", longAnswer,
];
for (const t of yes) ok(`asks for simpler question: "${t.slice(0, 50)}"`, asksForSimplerQuestion(t) === true);
for (const t of no) ok(`normal answer, NOT a request: "${t.slice(0, 50)}"`, asksForSimplerQuestion(t) === false);

// solo-safe subset of the 2:1 phrases
const voices = ["voiceA-formal", "voiceB-warm", "voiceC-calm"];
const BAD = /\b(beide|beiden|miteinander)\b|zwischen Ihnen|Präsentationen|Sie beide/i;
let draws = 0, bad12 = 0, bad23 = 0, badEnd = 0, gem12 = 0;
for (let i = 0; i < 300; i++) {
  const v = voices[i % 3];
  const l12 = pickSoloSectionTransition12Line({ teil2Topic: "Kinder und Handys" }, v), l23 = pickSoloSectionTransition23Line({ teil3Topic: "eine Klassenfahrt" }, v);
  draws++;
  if (BAD.test(l12.full)) bad12++;
  if (/\bgemeinsam\w*/i.test(l12.full)) gem12++;
  if (BAD.test(l23.full)) bad23++;
  if (!l12.full.includes("Kinder und Handys") || !l23.full.includes("eine Klassenfahrt")) { failed++; console.log("FAIL  topic missing in", l12.full, l23.full); }
}
ok(`${draws} Teil1→2 draws: none mentions two people or "gemeinsam"`, bad12 === 0 && gem12 === 0);
ok(`${draws} Teil2→3 draws: none mentions two people`, bad23 === 0);
const pool = getSoloExamEndPool();
for (const p of pool) if (BAD.test(p.text)) badEnd++;
const styles = new Set(pool.map((p) => p.style));
ok(`solo exam_end pool: ${pool.length} lines, all three styles present, none mentions two people`, pool.length >= 12 && styles.size === 3 && badEnd === 0, [...styles].join("/"));
ok("a 2:1-only line is rejected", isReadableForOneCandidate("Das haben Sie beide schön gemacht, vielen Dank.", "end") === false);
ok("a neutral line is accepted", isReadableForOneCandidate("Damit ist die heutige Prüfung abgeschlossen. Auf Wiedersehen.", "end") === true);
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
