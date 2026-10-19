// usage (cwd = work dir): node t1-batch-persons.mjs — like t1-batch.mjs but for the "five short statements" files (t1-build-persons.mjs, a different voice per person). Shares batch-done.txt.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const T = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const LIST = ["teil1/computer.m4a", "teil1/arbeitsplatz-fuer-ihren-vater.m4a", "teil1/bus-zur-arbeit.m4a", "teil1/bus-zur-arbeit-2.m4a", "teil1/einzelkind.m4a", "teil1/handys.m4a", "teil1/radwege-original.m4a", "teil1/radwege-.m4a", "teil1/urlaub.m4a"];
const done = new Set(fs.existsSync("batch-done.txt") ? fs.readFileSync("batch-done.txt", "utf8").split("\n").filter(Boolean) : []);
const flagged = [];
for (const frag of LIST) {
  if (done.has(frag)) continue;
  console.log(`\n=== ${frag}  ${new Date().toISOString()}`);
  const r = spawnSync("node", [T + "t1-run.mjs", frag, "--persons", "--apply"], { encoding: "utf8", maxBuffer: 1 << 26 });
  console.log(r.stdout.trim()); if (r.stderr.trim()) console.log(r.stderr.trim().slice(-300));
  if (r.status === 0) fs.appendFileSync("batch-done.txt", frag + "\n");
  else if (r.status === 3) { console.log("STOP: Gemini TTS quota exhausted"); break; }
  else flagged.push(`${frag} (exit ${r.status})`);
}
console.log("\nBATCH END. flagged/failed:", flagged.join(" | ") || "none");
