import { readFileSync, writeFileSync } from "node:fs";
import { TRANSLATIONS } from "./t1-translations-map.mjs";

const SRC = process.argv[2];
const exercises = JSON.parse(readFileSync(SRC, "utf8"));

const patch = {};
let matched = 0, missed = 0;
const missedList = [];

for (const ex of exercises) {
  const items = ex.learning_aids?.items ?? {};
  const exPatch = {};
  for (const [pos, item] of Object.entries(items)) {
    if (item.evidence_translation || !item.evidence_text) continue;
    const ar = TRANSLATIONS[item.evidence_text];
    if (ar) {
      exPatch[pos] = { evidence_translation: ar };
      matched++;
    } else {
      missed++;
      missedList.push({ title: ex.title, pos, evidence_text: item.evidence_text });
    }
  }
  if (Object.keys(exPatch).length) patch[ex.id] = exPatch;
}

writeFileSync(new URL("./_t1_translations_patch.json", import.meta.url), JSON.stringify(patch), "utf8");
console.log(`matched: ${matched}, missed: ${missed}`);
if (missedList.length) console.log(JSON.stringify(missedList, null, 1));
