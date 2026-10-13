/** Derives keywords/paraphrase/options_reasoning for T2 (3-option MC) from
 * the EXISTING explanation_correct/explanation_wrong text (already names
 * the correct option and the one closest distractor with real,
 * exercise-specific Arabic reasoning) plus the real option_a/b/c pool.
 * No fabricated content — restructuring/reuse only.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
if (!SRC) { console.error("usage: node derive-t2-strategy-fields.mjs <scratchpad.json>"); process.exit(1); }
const exercises = JSON.parse(readFileSync(SRC, "utf8"));

const STOPWORDS = new Set([
  "der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines",
  "und","oder","aber","auch","noch","nur","schon","sehr","als","wie","was","wo","wer",
  "in","im","an","am","auf","zu","zur","zum","mit","für","bei","um","von","vor","nach",
  "über","unter","ohne","kein","keine","keinen","nicht","mehr","ist","sind","wird","werden",
  "hat","haben","kann","können","soll","sollen","muss","müssen","sich","ihre","ihren","seine",
  "man","es","sie","er","wir","ihr","du","ich","dass","weil","wenn","so","werden",
]);

function extractKeywords(text) {
  const words = (text ?? "")
    .replace(/[:.,!?–—""„"]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w.toLowerCase()));
  const picked = [];
  for (const w of words) { if (picked.length < 3) picked.push(w); }
  return picked.length ? picked : [(text ?? "").slice(0, 30)];
}

function truncate(s, max) {
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}

function stripAchtung(explanationWrong) {
  return explanationWrong.replace(/^احذر:\s*الخيار\s*\([abc]\)\s*"[^"]*"\s*/u, "");
}

const patch = {};
let itemsProcessed = 0, itemsWithWrongOption = 0;

for (const ex of exercises) {
  const items = ex.learning_aids?.items ?? {};
  const questionsByNum = Object.fromEntries((ex.questions ?? []).map((q) => [String(q.number), q]));

  const exPatch = {};
  for (const [num, item] of Object.entries(items)) {
    itemsProcessed++;
    const q = questionsByNum[num];
    if (!q || !q.correct) continue;

    const optionText = { a: q.option_a, b: q.option_b, c: q.option_c };
    const correctLetter = q.correct;
    const correctText = optionText[correctLetter];

    const keywords = extractKeywords(q.question);
    const paraphrase = item.evidence_text
      ? [{ question: q.question, text: truncate(item.evidence_text, 140) }]
      : [];

    const optionsReasoning = [
      { key: correctLetter, label: correctText, correct: true, reason: item.explanation_correct ?? "" },
    ];
    const wrongMatch = item.explanation_wrong?.match(/الخيار\s*\(([abc])\)/u);
    if (wrongMatch) {
      const wrongLetter = wrongMatch[1];
      const wrongText = optionText[wrongLetter];
      if (wrongText && wrongLetter !== correctLetter) {
        optionsReasoning.push({
          key: wrongLetter,
          label: wrongText,
          correct: false,
          reason: stripAchtung(item.explanation_wrong),
        });
        itemsWithWrongOption++;
      }
    }

    exPatch[num] = { keywords, paraphrase, options_reasoning: optionsReasoning };
  }
  if (Object.keys(exPatch).length) patch[ex.id] = exPatch;
}

writeFileSync(new URL("./_t2_strategy_patch.json", import.meta.url), JSON.stringify(patch), "utf8");
console.log(`exercises: ${exercises.length}, items processed: ${itemsProcessed}, with wrong-option: ${itemsWithWrongOption}`);
