// usage (cwd = work dir): node t1-batch.mjs [--live] [--apply]
//   --live   synthesize through the Gemini Live API (separate free quota bucket) instead of the TTS models
//   --apply  also switch each QA-clean exercise in the app (default: BUILD ONLY → batch-built.txt, apply later with `node t1-batch.mjs --apply`, which applies every built slug without re-synthesizing)
// B2 Teil 1 news-type files only (every "five persons" file is B1 = hidden from students; use t1-batch-persons.mjs for those). Resumes via batch-done.txt (applied) / batch-built.txt (built).
// Exit of t1-run: 0 ok, 2 QA flagged chunks (not applied), 3 quota exhausted (stop; re-run later), 1 error.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const T = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const flags = process.argv.slice(2), apply = flags.includes("--apply"), live = flags.includes("--live");
const LIST = [
  "teil1/europaeischen.m4a", "teil1/nichtsicher.m4a", "teil1/bayern-nordrhein-westfalen.m4a",
  "teil1/bei-den-europawahlen.m4a", "teil1/bei-der-sportveranstaltung.m4a", "teil1/bild-am-sonntag.m4a", "teil1/das-schladminger.m4a", "teil1/der-bau.m4a", "teil1/die-50-euro.m4a",
  "teil1/die-bundeslaender.m4a", "teil1/die-piloten-der-lufthansa.m4a", "teil1/die-stadt-friedrichsberg.m4a", "teil1/die-zahl-der-arbeitslosen.m4a", "teil1/frau-juergens.m4a",
  "teil1/in-den-alpen.m4a", "teil1/in-frankfurt-haben-manager.m4a", "teil1/insel-bali.m4a", "teil1/lufthansa-modified.m4a", "teil1/lufthansa.m4a", "teil1/voegel.m4a",
  "teil1/diefluggesellschaft.m4a", "teil1/die-konjunkturentwicklung-negativ.m4a", "teil1/fuer-die-polizei-in-berlin.m4a", "teil1/T1_Kunden_der_Fluggesellschaft_DL.m4a",
];
const read = (f) => new Set(fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean) : []);
const slugOf = (frag) => frag.split("/").pop().replace(/\.m4a$/, "").replace(/[^a-z0-9-]/gi, "_");
const flagged = [];
for (const frag of LIST) {
  const done = read("batch-done.txt"), built = read("batch-built.txt");
  if (done.has(frag)) continue;
  console.log(`\n=== ${frag}  ${new Date().toISOString()}`);
  if (apply && built.has(frag)) { // built earlier and QA-clean: just switch it in the app
    const r = spawnSync("node", [T + "t1-apply.mjs", slugOf(frag)], { encoding: "utf8" }); console.log(r.stdout.trim());
    if (r.status === 0) fs.appendFileSync("batch-done.txt", frag + "\n"); else flagged.push(`${frag} (apply exit ${r.status})`);
    continue;
  }
  if (built.has(frag) && !apply) continue;
  const r = spawnSync("node", [T + "t1-run.mjs", frag, ...(live ? ["--live"] : []), ...(apply ? ["--apply"] : [])], { encoding: "utf8", maxBuffer: 1 << 26 });
  console.log(r.stdout.trim()); if (r.stderr.trim()) console.log(r.stderr.trim().slice(-300));
  if (r.status === 0) fs.appendFileSync(apply ? "batch-done.txt" : "batch-built.txt", frag + "\n");
  else if (r.status === 3) { console.log("STOP: quota exhausted"); break; }
  else flagged.push(`${frag} (exit ${r.status})`);
}
console.log("\nBATCH END. flagged/failed:", flagged.join(" | ") || "none", "| built:", read("batch-built.txt").size, "| applied:", read("batch-done.txt").size);
