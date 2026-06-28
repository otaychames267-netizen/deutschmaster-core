import { readFileSync } from "fs";
import { resolveDuplicates, isComplete, type ExerciseLike } from "../src/lib/import/validate.js";

const c = JSON.parse(readFileSync("scripts/.extract-cache/t2_pdf1.exercises.json", "utf8"));
const ex: ExerciseLike[] = Object.keys(c).map(Number).sort((a, b) => a - b).map((idx) => ({
  idx, title: c[idx].title, article: c[idx].article,
  pages: (c[idx]._pages ?? []),
  questions: c[idx].questions ?? [], answerKey: c[idx].answer_key ?? [],
}));

const { drop, reasons } = resolveDuplicates(ex);
const dropSet = new Set(drop);
console.log("DROP decisions:");
for (const r of reasons) console.log("  - " + r);

// surviving version counts per base title
const base = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/\s+\d+$/, "");
const kept = ex.filter((e) => e.title && !dropSet.has(e.idx) && isComplete(e));
const counts = new Map<string, number>();
for (const e of kept) counts.set(base(e.title), (counts.get(base(e.title)) ?? 0) + 1);
console.log("\nSurviving COMPLETE version counts (multi-version titles):");
for (const [t, n] of [...counts.entries()].sort()) if (n > 1) console.log(`  ${n}×  ${t}`);
console.log(`\nTotal complete & kept: ${kept.length}   (dropped ${drop.length})`);
