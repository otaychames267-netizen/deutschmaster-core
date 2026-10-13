/** node scripts/schreiben-b1/patch.mjs tasks/<key>.mjs patches.json
 * Applies [{ "find": "...", "replace": "..." }] literally (each `find` must occur exactly once) — a safe way to lengthen / correct single
 * sentences in a task file without shell-quoting problems. */
import { readFileSync, writeFileSync } from "node:fs";
const [file, patchFile] = process.argv.slice(2);
let s = readFileSync(file, "utf8");
const patches = JSON.parse(readFileSync(patchFile, "utf8"));
let ok = 0;
for (const { find, replace } of patches) {
  const n = s.split(find).length - 1;
  if (n !== 1) { console.log(`✗ ${n}× "${find.slice(0, 70)}"`); continue; }
  s = s.replace(find, () => replace); ok++;
}
writeFileSync(file, s);
console.log(`${ok}/${patches.length} patches applied`);
