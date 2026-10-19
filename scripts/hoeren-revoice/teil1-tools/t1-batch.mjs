// usage (cwd = work dir): node t1-batch.mjs   — runs t1-run.mjs --apply over the Teil 1 news-type files in priority order, skipping those listed in batch-done.txt.
// Stops when the Gemini TTS free quota is exhausted (exit 3 of t1-run) — run it again later; the per-chunk cache and batch-done.txt make it resume where it stopped.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const T = new URL(".", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
const LIST = [
  "teil1/europaeischen.m4a", "teil1/wetter.m4a", "teil1/bierkonsum.m4a",
  "teil1/dieWahlbeteiligung.m4a", "teil1/fremdsprache-original.m4a", "teil1/fremdsprache.m4a", "teil1/nichtsicher.m4a", "teil1/bayern-nordrhein-westfalen.m4a",
  "teil1/bei-den-europawahlen.m4a", "teil1/bei-der-sportveranstaltung.m4a", "teil1/bild-am-sonntag.m4a", "teil1/das-schladminger.m4a", "teil1/der-bau.m4a", "teil1/die-50-euro.m4a",
  "teil1/die-bundeslaender.m4a", "teil1/die-piloten-der-lufthansa.m4a", "teil1/die-stadt-friedrichsberg.m4a", "teil1/die-zahl-der-arbeitslosen.m4a", "teil1/frau-juergens.m4a",
  "teil1/in-den-alpen.m4a", "teil1/in-frankfurt-haben-manager.m4a", "teil1/insel-bali.m4a", "teil1/lufthansa-modified.m4a", "teil1/lufthansa.m4a", "teil1/voegel.m4a",
  "teil1/diefluggesellschaft.m4a", "teil1/die-konjunkturentwicklung-negativ.m4a", "teil1/fuer-die-polizei-in-berlin.m4a", "teil1/T1_Kunden_der_Fluggesellschaft_DL.m4a",
];
const done = new Set(fs.existsSync("batch-done.txt") ? fs.readFileSync("batch-done.txt", "utf8").split("\n").filter(Boolean) : []);
const flagged = [];
for (const frag of LIST) {
  if (done.has(frag)) continue;
  console.log(`\n=== ${frag}  ${new Date().toISOString()}`);
  const r = spawnSync("node", [T + "t1-run.mjs", frag, "--apply"], { encoding: "utf8", maxBuffer: 1 << 26 });
  console.log(r.stdout.trim()); if (r.stderr.trim()) console.log(r.stderr.trim().slice(-300));
  if (r.status === 0) fs.appendFileSync("batch-done.txt", frag + "\n");
  else if (r.status === 3) { console.log("STOP: Gemini TTS quota exhausted"); break; }
  else { flagged.push(`${frag} (exit ${r.status})`); }
}
console.log("\nBATCH END. flagged/failed:", flagged.join(" | ") || "none", "| done:", fs.readFileSync("batch-done.txt", "utf8").split("\n").filter(Boolean).length);
