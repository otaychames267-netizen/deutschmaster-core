/** node scripts/schreiben-b1/patch-multi.mjs patches.json
 * Like patch.mjs but each entry names its task file: [{ "file": "anne.mjs", "find": "...", "replace": "..." }] (files live in tasks/). */
import { readFileSync } from "node:fs";
import { writeRetry } from "./fsretry.mjs";
const DIR = new URL("./tasks/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const patches = JSON.parse(readFileSync(process.argv[2], "utf8"));
const cache = new Map(); let ok = 0;
for (const { file, find, replace } of patches) {
  if (!cache.has(file)) cache.set(file, readFileSync(DIR + file, "utf8"));
  const s = cache.get(file);
  const n = s.split(find).length - 1;
  if (n !== 1) { console.log(`✗ ${file}: ${n}× "${find.slice(0, 70)}"`); continue; }
  cache.set(file, s.replace(find, () => replace)); ok++;
}
for (const [file, s] of cache) writeRetry(DIR + file, s);
console.log(`${ok}/${patches.length} patches applied`);
