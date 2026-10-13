/** Derives keywords/paraphrase/options_reasoning for the 56 already-authored
 * T1 exercises from their EXISTING explanation_correct/explanation_wrong
 * text (which already names the correct headline and the one closest
 * distractor with real, exercise-specific Arabic reasoning) plus the real
 * headline pool — no fabricated content, only restructuring/reuse of
 * already-vetted strings into the new strategy-card schema.
 *
 * Input: scratchpad JSON array of { id, title, learning_aids, headlines,
 * positions } fetched directly from the DB (see calling instructions).
 * Output: scripts/learning-aids/_t1_strategy_patch.json in the shape
 * merge-item-fields.mjs expects: { "<id>": { "<pos>": { keywords,
 * paraphrase, options_reasoning } } }
 */
import { readFileSync, writeFileSync } from "node:fs";

const SRC = process.argv[2];
if (!SRC) { console.error("usage: node derive-t1-strategy-fields.mjs <scratchpad.json>"); process.exit(1); }
const exercises = JSON.parse(readFileSync(SRC, "utf8"));

const STOPWORDS = new Set([
  "der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines",
  "und","oder","aber","auch","noch","nur","schon","sehr","als","wie","was","wo","wer",
  "in","im","an","am","auf","zu","zur","zum","mit","für","bei","um","von","vor","nach",
  "über","unter","ohne","kein","keine","keinen","nicht","mehr","ist","sind","wird","werden",
  "hat","haben","kann","können","soll","sollen","muss","müssen","sich","ihre","ihren","seine",
  "man","es","sie","er","wir","ihr","du","ich","dass","weil","wenn","so","zu","auch",
]);

function extractKeywords(headlineText) {
  const words = headlineText
    .replace(/[:.,!?–—""„"]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w.toLowerCase()));
  // longest-first as a crude salience proxy, keep original order for the top 3
  const picked = [];
  for (const w of words) { if (picked.length < 3) picked.push(w); }
  return picked.length ? picked : [headlineText.slice(0, 30)];
}

function truncate(s, max) {
  if (!s || s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}

function stripAchtung(explanationWrong) {
  return explanationWrong.replace(/^احذر:\s*العنوان\s+[A-J]\s*"[^"]*"\s*/u, "").replace(/^\s*/, (m) => m);
}

const patch = {};
let itemsProcessed = 0, itemsWithWrongOption = 0, itemsMissingCorrect = 0;

for (const ex of exercises) {
  const items = ex.learning_aids?.items ?? {};
  const headlines = ex.headlines ?? [];
  const positions = Object.fromEntries((ex.positions ?? []).map((p) => [String(p.position), p.correct_headline]));
  const headlineByLetter = Object.fromEntries(headlines.map((h) => [h.letter, h.text]));

  const exPatch = {};
  for (const [pos, item] of Object.entries(items)) {
    itemsProcessed++;
    const correctLetter = positions[pos];
    const correctText = correctLetter ? headlineByLetter[correctLetter] : null;
    if (!correctLetter || !correctText) { itemsMissingCorrect++; continue; }

    const keywords = extractKeywords(correctText);
    const paraphrase = item.evidence_text
      ? [{ question: correctText, text: truncate(item.evidence_text, 140) }]
      : [];

    const optionsReasoning = [
      { key: correctLetter, label: correctText, correct: true, reason: item.explanation_correct ?? "" },
    ];
    const wrongMatch = item.explanation_wrong?.match(/العنوان\s+([A-J])/u);
    if (wrongMatch) {
      const wrongLetter = wrongMatch[1];
      const wrongText = headlineByLetter[wrongLetter];
      if (wrongText) {
        optionsReasoning.push({
          key: wrongLetter,
          label: wrongText,
          correct: false,
          reason: stripAchtung(item.explanation_wrong),
        });
        itemsWithWrongOption++;
      }
    }

    exPatch[pos] = { keywords, paraphrase, options_reasoning: optionsReasoning };
  }
  if (Object.keys(exPatch).length) patch[ex.id] = exPatch;
}

writeFileSync(
  new URL("./_t1_strategy_patch.json", import.meta.url),
  JSON.stringify(patch),
  "utf8",
);
console.log(`exercises: ${exercises.length}, items processed: ${itemsProcessed}, with wrong-option: ${itemsWithWrongOption}, missing correct-letter: ${itemsMissingCorrect}`);
