// Unit test (no network): hard reply-length control of the 1:1 tutor — sentence detection + when a streamed reply counts as complete.
//   npx tsx src/tutorBrainCut.test.mjs
import { endsSentence, replyIsComplete, selectHistoryForStage, PARTNER_SOFT_CAP_CHARS } from "./voice/tutorBrain.ts";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

// endsSentence
ok("question mark ends", endsSentence("Warum hat Sie der Museumsbesuch so beeindruckt?"));
ok("exclamation ends", endsSentence("Das ist eine gute Idee!"));
ok("period after a real word ends", endsSentence("Ich finde, wir sollten zuerst das Budget klären."));
ok("period after quote ends", endsSentence("Er nennt es „Heimat“."));
ok("comma chunk does not end", !endsSentence("Warum hat Sie der Museumsbesuch so beeindruckt,"));
ok("'z.' is an abbreviation", !endsSentence("Was halten Sie von Angeboten wie z."));
ok("'B.' is an abbreviation", !endsSentence("Welche Vorteile sehen Sie, z. B."));
ok("'bzw.' is an abbreviation", !endsSentence("Wie oft nutzen Sie das Auto bzw."));
ok("'Dr.' is an abbreviation", !endsSentence("Haben Sie schon einmal mit Dr."));
ok("ordinal '2.' is not a sentence end", !endsSentence("Was war am 2."));
ok("plain text without punctuation does not end", !endsSentence("Warum hat Sie der Museumsbesuch so beeindruckt"));

// replyIsComplete — examiner (Teil 1/2): exactly one sentence
ok("examiner: first sentence completes the reply", replyIsComplete(false, 1, "Was hat Sie am Museumsbesuch am meisten überrascht?"));
ok("examiner: a comma chunk does not complete it", !replyIsComplete(false, 0, "Was hat Sie am Museumsbesuch am meisten überrascht,"));
ok("examiner: a statement sentence also completes it", replyIsComplete(false, 1, "Erzählen Sie mir mehr über Ihre Reise."));

// replyIsComplete — partner (Teil 3): up to two sentences, stops at the first question
ok("partner: first statement does not complete it", !replyIsComplete(true, 1, "Ich finde, wir sollten zuerst das Budget klären."));
ok("partner: the question completes it", replyIsComplete(true, 2, "Wollen wir lieber im Park oder im Restaurant feiern?"));
ok("partner: a question as the FIRST sentence completes it", replyIsComplete(true, 1, "Was meinen Sie zum Budget?"));
ok("partner: two statements complete it", replyIsComplete(true, 2, "Das Wetter spielt auch eine Rolle."));

// partner soft cap (owner 2026-10-11, cost): once ~150 characters have been spoken, the end of the current sentence ends the reply
ok("partner: a long statement completes the reply once the soft cap is reached", replyIsComplete(true, 1, "Ich finde, wir sollten die Altstadt am Vormittag besichtigen und danach in Ruhe gemeinsam zu Mittag essen.", PARTNER_SOFT_CAP_CHARS));
ok("partner: a short statement below the soft cap does not", !replyIsComplete(true, 1, "Ich finde, wir sollten zuerst das Budget klären.", 49));
ok("partner: the soft cap never cuts mid-sentence", !replyIsComplete(true, 1, "Ich finde, wir sollten die Altstadt am Vormittag besichtigen und danach", PARTNER_SOFT_CAP_CHARS + 30));
ok("examiner: the char count is irrelevant (one sentence rule)", replyIsComplete(false, 1, "Was hat Sie überrascht?", 0));

// selectHistoryForStage (owner 2026-10-11, cost): a call only sees the turns of its own Teil, newest first within a character budget
const H = [
  { stage: 1, speaker: "examiner", text: "Opening Teil 1" }, { stage: 1, speaker: "student", text: "Presentation ".repeat(50) },
  { stage: 2, speaker: "examiner", text: "Frage 1 Teil 2" }, { stage: 2, speaker: "student", text: "Antwort 1" },
  { stage: 3, speaker: "partner", text: "Partner 1" }, { stage: 3, speaker: "student", text: "Student 3" },
  { speaker: "student", text: "untagged line" },
];
ok("stage 1 sees only Teil 1 (+ untagged)", selectHistoryForStage(H, 1, 99999).map((h) => h.text.slice(0, 8)).join("|") === "Opening |Presenta|untagged");
ok("stage 2 sees only Teil 2 (+ untagged), not the presentation", selectHistoryForStage(H, 2, 99999).length === 3 && !selectHistoryForStage(H, 2, 99999).some((h) => h.text.startsWith("Presentation")));
ok("stage 3 sees only Teil 3 (+ untagged)", selectHistoryForStage(H, 3, 99999).map((h) => h.text).join("|") === "Partner 1|Student 3|untagged line");
ok("the character budget keeps the NEWEST turns", selectHistoryForStage(H, 1, 40).map((h) => h.text).join("|") === "untagged line");
ok("at least one turn is always kept", selectHistoryForStage([{ stage: 1, speaker: "student", text: "x".repeat(5000) }], 1, 10).length === 1);
ok("an empty history stays empty", selectHistoryForStage([], 2, 7000).length === 0);

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
