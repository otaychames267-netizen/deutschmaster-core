import { readFileSync } from "fs";
import { checkCoherence } from "../src/lib/import/coherence.js";

const c = JSON.parse(readFileSync("scripts/.extract-cache/t2_pdf1.exercises.json", "utf8"));
let clean = 0, flagged = 0;
const flaggedIdx: number[] = [];
for (let i = 1; i <= 21; i++) {
  const e = c[i]; if (!e || !e.article) continue;
  const r = checkCoherence(e.article);
  if (r.ok) { clean++; console.log(`  ex ${i} OK (${r.score.toFixed(2)}) "${e.title}"`); }
  else { flagged++; flaggedIdx.push(i); console.log(`  ex ${i} FLAG "${e.title}": ${r.issues.join(", ")}`); }
}
console.log(`\nClean: ${clean}, Flagged for article re-extraction: ${flagged}`);
console.log(`Flagged indices: ${flaggedIdx.join(",")}`);
