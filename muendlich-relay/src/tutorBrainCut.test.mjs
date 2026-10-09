// Unit test (no network): hard reply-length control of the 1:1 tutor — sentence detection + when a streamed reply counts as complete.
//   npx tsx src/tutorBrainCut.test.mjs
import { endsSentence, replyIsComplete } from "./voice/tutorBrain.ts";

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

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
